# Redis Distributed Lock

## What

Demonstrates using Redis to implement a distributed lock for coordinating access to shared resources across multiple processes or servers.

## Why

In distributed systems, multiple servers may try to modify the same resource simultaneously (e.g., booking the last ticket). Distributed locks ensure only one process can perform the operation at a time, preventing race conditions and data corruption.

## How

The example uses concert ticket booking:
1. **Acquire lock**: `INCR` returns 1 if we're first (lock acquired)
2. **Set TTL**: Prevent deadlock if process crashes
3. **Critical section**: Book ticket (decrement counter)
4. **Release lock**: `DEL` the lock key
5. **Retry logic**: Exponential backoff if lock is held

## Key Commands

- `INCR` - Atomic increment, returns 1 if key didn't exist (lock acquired)
- `EXPIRE` - Set TTL to prevent deadlock
- `DEL` - Release lock
- `GET` - Check resource state in critical section

## Try It

Run the example and observe:
1. Lock acquisition with `INCR`
2. TTL setting for safety
3. Critical section execution
4. Lock release
5. Retry logic with backoff

Try running two instances simultaneously to see lock contention.

## Production Considerations

### Simple INCR Lock (Shown Here)
**Pros**:
- Simple to implement
- Works for single Redis instance
- Good enough for many use cases

**Cons**:
- Not safe across Redis cluster nodes
- No protection if lock holder crashes before TTL expires
- Clock drift can cause issues

### Redlock Algorithm
For critical use cases, use Redlock:
```typescript
// Pseudo-code for Redlock
const lockAcquired = await acquireLockOnMajority([redis1, redis2, redis3]);
if (lockAcquired) {
  // Critical section
  await releaseLockOnAll([redis1, redis2, redis3]);
}
```

**How it works**:
1. Get current timestamp
2. Try to acquire lock on N/2 + 1 Redis nodes
3. Check total time taken < TTL
4. If successful, perform operation
5. Release lock on all nodes

### Fencing Tokens
Prevent issues from delayed operations:
```typescript
const token = await client.incr('lock:fencing_token');
// Pass token to service, which checks: is this the latest token?
// If not, reject the operation (stale lock holder)
```

### When Not to Use Distributed Locks

**Use your database instead if**:
- You're already using a database with ACID transactions
- The resource is stored in that database
- Database locks are simpler and more reliable

**Example with PostgreSQL**:
```sql
BEGIN;
SELECT * FROM tickets WHERE id = 1001 FOR UPDATE;
-- This row is now locked, no distributed lock needed
UPDATE tickets SET available = available - 1 WHERE id = 1001;
COMMIT;
```

**Use distributed locks when**:
- Coordinating across services that don't share a database
- Rate limiting (lock represents "you can run now")
- Leader election
- Ensuring only one worker processes a job

### Anti-Pattern: Overusing Locks
Don't use locks when you could use:
- **Atomic operations**: `INCR`, `HINCRBY`, `ZADD` are already atomic
- **Optimistic locking**: Check version number, retry if changed
- **Idempotent operations**: Design operations to be safely retried
- **Queues**: Use Redis Streams or a proper message queue

### Failure Modes

**Lock holder crashes**:
- TTL ensures lock is eventually released
- But operations may be incomplete
- Use idempotency keys to prevent duplicate operations

**Clock drift**:
- Server clocks drift apart
- TTL expires early or late on different nodes
- Redlock accounts for this with time validation

**Network partition**:
- Lock holder can't reach Redis
- Lock expires, another process acquires it
- Both processes think they own the lock
- Use fencing tokens to detect this

## Further Reading

- [Redlock Algorithm](https://redis.io/docs/manual/patterns/distributed-locks/)
- [How to do distributed locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
