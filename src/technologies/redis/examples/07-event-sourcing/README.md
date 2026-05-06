# Redis Event Sourcing with Streams

## What

Demonstrates using Redis Streams for event sourcing - storing events as an immutable log and processing them with consumer groups.

## Why

Event sourcing provides:
- **Audit trail**: Complete history of what happened
- **Event replay**: Rebuild state from events
- **Temporal queries**: "What was the state at time X?"
- **Decoupling**: Producers and consumers are independent
- **Scalability**: Multiple consumers process in parallel

Use cases:
- Order processing
- User activity tracking
- Audit logs
- Change data capture (CDC)
- Real-time analytics

## How

The example demonstrates:
1. **XADD**: Append events to stream
2. **XRANGE**: Read event history
3. **XGROUP CREATE**: Create consumer group
4. **XREADGROUP**: Consume events with load balancing
5. **XACK**: Acknowledge processed events
6. **XPENDING**: Check unacknowledged messages
7. **XCLAIM**: Reclaim stale messages from failed workers
8. **XTRIM**: Remove old events

## Key Commands

- `XADD stream * field value [field value ...]` - Append event
- `XRANGE stream start end [COUNT count]` - Read range of events
- `XGROUP CREATE stream group id [MKSTREAM]` - Create consumer group
- `XREADGROUP GROUP group consumer STREAMS stream id` - Read as consumer
- `XACK stream group id [id ...]` - Acknowledge messages
- `XPENDING stream group [start end count]` - Check pending messages
- `XCLAIM stream group consumer min-idle-time id [id ...]` - Claim messages
- `XAUTOCLAIM stream group consumer min-idle-time start` - Auto-claim
- `XTRIM stream MAXLEN [~] count` - Trim old entries
- `XINFO STREAM stream` - Get stream information

## Try It

Run the example and observe:
1. Events appended to stream
2. Complete event history retrieval
3. Consumer group creation
4. Parallel processing by multiple workers
5. Message acknowledgment
6. Pending message detection
7. Reclaiming stale messages
8. Stream trimming

## Production Considerations

### Stream IDs

Format: `<millisecondsTime>-<sequenceNumber>`

Examples:
- `1620000000000-0` - First message at timestamp
- `1620000000000-1` - Second message at same timestamp
- `*` - Auto-generate (recommended)

**Use cases**:
```typescript
// Auto-generate (most common)
await redis.xAdd('stream', '*', { event: 'OrderCreated' });

// Specific timestamp (for backfilling)
await redis.xAdd('stream', '1620000000000-0', { event: 'OrderCreated' });

// Time-based queries
await redis.xRange('stream', '1620000000000', '1620003600000');
```

### Consumer Groups

**How they work**:
1. Group tracks last delivered ID
2. Each message delivered to exactly one consumer in group
3. Consumer acknowledges with XACK
4. Unacked messages tracked in pending list

**Example**:
```typescript
// Create group
await redis.xGroupCreate('orders', 'processors', '0');

// Worker 1 reads
const msgs1 = await redis.xReadGroup('processors', 'worker-1', {
  key: 'orders',
  id: '>'
});

// Worker 2 reads (gets different messages)
const msgs2 = await redis.xReadGroup('processors', 'worker-2', {
  key: 'orders',
  id: '>'
});
```

### At-Least-Once Delivery

Messages can be delivered multiple times:

**Scenario**:
1. Worker receives message
2. Worker processes message
3. Worker crashes before XACK
4. Message redelivered to another worker

**Solution**: Idempotent processing
```typescript
async function processEvent(event) {
  const processedKey = `processed:${event.id}`;

  // Check if already processed
  const exists = await redis.exists(processedKey);
  if (exists) {
    logger.info('Event already processed, skipping');
    return;
  }

  // Process event
  await doWork(event);

  // Mark as processed
  await redis.set(processedKey, '1', { EX: 86400 }); // 24h TTL
}
```

### Handling Failed Messages

**XPENDING** shows unacknowledged messages:
```typescript
const pending = await redis.xPending('orders', 'processors', '-', '+', 10);

for (const msg of pending) {
  if (msg.millisecondsSinceLastDelivery > 300000) { // 5 minutes
    logger.warn(`Message ${msg.messageId} stuck for ${msg.deliveryCount} attempts`);

    if (msg.deliveryCount > 3) {
      // Move to dead letter queue
      await redis.xAdd('orders:dlq', '*', msg);
      await redis.xAck('orders', 'processors', msg.messageId);
    } else {
      // Retry
      await redis.xClaim('orders', 'processors', 'worker-retry', 0, [msg.messageId]);
    }
  }
}
```

**XAUTOCLAIM** (Redis 6.2+) automates this:
```typescript
const claimed = await redis.xAutoClaim(
  'orders',
  'processors',
  'worker-1',
  300000, // min idle time (5 min)
  '0-0',  // start ID
  { COUNT: 10 }
);

for (const msg of claimed.messages) {
  await processEvent(msg);
  await redis.xAck('orders', 'processors', msg.id);
}
```

### Stream Trimming

**Without trimming**, streams grow forever:

```typescript
// Bad: unbounded growth
for (let i = 0; i < 1000000; i++) {
  await redis.xAdd('events', '*', { data: i });
}
// Result: High memory usage, slow queries
```

**Solutions**:

**1. MAXLEN** (exact):
```typescript
// Keep exactly 1000 entries
await redis.xAdd('events', '*', { data: '...' }, { TRIM: { strategy: 'MAXLEN', threshold: 1000 } });
```

