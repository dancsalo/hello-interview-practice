# ZooKeeper Watches: Change Notifications

## What This Demonstrates

- Data watches (fire on setData)
- Child watches (fire on child add/remove)
- Existence watches (fire on node create/delete)
- One-time trigger behavior and re-registration
- Local cache + watch pattern

## Why This Matters

Watches are what make ZooKeeper efficient for coordination. Without watches, clients would need to poll constantly. With watches, ZooKeeper pushes notifications only when changes occur.

## How It Works

### Watch Types

**Data Watch:**
- Set via: `getData(path, watch=true)`
- Fires on: `setData`, node deletion
- Use case: Configuration changes

**Child Watch:**
- Set via: `getChildren(path, watch=true)`
- Fires on: Child added or removed
- Does NOT fire on: Child data changes
- Use case: Service discovery

**Existence Watch:**
- Set via: `exists(path, watch=true)`
- Fires on: Node creation or deletion
- Use case: Waiting for resource to appear

### One-Time Trigger

Watches fire **once** and must be re-registered:

```
1. Register watch on /config
2. /config changes → watch fires
3. /config changes again → watch does NOT fire
4. Must re-register watch to get next notification
```

### Local Cache Pattern

```typescript
// Fetch once, cache locally, invalidate on change
const cache = new Map();

async function getCached(path: string) {
  if (cache.has(path)) return cache.get(path);
  
  const data = await zk.getData(path);
  cache.set(path, data);
  
  // Set watch for invalidation
  zk.getData(path, (event) => {
    cache.delete(path);
  });
  
  return data;
}
```

## Production Considerations

### Watch Scalability

**Hot nodes:** If 10,000 clients watch the same node, all 10,000 get notified simultaneously when it changes. This can overwhelm servers.

**Mitigation:**
- Use hierarchical paths to distribute watches
- Consider pub/sub (Kafka) for broadcast scenarios
- Rate limit watch re-registration

### One-Time Trigger Implications

**Pattern to avoid:**
```typescript
// BAD: Might miss changes
zk.getData(path, (event) => {
  // Process change
  // But if another change happens before re-registering, we miss it!
});
```

**Better pattern:**
```typescript
// GOOD: Re-register immediately
function watchWithReRegistration(path: string) {
  zk.getData(path, (event) => {
    processChange(event);
    watchWithReRegistration(path); // Re-register immediately
  });
}
```

### Watch Guarantees

- Watches are **ordered**: You see changes in the order they occurred
- Watches fire **before** subsequent reads see the change
- Watch events delivered to client before new data becomes visible

### Network Partitions

If client disconnects and reconnects:
- Watches survive if session survives
- Watches lost if session expires
- Client should re-register watches on reconnection

## When NOT to Use Watches

- **High-frequency updates:** Watches re-register overhead adds up
- **Broadcast to millions:** Use Kafka or SNS instead
- **Complex filtering:** Watches don't support filters, all clients notified

## Alternatives

- **Kafka:** For high-throughput event streams with filtering
- **Redis Pub/Sub:** For ephemeral real-time messaging
- **WebSockets:** For direct client-server push

## Interview Tips

When discussing watches:

1. Mention **one-time trigger** limitation upfront
2. Explain **local cache + watch** pattern (shows understanding)
3. Discuss **hot node problem** (shows production awareness)
4. Know when Kafka is better (high-volume broadcasts)

## Common Interview Questions

**Q: How do watches improve over polling?**  
A: Watches push notifications only on changes, eliminating constant polling overhead. Client maintains local cache, only queries ZooKeeper when watch fires.

**Q: What happens if 10,000 clients watch the same config node?**  
A: Hot node problem - all 10,000 notified simultaneously on change, potentially overwhelming servers. Mitigate with hierarchical paths or use pub/sub system like Kafka.

**Q: Why are watches one-time triggers?**  
A: Keeps ZooKeeper simple and prevents state accumulation on server. Client must explicitly re-register, ensuring active interest in node.

## Further Reading

- [ZooKeeper Watches](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#ch_zkWatches)
- [Watch Semantics](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#sc_WatchSemantics)
- Original guide: `/key_technologies/zookeeper/original.md` - "Watches" section
