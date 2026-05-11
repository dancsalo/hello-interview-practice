# Distributed Locks with ZooKeeper

## What This Demonstrates

- Implementing distributed locks with sequential ephemeral nodes
- FIFO lock acquisition ordering
- Explicit lock release and automatic cleanup on crash
- Hierarchical locks for fine-grained resource control
- Deadlock prevention through ephemeral nodes

## Why This Matters

Distributed locks enable:
- Mutual exclusion across distributed systems
- Rate limiting critical operations
- Preventing concurrent modifications
- Resource allocation and scheduling
- Distributed transactions

## How It Works

### Lock Algorithm

1. **Acquire Lock:**
   ```typescript
   const lockPath = await zk.create(
     '/locks/resource/lock-',
     data,
     CreateMode.EPHEMERAL_SEQUENTIAL
   );
   // Creates: /locks/resource/lock-0000000001
   ```

2. **Check Ownership:**
   ```typescript
   const children = await zk.getChildren('/locks/resource');
   const sorted = children.sort();
   const hasLock = lockPath.endsWith(sorted[0]);
   ```

3. **Wait for Lock (if not owner):**
   ```typescript
   const myIndex = sorted.indexOf(mySeq);
   const predecessor = sorted[myIndex - 1];
   await zk.exists(`/locks/resource/${predecessor}`, watchCallback);
   ```

4. **Release Lock:**
   ```typescript
   await zk.remove(lockPath);
   // Triggers watch on next waiter
   ```

### Why Sequential + Ephemeral?

**Sequential:**
- Provides FIFO ordering (fairness)
- No race conditions in lock acquisition
- Deterministic queue position

**Ephemeral:**
- Auto-cleanup if holder crashes
- Prevents deadlocks from unreleased locks
- No manual cleanup required

## Production Considerations

### ZooKeeper vs Redis Locks

**Use ZooKeeper locks when:**
- Critical operations requiring strong consistency (financial transactions)
- Long-lived locks (hours) where automatic failure detection matters
- Hierarchical locking with complex dependencies
- Already using ZooKeeper in stack

**Use Redis locks when:**
- High-frequency locking (hundreds/sec)
- Short-lived locks (seconds)
- Performance > strong consistency
- Simpler operational requirements

**Performance comparison:**
- ZooKeeper: ~1,000-5,000 lock operations/sec
- Redis: ~50,000-100,000 lock operations/sec

### Lock Timeout Strategies

**Option 1: Session timeout (ZooKeeper default)**
```typescript
// Lock auto-released after session timeout (10-30s)
// Good for: Crash recovery
// Bad for: Long-running operations
```

**Option 2: Manual timeout with heartbeat**
```typescript
class TimedLock {
  async acquireWithTimeout(timeout: number) {
    const acquired = await this.acquire();
    if (acquired) {
      this.startHeartbeat(timeout);
    }
  }
  
  private async startHeartbeat(timeout: number) {
    const interval = setInterval(async () => {
      if (this.shouldKeepLock) {
        await this.renewLock();
      } else {
        await this.release();
        clearInterval(interval);
      }
    }, timeout / 2);
  }
}
```

**Option 3: Fencing tokens**
```typescript
// Include sequence number with lock operations
const token = parseInt(lockPath.split('-').pop());
await database.executeWithToken(operation, token);
// Database rejects operations from lower tokens
```

### Deadlock Prevention

**ZooKeeper prevents deadlocks through:**
1. Ephemeral nodes (automatic release on crash)
2. FIFO ordering (no circular waiting)
3. Watch predecessor pattern (no busy waiting)

**Additional best practices:**
```typescript
// Always use try-finally for explicit release
const lock = new DistributedLock('my-lock', zk);
try {
  await lock.acquire();
  // Critical section
} finally {
  await lock.release();
}
```

### Hierarchical Locks

Lock different resources independently:

```
/locks/
  /users/
    /user-123/lock-0000000001
    /user-456/lock-0000000001
  /rooms/
    /room-789/lock-0000000001
```

Benefits:
- Fine-grained locking (lock user without locking all users)
- Reduced contention
- Better scalability

