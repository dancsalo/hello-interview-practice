# Leader Election with ZooKeeper

## What This Demonstrates

- Leader election with sequential ephemeral nodes
- Deterministic leader selection (lowest sequence)
- Watching predecessor to avoid thundering herd
- Automatic failover when leader crashes
- Chain of command for successive failures

## Why This Matters

Leader election enables:
- Coordination of distributed tasks (only one executor)
- Primary/secondary patterns (active/passive)
- Singleton services in distributed systems
- Preventing duplicate work

## How It Works

### Election Algorithm

1. **Join Election:**
   ```typescript
   const myPath = await zk.create(
     '/election/node-',
     data,
     CreateMode.EPHEMERAL_SEQUENTIAL
   );
   // Creates: /election/node-0000000001
   ```

2. **Check Leadership:**
   ```typescript
   const children = await zk.getChildren('/election');
   const sorted = children.sort();
   const isLeader = myPath.endsWith(sorted[0]);
   ```

3. **Watch Predecessor (if not leader):**
   ```typescript
   const myIndex = sorted.indexOf(mySeq);
   const predecessor = sorted[myIndex - 1];
   await zk.exists(`/election/${predecessor}`, watchCallback);
   ```

4. **Failover:**
   - Leader crashes → ephemeral node deleted
   - Predecessor watcher notified
   - Watcher rechecks leadership
   - If now lowest sequence → becomes leader

### Why Watch Predecessor?

**Bad approach (thundering herd):**
```typescript
// All followers watch the leader
for (const follower of followers) {
  follower.watch(leader);
}
// Leader fails → ALL followers wake up and compete
```

**Good approach (predecessor watching):**
```typescript
// Each follower watches the node ahead of it
node2.watch(node1);  // Leader
node3.watch(node2);
node4.watch(node3);
// Leader fails → Only node2 wakes up and becomes leader
```

Benefits:
- Only one watch fires per failure (not N watches)
- Deterministic succession (no race conditions)
- Scales to many participants

## Production Considerations

### Session Timeout and Failover Time

**Failover latency = session timeout + detection time**
- 10s timeout = ~10-15s failover
- 30s timeout = ~30-35s failover

**Trade-off:**
- Shorter timeout: Faster failover, more false positives
- Longer timeout: Fewer false positives, slower failover

### Leader Responsibilities

**What leaders should do:**
- Process jobs/tasks exclusively
- Make decisions (not just coordinate)
- Write results back to shared state

**What leaders should NOT do:**
- Become bottleneck (delegate work when possible)
- Hold locks indefinitely
- Skip health checks (could cause split-brain)

### Split-Brain Prevention

**Problem:** Network partition → two nodes think they're leader

**ZooKeeper prevention:**
- Quorum-based: Need majority of ZooKeeper ensemble
- If partition → only side with quorum can update
- Other side's sessions expire

### Fencing Tokens

For critical operations, use fencing:

```typescript
// Leader gets its sequence number as fencing token
const token = parseInt(myPath.split('-').pop());

// Include token in all operations
await database.executeWithToken(operation, token);

// Database rejects operations from lower tokens
if (newToken <= currentToken) {
  throw new Error('Stale leader');
}
```

### Leader Abdication

Sometimes leader should voluntarily step down:

```typescript
class Leader {
  async abdicate() {
    await zk.remove(this.myPath);
    // Triggers failover to next node
  }
}

// Use cases:
// - Graceful shutdown
// - Detected lag/overload
// - Manual failover (deployment)
```

## When NOT to Use Leader Election

### Don't use when:
- **Work is partitionable:** Use consistent hashing instead
- **Coordination not needed:** Just run on all nodes
- **Leader becomes bottleneck:** Consider leaderless designs
- **Frequent elections:** Too much churn, consider longer sessions

### Alternatives:

**Raft/Paxos libraries:**
- Directly embedded (no external ZooKeeper)
- Examples: etcd, Consul

**Database leader election:**
```sql
-- Postgres advisory locks
SELECT pg_try_advisory_lock(1);
```

**Redis leader election:**
```typescript
const acquired = await redis.set('leader', myId, 'NX', 'EX', 10);
if (acquired) {
  // I'm leader, renew every 5s
}
```

## Interview Tips

When discussing leader election:

1. **Explain sequential + ephemeral pattern:**
   - Sequential: Deterministic ordering
   - Ephemeral: Automatic cleanup

2. **Mention thundering herd problem:**
   - Watch predecessor, not leader
   - Shows depth of understanding

3. **Discuss split-brain prevention:**
   - ZooKeeper quorum prevents it
   - Fencing tokens add extra safety

4. **Know when NOT to use:**
   - Leader bottleneck? Partition work instead
   - Shows architectural judgment

## Common Interview Questions

**Q: How does ZooKeeper prevent split-brain?**  
A: Quorum-based consensus. To update state (including leader election), need majority of ZooKeeper ensemble. During network partition, only side with quorum can proceed. Other side's sessions expire.

**Q: What's the thundering herd problem in leader election?**  
A: If all followers watch the leader, they all wake up when leader fails and compete to become leader. Instead, each node watches only its predecessor - when leader fails, only immediate successor is notified and becomes leader.

**Q: How fast is failover?**  
A: Approximately equal to ZooKeeper session timeout (typically 10-30s). Shorter timeout = faster failover but more false positives on network blips.

**Q: When would you use database-based leader election instead?**  
A: For simpler setups or when database already provides primitives (Postgres advisory locks, MySQL GET_LOCK). ZooKeeper better for: (1) already in stack, (2) need coordination beyond just leader election, (3) distributed across datacenters.

**Q: What are fencing tokens?**  
A: Sequence numbers used to prevent stale leader operations. Leader includes its sequence number with operations. System rejects operations from lower sequence numbers, preventing old leader from causing corruption after failover.

## Use Cases

| Use Case | Why Leader Election Needed |
|----------|---------------------------|
| **Distributed task scheduler** | Only one node should schedule each task |
| **Primary/secondary database** | Only primary accepts writes |
| **Singleton service** | Only one instance performs work |
| **Controller in distributed system** | One node coordinates others (HBase HMaster, Kafka controller) |
| **Cron-like job** | Job should run once across cluster |

## Further Reading

- [ZooKeeper Leader Election](https://zookeeper.apache.org/doc/r3.1.2/recipes.html#sc_leaderElection)
- [Avoiding the Thundering Herd](https://curator.apache.org/curator-recipes/leader-election.html)
- [Fencing and Distributed Locks](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- Original guide: `/key_technologies/zookeeper/original.md` - "Leader Election" section