**2. MAXLEN ~** (approximate, more efficient):
```typescript
// Keep ~1000 entries (within 5-10%)
await redis.xAdd('events', '*', { data: '...' }, { TRIM: { strategy: 'MAXLEN', threshold: 1000, strategyModifier: '~' } });
```

**3. MINID** (by timestamp):
```typescript
const oneDayAgo = Date.now() - 86400000;
await redis.xTrim('events', 'MINID', `${oneDayAgo}-0`);
```

**4. Background job**:
```typescript
setInterval(async () => {
  const trimmed = await redis.xTrim('events', 'MAXLEN', '~', 10000);
  logger.info(`Trimmed ${trimmed} old events`);
}, 3600000); // hourly
```

### Memory Management

Memory per message: ~100-500 bytes depending on payload

```
Stream metadata: 50 bytes
Message ID: 16 bytes
Field names: 10-50 bytes per field
Field values: depends on data
Consumer group overhead: 50 bytes per pending message
```

**Example**:
- 1 million messages
- Average 200 bytes each
- = 200 MB

**Best practices**:
- Trim aggressively (keep only recent events)
- Use separate streams for different retention needs
- Archive to S3/database for long-term storage

### Scaling Patterns

**Single Stream**:
- Good for: < 100k messages/sec
- Simple, ordered processing
- Single partition (bottleneck)

**Sharded Streams**:
```typescript
// Shard by key (e.g., user ID)
const shard = hashCode(userId) % 10;
await redis.xAdd(`orders:shard:${shard}`, '*', event);

// Consumers process specific shards
for (let shard = 0; shard < 10; shard++) {
  spawnWorker(`orders:shard:${shard}`);
}
```

**When to use Kafka instead**:
- > 100k messages/sec
- Need multi-partition scaling
- Require long retention (weeks/months)
- Complex routing (topics, filters)
- Strong ordering guarantees
- Ecosystem integrations (Kafka Connect, etc.)

### Redis Streams vs Kafka

| Feature | Redis Streams | Kafka |
|---------|--------------|-------|
| Throughput | < 100k msg/s | > 1M msg/s |
| Partitioning | Manual sharding | Built-in |
| Retention | Trim required | Configurable |
| Ordering | Per stream | Per partition |
| Latency | < 1ms | 2-10ms |
| Durability | AOF/RDB | Replication + log |
| Ops Complexity | Low | High |
| Best for | Simple event streams | Large-scale event pipelines |

### Monitoring

**Metrics to track**:
```typescript
// Stream length
const info = await redis.xInfoStream('orders');
logger.metric('stream.length', info.length);

// Consumer lag
const groups = await redis.xInfoGroups('orders');
for (const group of groups) {
  const pending = group.pending;
  const lag = group.lag; // Redis 7.0+
  logger.metric(`stream.${group.name}.pending`, pending);
  logger.metric(`stream.${group.name}.lag`, lag);
}

// Processing rate
const start = Date.now();
const processed = await processMessages();
const duration = Date.now() - start;
logger.metric('stream.processing.rate', processed / (duration / 1000));
```

**Alerts**:
- Stream length > threshold (trim failing?)
- Consumer lag increasing (slow processing?)
- High pending count (workers crashing?)
- No activity for X minutes (stream dead?)

### Event Versioning

Events evolve over time:

```typescript
// V1
await redis.xAdd('orders', '*', {
  version: '1',
  type: 'OrderCreated',
  orderId: 'ORD-001',
  amount: '99.99',
});

// V2 (add new field)
await redis.xAdd('orders', '*', {
  version: '2',
  type: 'OrderCreated',
  orderId: 'ORD-002',
  amount: '149.99',
  currency: 'USD', // new field
});

// Consumer handles both versions
async function processOrderCreated(event) {
  const version = parseInt(event.version);

  if (version === 1) {
    // Default currency for old events
    event.currency = 'USD';
  }

  await createOrder(event);
}
```

### Testing

```typescript
describe('Event Sourcing', () => {
  it('appends events to stream', async () => {
    const id = await redis.xAdd('test:stream', '*', { event: 'test' });
    expect(id).toMatch(/\d+-\d+/);

    const messages = await redis.xRange('test:stream', '-', '+');
    expect(messages).toHaveLength(1);
    expect(messages[0].message.event).toBe('test');
  });

  it('delivers messages to consumer group', async () => {
    await redis.xGroupCreate('test:stream', 'test:group', '0');
    await redis.xAdd('test:stream', '*', { data: 'hello' });

    const messages = await redis.xReadGroup('test:group', 'consumer1', {
      key: 'test:stream',
      id: '>',
    });

    expect(messages[0].messages).toHaveLength(1);
    expect(messages[0].messages[0].message.data).toBe('hello');
  });

  it('tracks pending messages', async () => {
    await redis.xAdd('test:stream', '*', { data: 'test' });
    await redis.xReadGroup('test:group', 'consumer1', {
      key: 'test:stream',
      id: '>',
    });

    const pending = await redis.xPending('test:stream', 'test:group');
    expect(pending.pending).toBe(1);
  });

  it('allows message claiming', async () => {
    const messages = await redis.xReadGroup('test:group', 'consumer1', {
      key: 'test:stream',
      id: '>',
    });

    const claimed = await redis.xClaim(
      'test:stream',
      'test:group',
      'consumer2',
      0,
      [messages[0].messages[0].id]
    );

    expect(claimed).toHaveLength(1);
  });
});
```

## Further Reading

- [Redis Streams Introduction](https://redis.io/docs/data-types/streams/)
- [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Kafka vs Redis Streams](https://redis.com/blog/redis-streams-vs-kafka/)
- [Consumer Groups Tutorial](https://redis.io/docs/data-types/streams-tutorial/)