**Hierarchical lock ordering:**
```typescript
// Always acquire locks in same order to prevent deadlock
async acquireMultiple() {
  const locks = [userLock, roomLock, messageLock].sort();
  for (const lock of locks) {
    await lock.acquire();
  }
}
```

## When NOT to Use ZooKeeper Locks

### Don't use when:
- **High-frequency locking:** Use Redis or database transactions
- **Simple rate limiting:** Use Redis with sliding window
- **Short-lived locks (< 1s):** Network overhead too high
- **Single-node system:** Use local locks (Mutex, Semaphore)

### Alternatives:

**Redis locks (Redlock):**
```typescript
const lock = await redlock.lock('resource', 1000); // 1s TTL
try {
  // Critical section
} finally {
  await lock.unlock();
}
```

**Database advisory locks:**
```sql
-- Postgres
SELECT pg_advisory_lock(123);
-- Critical section
SELECT pg_advisory_unlock(123);
```

**etcd locks:**
```typescript
const lease = await etcd.lease.grant({ TTL: 10 });
await etcd.lock(lease).lock('resource');
// Critical section
await etcd.lock(lease).unlock('resource');
```

## Interview Tips

When discussing distributed locks:

1. **Explain the algorithm:**
   - Sequential + ephemeral pattern
   - Watch predecessor for FIFO
   - Shows understanding of internals

2. **Compare with Redis:**
   - ZooKeeper: Strong consistency, lower throughput
   - Redis: High performance, simpler ops
   - Know when to use each

3. **Mention Martin Kleppmann's concerns:**
   - Distributed locks can't guarantee correctness under all failure modes
   - Fencing tokens provide additional safety
   - Shows awareness of limitations

4. **Discuss deadlock prevention:**
   - Ephemeral nodes prevent stuck locks
   - FIFO ordering prevents circular waiting
   - Shows production awareness

## Common Interview Questions

**Q: How do ZooKeeper locks prevent deadlocks?**  
A: Ephemeral nodes auto-release locks when holder crashes. FIFO ordering (watch predecessor) prevents circular waiting. No busy polling reduces resource contention.

**Q: ZooKeeper vs Redis for distributed locks?**  
A: Redis: Higher throughput (50k+ ops/sec), simpler, good for short-lived locks. ZooKeeper: Strong consistency, FIFO guarantees, better for critical operations and long-lived locks. Choose based on: frequency (Redis for high), criticality (ZooKeeper for financial), and stack (use what you have).

**Q: What are fencing tokens and why do you need them?**  
A: Sequence numbers included with lock operations to prevent stale operations. If process holds lock, gets delayed, and lock expires, fencing token prevents it from executing stale operations after new lock holder begins. System rejects operations from lower token numbers.

**Q: Can distributed locks guarantee correctness?**  
A: No lock mechanism can guarantee correctness under all failure modes (GC pauses, clock skew, network partitions). Fencing tokens help but aren't foolproof. For critical operations, prefer consensus-based approaches (Paxos, Raft) or single-node coordination when possible.

**Q: How do you handle lock contention?**  
A: Monitor lock wait times. If high contention: (1) Reduce critical section size, (2) Use hierarchical locks for fine-grained locking, (3) Consider optimistic concurrency instead, (4) Partition work to reduce shared resources.

## Lock Patterns Comparison

| Pattern | Implementation | Use Case |
|---------|---------------|----------|
| **Simple lock** | Single ZNode | Mutual exclusion |
| **Hierarchical locks** | Path-based ZNodes | Fine-grained resource locking |
| **Read-write locks** | Two lock paths | Multiple readers, single writer |
| **Lease-based locks** | TTL + heartbeat | Long-running operations |
| **Fenced locks** | Sequence numbers | Critical operations needing safety |

## Further Reading

- [ZooKeeper Lock Recipe](https://zookeeper.apache.org/doc/r3.1.2/recipes.html#sc_recipes_Locks)
- [Martin Kleppmann on Distributed Locks](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
- [Redlock Algorithm (Redis)](https://redis.io/docs/reference/patterns/distributed-locks/)
- Original guide: `/key_technologies/zookeeper/original.md` - "Distributed Locks" section
