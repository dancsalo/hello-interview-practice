# Redis Pub/Sub

## What

Demonstrates Redis publish/subscribe messaging for real-time communication between services and clients.

## Why

Pub/Sub enables:
- Real-time notifications (chat, alerts)
- Broadcasting to multiple subscribers
- Decoupled communication (publishers don't know subscribers)
- Event-driven architecture
- Live updates (dashboards, feeds)

## How

The example demonstrates:
1. **SUBSCRIBE**: Listen to specific channels
2. **PSUBSCRIBE**: Pattern matching (e.g., `user:*`)
3. **PUBLISH**: Send messages to channels
4. **SPUBLISH/SSUBSCRIBE**: Sharded pub/sub (Redis 7.0+)
5. **PUBSUB CHANNELS**: List active channels
6. **PUBSUB NUMSUB**: Count subscribers
7. **UNSUBSCRIBE**: Stop listening

## Key Commands

- `SUBSCRIBE channel [channel ...]` - Subscribe to channels
- `PSUBSCRIBE pattern [pattern ...]` - Subscribe with pattern matching
- `PUBLISH channel message` - Send message (returns subscriber count)
- `UNSUBSCRIBE [channel ...]` - Unsubscribe from channels
- `PUNSUBSCRIBE [pattern ...]` - Unsubscribe from patterns
- `SSUBSCRIBE channel [channel ...]` - Sharded subscribe (Redis 7.0+)
- `SPUBLISH channel message` - Sharded publish (Redis 7.0+)
- `PUBSUB CHANNELS [pattern]` - List active channels
- `PUBSUB NUMSUB [channel ...]` - Count subscribers per channel
- `PUBSUB NUMPAT` - Count pattern subscriptions

## Try It

Run the example and observe:
1. Two subscribers listening to channels
2. Messages published and delivered
3. Pattern matching (`user:*` receives all user notifications)
4. Subscriber counts
5. Sharded pub/sub (if Redis 7.0+)

## Production Considerations

### At-Most-Once Delivery

**Critical limitation**: Messages are **lost** if:
- No subscribers listening
- Subscriber disconnected
- Subscriber crashes
- Network partition

**Example**:
```typescript
// Publisher sends message
await redis.publish('notifications', 'Important alert!');
// Returns 0 if no subscribers - message is LOST

// Subscriber offline
// Message never received, never retried
```

**Solution**: Use Redis Streams for guaranteed delivery
```typescript
// Persistent event
await redis.xAdd('notifications', '*', { message: 'Important alert!' });

// Consumers can catch up
const messages = await redis.xReadGroup(group, consumer, {
  key: 'notifications',
  id: '>',
});
```

### No Persistence

Published messages are **not stored**:
```typescript
// This message only exists in memory for instant delivery
await redis.publish('chat', 'Hello!');

// After delivery, it's gone
// New subscribers won't see past messages
```

**When this is fine**:
- Live chat (history stored elsewhere)
- Real-time metrics (only current value matters)
- Cache invalidation (one-time signal)

**When this is bad**:
- Job queues (tasks must not be lost)
- Audit logs (must capture everything)
- Email notifications (must deliver)

### Connection Management

Subscribers must maintain connection:

```typescript
// Bad: One client for everything
const client = createClient();
await client.subscribe('chat', msg => console.log(msg));
await client.set('key', 'value'); // ERROR: Can't use other commands while subscribed

// Good: Separate clients
const publisher = createClient();
const subscriber = createClient();

await subscriber.subscribe('chat', msg => console.log(msg));
await publisher.set('key', 'value'); // Works fine
```

**Why?** SUBSCRIBE is a blocking operation - the connection enters "subscriber mode" and can't execute other commands.

### Pattern Matching Performance

**Pattern subscriptions have cost**:

```typescript
// Fast: Exact match
await redis.pSubscribe('user:1001', handler); // O(1) lookup

// Slower: Pattern match
await redis.pSubscribe('user:*', handler); // O(N) pattern matching

// Very slow: Multiple patterns
await redis.pSubscribe('user:*', handler1);
await redis.pSubscribe('order:*', handler2);
await redis.pSubscribe('chat:*', handler3);
// Every PUBLISH checks all patterns
```

**Best practice**:
- Use exact channels when possible
- Minimize number of pattern subscriptions
- Design channel hierarchies carefully

### Slow Subscriber Problem

**Issue**: One slow subscriber can cause problems

```typescript
// Fast subscriber
subscriber1.subscribe('events', async msg => {
  await process(msg); // 1ms
});

// Slow subscriber
subscriber2.subscribe('events', async msg => {
  await slowProcess(msg); // 1000ms
});

// Publisher
await redis.publish('events', 'data'); // Blocks until all subscribers receive?
```

**Reality**: 
- `PUBLISH` is non-blocking (returns immediately)
- Redis buffers messages in subscriber's output buffer
- If buffer fills (slow consumer), Redis disconnects subscriber

**Solution**: Keep subscribers fast
```typescript
// Good: Queue for async processing
subscriber.subscribe('events', msg => {
  queue.add(msg); // Fast, non-blocking
});

// Bad: Slow synchronous processing
subscriber.subscribe('events', async msg => {
  await saveToDatabase(msg); // Slow
  await sendEmail(msg); // Very slow
});
```

### Sharded Pub/Sub (Redis 7.0+)

**Traditional Pub/Sub in Cluster**:
```typescript
// Message published to any node
await redis1.publish('chat', 'Hello');

// Subscriber on any node receives it
// But: Message must be broadcast to ALL cluster nodes (expensive)
```

**Sharded Pub/Sub**:
```typescript
// Message stays on shard where channel hashes
await redis.sPublish('chat:room:1', 'Hello');

// Only subscribers on same shard receive it
// Better performance, lower latency
```

**Trade-offs**:
| Feature | PUBLISH/SUBSCRIBE | SPUBLISH/SSUBSCRIBE |
|---------|------------------|---------------------|
| Cluster scaling | Poor (broadcast) | Good (sharded) |
| Pattern matching | Yes | No |
| Redis version | Any | 7.0+ |
| Best for | Small clusters | Large clusters |

### Use Cases: When to Use Pub/Sub

**Good Uses** (fire-and-forget, best-effort):

**1. Cache Invalidation**:
```typescript
// Service A updates data
await db.updateUser(userId);
await redis.del(`cache:user:${userId}`);
await redis.publish('cache:invalidate', `user:${userId}`);

// Service B subscribes
subscriber.subscribe('cache:invalidate', async key => {
  await localCache.delete(key);
});
```

**2. Real-Time Notifications**:
```typescript
// User comes online
await redis.publish(`presence:${userId}`, 'online');

// Friends' apps update UI
subscriber.pSubscribe('presence:*', (message, channel) => {
  const userId = channel.split(':')[1];
  ui.updatePresence(userId, message);
});
```

**3. Live Dashboards**:
```typescript
// Metrics producer
setInterval(async () => {
  const metrics = await collectMetrics();
  await redis.publish('metrics:realtime', JSON.stringify(metrics));
}, 1000);

// Dashboard subscriber
subscriber.subscribe('metrics:realtime', data => {
  chart.update(JSON.parse(data));
});
```

**4. Broadcasting to Online Users**:
```typescript
// Admin sends announcement
await redis.publish('announcements', 'System maintenance in 10 minutes');

// All connected clients receive
subscriber.subscribe('announcements', msg => {
  showNotification(msg);
});
```

### Use Cases: When NOT to Use Pub/Sub

**Bad Uses** (need guarantees):

**1. Job Queues** - Use Streams or Bull:
```typescript
// Bad: Jobs lost if no workers online
await redis.publish('jobs', JSON.stringify(job));

// Good: Jobs persisted until processed
await redis.xAdd('jobs', '*', job);
await redis.xReadGroup(group, consumer, { key: 'jobs', id: '>' });
```

**2. Financial Transactions** - Use database or message queue:
```typescript
// Bad: Payment event might be lost
await redis.publish('payments', JSON.stringify(payment));

// Good: Persist first, then notify
await db.insertPayment(payment);
await redis.xAdd('payments', '*', payment);
```

**3. Audit Logs** - Use Streams or persistent storage:
```typescript
// Bad: Logs might be lost
await redis.publish('audit', JSON.stringify(action));

// Good: Store permanently
await db.insertAuditLog(action);
```

**4. Task Distribution** - Use message queue:
```typescript
// Bad: No acknowledgment, can't retry
await redis.publish('tasks', JSON.stringify(task));

// Good: With acknowledgment
await queue.add(task);
await queue.process(async job => {
  await handleTask(job.data);
  await job.ack();
});
```

### Anti-Pattern: Rolling Your Own

**Don't build a message queue on top of Pub/Sub**:

```typescript
// Anti-pattern: Trying to add guarantees
const messages = new Map();

publisher.subscribe('ack', msgId => {
  messages.delete(msgId); // Mark as received
});

async function publishWithRetry(channel, data) {
  const msgId = uuidv4();
  messages.set(msgId, data);
  
  await redis.publish(channel, JSON.stringify({ id: msgId, data }));
  
  // Wait for ack
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  if (messages.has(msgId)) {
    // Retry
    await publishWithRetry(channel, data);
  }
}
```

**Why this is bad**:
- Complex, error-prone
- Doesn't handle subscriber failures
- Race conditions
- Reinventing the wheel

**Better alternatives**:
- **Redis Streams** (built-in persistence, acks, consumer groups)
- **RabbitMQ** (mature, feature-rich)
- **Kafka** (high throughput, partitioning)
- **AWS SQS** (managed, scalable)

### Monitoring

**Metrics to track**:
```typescript
// Active subscribers per channel
const numsub = await redis.pubSubNumSub(['chat', 'notifications']);
logger.metric('pubsub.subscribers', numsub);

// Pattern subscriptions
const numpat = await redis.pubSubNumPat();
logger.metric('pubsub.patterns', numpat);

// Message rate
let publishCount = 0;
setInterval(() => {
  logger.metric('pubsub.publish_rate', publishCount);
  publishCount = 0;
}, 60000);

// Check for stuck subscribers
const clients = await redis.clientList();
const subscribers = clients.filter(c => c.flags.includes('P'));
for (const sub of subscribers) {
  if (sub.obl > 1000000) { // Output buffer > 1MB
    logger.warn('Slow subscriber detected', sub);
  }
}
```

**Alerts**:
- No subscribers for critical channels
- High output buffer size (slow subscribers)
- Pattern subscription count growing
- Subscriber disconnections spiking

### Testing

```typescript
describe('Pub/Sub', () => {
  it('delivers messages to subscribers', async () => {
    const subscriber = redis.duplicate();
    await subscriber.connect();

    const received: string[] = [];
    await subscriber.subscribe('test', msg => {
      received.push(msg);
    });

    await redis.publish('test', 'message1');
    await redis.publish('test', 'message2');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(received).toEqual(['message1', 'message2']);

    await subscriber.quit();
  });

  it('pattern matching works', async () => {
    const subscriber = redis.duplicate();
    await subscriber.connect();

    const received: string[] = [];
    await subscriber.pSubscribe('user:*', (msg, channel) => {
      received.push(`${channel}:${msg}`);
    });

    await redis.publish('user:1', 'msg1');
    await redis.publish('user:2', 'msg2');
    await redis.publish('other', 'msg3');

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(received).toContain('user:1:msg1');
    expect(received).toContain('user:2:msg2');
    expect(received).not.toContain('other:msg3');

    await subscriber.quit();
  });

  it('returns subscriber count', async () => {
    const subscriber = redis.duplicate();
    await subscriber.connect();
    await subscriber.subscribe('test', () => {});

    const count = await redis.publish('test', 'msg');
    expect(count).toBe(1);

    await subscriber.quit();
  });
});
```

## Further Reading

- [Redis Pub/Sub Documentation](https://redis.io/docs/manual/pubsub/)
- [Pub/Sub vs Streams](https://redis.com/blog/pubsub-vs-streams/)
- [Sharded Pub/Sub](https://redis.io/docs/manual/pubsub/#sharded-pubsub)
- [Message Queue Comparison](https://jack-vanlightly.com/blog/2017/12/4/rabbitmq-vs-kafka-part-1-messaging-topologies)
