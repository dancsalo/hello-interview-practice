# PostgreSQL Read Scaling: Replication & Consistency

## What

Demonstrates read scaling through primary/replica replication architecture, focusing on replication lag challenges, read-after-write consistency patterns, connection routing strategies, and failover concepts.

## Why

Many candidates understand basic replication conceptually but miss the nuanced consistency challenges and practical trade-offs. System design interviews often require discussing:
- When replication is sufficient vs when to shard
- How to handle replication lag in application code
- Failover strategies and their implications
- The spectrum between strong consistency and availability

## How

This example simulates a social media feed system with high read volume:
- **Primary node**: Handles all writes (new posts)
- **Replica nodes**: Handle feed reads (SELECT queries)
- **Replication lag**: Simulated delays showing consistency challenges
- **Routing strategies**: Patterns to maintain read-after-write consistency

Since we can't easily spin up actual replicas in this Docker setup, the example:
- Explains the architecture with clear descriptions
- Simulates lag with controlled delays in code
- Focuses on application-level patterns (connection routing, consistency strategies)
- Demonstrates monitoring and failover concepts

## Key Concepts

### Replication Modes

**Asynchronous Replication** (most common):
- Primary commits transaction before replica confirms
- Low latency, high throughput
- Risk: Data loss during failover
- Lag: Typically 10-100ms, can spike to seconds under load

**Synchronous Replication**:
- Primary waits for replica confirmation before commit
- No data loss, strong consistency
- Higher latency (2x-3x), reduced throughput
- Use for: Financial transactions, critical data

### Replication Lag Challenges

**Read-Your-Writes Consistency**:
Problem: User writes data, immediately reads it, but sees stale data from replica.
```
User posts -> PRIMARY (success)
User views feed -> REPLICA (post not yet replicated)
User confused: "Where did my post go?"
```

**Solutions**:
1. Read from primary after write (1-2 seconds)
2. Sticky sessions to same replica
3. Version tracking (client stores last write version)
4. Critical reads always from primary

**Monitoring Replication Lag**:
```sql
-- On PRIMARY
SELECT
  client_addr,
  state,
  sync_state,
  EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds
FROM pg_stat_replication;
```

Thresholds:
- < 100ms: Excellent
- 100ms - 1s: Acceptable for most use cases
- \> 1s: Investigate (network issues, heavy write load, under-provisioned replica)
- \> 10s: Critical (risk of failover data loss)

## Try It

Run the example and observe:
1. Normal reads from replica (no lag scenario)
2. Read-after-write consistency problem demonstration
3. Solutions: Reading from primary, sticky sessions
4. Replication lag monitoring patterns
5. Failover process explanation
6. When replication isn't enough (need sharding)

The example uses the single PostgreSQL instance but simulates the routing and lag concepts to demonstrate application-level patterns.

## Architecture Patterns

### Connection Routing

**Simple Primary/Replica Routing**:
```typescript
class DatabaseRouter {
  async write(query: string) {
    return primaryPool.query(query);
  }

  async read(query: string, userId?: number) {
    // Check if user recently wrote
    const lastWrite = this.getLastWriteTime(userId);
    if (Date.now() - lastWrite < 1000) {
      return primaryPool.query(query); // Read from primary
    }
    return replicaPool.query(query); // Read from replica
  }
}
```

**Load Balancing Across Replicas**:
```typescript
class ReplicaLoadBalancer {
  private replicas: Pool[];
  private currentIndex = 0;

  // Round-robin
  getReplicaConnection(): Pool {
    const replica = this.replicas[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.replicas.length;
    return replica;
  }

  // Weighted by lag (prefer lower lag replicas)
  getReplicaByLag(): Pool {
    const lagsMs = this.replicas.map(r => this.getReplicationLag(r));
    const weights = lagsMs.map(lag => 1 / (lag + 1));
    return this.weightedRandom(this.replicas, weights);
  }
}
```

### Read-After-Write Consistency Patterns

**Pattern 1: Session-Based Primary Routing**:
```typescript
// After write, set session flag
async createPost(userId: number, content: string) {
  await primaryDb.query('INSERT INTO posts ...', [userId, content]);
  session.set('last_write_at', Date.now());
}

// Read respects session flag
async getFeed(userId: number) {
  const lastWrite = session.get('last_write_at');
  const db = (Date.now() - lastWrite < 1000) ? primaryDb : replicaDb;
  return db.query('SELECT * FROM posts WHERE ...', [userId]);
}
```

**Pattern 2: Version Tracking**:
```typescript
// Track last commit timestamp
async createPost(userId: number, content: string) {
  const result = await primaryDb.query(
    'INSERT INTO posts ... RETURNING created_at',
    [userId, content]
  );
  const version = result.rows[0].created_at;
  return { postId, version };
}

// Only read from replica that has this version
async getFeed(userId: number, minVersion: Date) {
  const replica = await this.getReplicaWithVersion(minVersion);
  return replica.query('SELECT * FROM posts WHERE ...', [userId]);
}
```

**Pattern 3: Critical Paths Always Primary**:
```typescript
const criticalPaths = [
  'account_balance',
  'payment_status',
  'order_confirmation'
];

async query(path: string, query: string) {
  const db = criticalPaths.includes(path) ? primaryDb : replicaDb;
  return db.query(query);
}
```

## Production Considerations

### Setup & Configuration

**Primary Configuration** (`postgresql.conf`):
```ini
# Replication
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1024  # MB (prevents WAL deletion during lag)
max_replication_slots = 10

# Performance
synchronous_commit = off  # For async replication
checkpoint_timeout = 15min
max_wal_size = 4GB

# Monitoring
track_commit_timestamp = on
```

**Replica Configuration**:
```ini
# Read-only replica
hot_standby = on
max_standby_streaming_delay = 30s
hot_standby_feedback = on  # Prevents query cancellations

# Recovery
primary_conninfo = 'host=primary port=5432 user=replicator password=...'
primary_slot_name = 'replica_slot_1'
```

**Physical Replication Setup**:
```bash
# On primary: Create replication slot
SELECT pg_create_physical_replication_slot('replica_slot_1');

# On replica: Initial base backup
pg_basebackup -h primary -D /var/lib/postgresql/data -U replicator -P -R

# Start replica
pg_ctl start
```

### Connection Pooling

**Separate Pools for Primary and Replicas**:
```typescript
const primaryPool = new Pool({
  host: 'primary.example.com',
  port: 5432,
  max: 20,  // Smaller pool (fewer writes)
  idleTimeoutMillis: 30000,
});

const replicaPools = [
  new Pool({ host: 'replica1.example.com', max: 50 }),
  new Pool({ host: 'replica2.example.com', max: 50 }),
  new Pool({ host: 'replica3.example.com', max: 50 }),
];
```

**PgBouncer for Connection Management**:
```ini
[databases]
primary = host=primary.internal port=5432
replica1 = host=replica1.internal port=5432
replica2 = host=replica2.internal port=5432

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
```

### Load Balancing

**HAProxy Configuration**:
```haproxy
# Read replicas backend
backend postgres_replicas
    mode tcp
    balance leastconn
    option pgsql-check user haproxy
    server replica1 replica1.internal:5432 check inter 5s
    server replica2 replica2.internal:5432 check inter 5s
    server replica3 replica3.internal:5432 check inter 5s

# Write primary backend
backend postgres_primary
    mode tcp
    option pgsql-check user haproxy
    server primary primary.internal:5432 check inter 2s
```

**Health Check with Lag Awareness**:
```sql
-- Custom health check that fails if lag > threshold
SELECT 
  CASE 
    WHEN pg_is_in_recovery() = false THEN true  -- Primary
    WHEN EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) < 5 
      THEN true  -- Replica with lag < 5s
    ELSE false  -- Replica too lagged
  END as healthy;
```

### Failover Strategies

**Manual Failover** (safest, slower):
```bash
# 1. Stop accepting writes to primary
# 2. Wait for replicas to catch up
SELECT pg_current_wal_lsn();  # On primary
SELECT pg_last_wal_replay_lsn();  # On each replica

# 3. Promote replica with least lag
pg_ctl promote -D /var/lib/postgresql/data

# 4. Update connection strings / DNS
# 5. Reconfigure other replicas to follow new primary
```

**Automatic Failover with Patroni**:
Patroni uses distributed consensus (etcd, Consul, Zookeeper) to:
- Detect primary failure (health checks)
- Elect new primary (replica with least lag)
- Prevent split-brain (consensus-based)
- Reconfigure replicas automatically
- Update HAProxy/load balancer

```yaml
# patroni.yml
scope: postgres-cluster
name: node1

restapi:
  listen: 0.0.0.0:8008
  
etcd:
  hosts: etcd1:2379,etcd2:2379,etcd3:2379

bootstrap:
  dcs:
    postgresql:
      parameters:
        max_wal_senders: 10
        wal_level: replica
      
postgresql:
  listen: 0.0.0.0:5432
  data_dir: /var/lib/postgresql/data
  
  parameters:
    synchronous_commit: local  # or 'on' for sync replication
    
  pg_hba:
    - host replication replicator 0.0.0.0/0 md5
```

**Failover Timing**:
- Detection: 5-30s (health check frequency)
- Consensus/election: 2-10s
- Promotion: 1-5s (`pg_ctl promote`)
- DNS/load balancer update: 30-60s (TTL dependent)
- **Total downtime: 30s - 2 minutes** (typical)

### Monitoring & Alerting

**Key Metrics**:
```sql
-- Replication lag per replica
SELECT
  client_addr,
  application_name,
  state,
  sync_state,
  COALESCE(
    EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())),
    0
  ) as lag_seconds,
  pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) / 1024 / 1024 as lag_mb
FROM pg_stat_replication;

-- Replica lag from replica itself
SELECT
  now() - pg_last_xact_replay_timestamp() as replication_delay;

-- Write throughput (primary)
SELECT
  sum(xact_commit + xact_rollback) as transactions,
  sum(tup_inserted + tup_updated + tup_deleted) as changes
FROM pg_stat_database
WHERE datname = 'your_database';
```

**Alerting Thresholds**:
- **Critical**: Lag > 10 seconds for 1 minute
- **Warning**: Lag > 1 second for 5 minutes
- **Info**: Replica count < expected (N-1 replicas)
- **Critical**: Primary CPU > 80% for 5 minutes
- **Warning**: Connection pool saturation > 80%

**Monitoring Dashboard**:
- Replication lag graph (per replica)
- Write throughput (queries/sec)
- Read distribution across replicas
- Connection pool utilization
- Query latency percentiles (p50, p95, p99)
- Failover history

## When Replication Isn't Enough

### Limitations of Replication

Replication helps with:
- **Read scaling**: Add more replicas for more read capacity
- **Geographic distribution**: Place replicas closer to users
- **High availability**: Failover to replica if primary fails

Replication does NOT help with:
- **Write scaling**: Single primary is bottleneck
- **Dataset size**: All nodes store full copy (expensive)
- **Hot partitions**: All traffic to primary for writes

### Sharding Decision Matrix

| Metric | Replication OK | Consider Sharding |
|--------|---------------|-------------------|
| **Write throughput** | < 5K writes/sec | > 10K writes/sec |
| **Dataset size** | < 500GB | > 1TB |
| **Read:Write ratio** | > 10:1 | < 5:1 |
| **Query pattern** | Diverse, unpartitionable | Naturally partitioned (user_id, region) |
| **Complexity tolerance** | Low (simple ops) | High (experienced team) |

### Hybrid Approaches

**Functional Sharding** (by table/feature):
- User service: users, profiles → DB1
- Post service: posts, comments → DB2
- Analytics: metrics, logs → DB3
- Easier than horizontal sharding, good for microservices

**Read Replicas + Write Sharding**:
- Shard writes across multiple primaries (by user_id % N)
- Each shard has read replicas for read scaling
- Best of both worlds, but complex

**Caching Layer**:
- Redis/Memcached in front of replicas
- Reduces replica load by 80-90%
- Often sufficient before needing sharding
- Consider cache invalidation complexity

## Performance Tips

### Optimizing Replica Performance

1. **Use Read-Only Transactions**:
   ```sql
   BEGIN TRANSACTION READ ONLY;
   -- Queries here
   COMMIT;
   ```
   - Reduces overhead on replica
   - Prevents accidental writes

2. **Avoid Long-Running Queries on Replicas**:
   - Can cause replication lag if `hot_standby_feedback = on`
   - Set statement timeout: `SET statement_timeout = '30s'`

3. **Connection Pooling**:
   - Use PgBouncer in transaction mode
   - Reduces connection overhead
   - Allows more connections than Postgres max_connections

4. **Query Result Caching**:
   - Cache frequent queries in application layer
   - Use Redis with TTL (30-60 seconds)
   - Reduces replica query load

### Write Optimization

1. **Batch Writes**:
   ```sql
   INSERT INTO posts (user_id, content) VALUES
     (1, 'Post 1'),
     (2, 'Post 2'),
     (3, 'Post 3');
   ```
   - Reduces replication overhead
   - Fewer WAL segments

2. **Asynchronous Commit**:
   ```sql
   SET synchronous_commit = off;
   ```
   - Faster writes (2-3x)
   - Risk: Lose last few transactions on crash
   - Acceptable for: Likes, views, analytics

3. **Connection Reuse**:
   - Avoid opening connections per request
   - Use connection pooling (PgBouncer, built-in app pool)

## Common Pitfalls

### 1. Not Monitoring Replication Lag
**Problem**: Lag spikes unnoticed, users see stale data, data loss on failover.

**Solution**: 
- Alert on lag > 1 second for 5 minutes
- Dashboard showing lag per replica
- Health checks that remove lagging replicas

### 2. Sending Writes to Replicas
**Problem**: Application accidentally sends writes to read-only replica.

**Solution**:
- Separate connection pools for primary and replicas
- Use read-only database users for replica connections
- Code review: Ensure writes use primary pool

### 3. Ignoring Read-After-Write Consistency
**Problem**: User writes data, immediately reads stale version from replica.

**Solution**:
- Route user to primary for 1-2 seconds after write
- Use sticky sessions to same replica
- Critical paths (balance, orders) always read from primary

### 4. Under-Provisioned Replicas
**Problem**: Replicas can't keep up with primary, constant lag.

**Solution**:
- Replicas should match or exceed primary specs
- Monitor replica CPU/IO/memory usage
- Add more replicas if read load increases

### 5. No Failover Testing
**Problem**: Failover fails in production due to misconfigurations.

**Solution**:
- Regular failover drills (monthly/quarterly)
- Automated failover testing (chaos engineering)
- Document and practice runbooks

## Further Reading

- [PostgreSQL Replication Documentation](https://www.postgresql.org/docs/current/high-availability.html)
- [Streaming Replication](https://www.postgresql.org/docs/current/warm-standby.html#STREAMING-REPLICATION)
- [Patroni: HA PostgreSQL](https://github.com/zalando/patroni)
- [Replication Lag Monitoring](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)
- [HAProxy for PostgreSQL](https://www.haproxy.com/blog/the-four-essential-sections-of-an-haproxy-configuration/)
- [PgBouncer Connection Pooling](https://www.pgbouncer.org/)

## Interview Talking Points

When discussing read scaling in interviews:

1. **Start with the scale**:
   - "How many reads per second? What's the read:write ratio?"
   - Influences whether replication is sufficient

2. **Discuss trade-offs explicitly**:
   - Asynchronous replication: Performance vs consistency vs data loss
   - Synchronous replication: Consistency vs latency

3. **Address consistency challenges**:
   - "Users might see stale data. For critical paths like account balance, we'd read from primary."
   - Shows awareness of nuance

4. **Mention monitoring**:
   - "We'd monitor replication lag and alert if it exceeds 1 second"
   - Production-ready thinking

5. **Know when to shard**:
   - "Replication helps read scaling, but if writes become the bottleneck, we'd need to shard"
   - Shows understanding of limitations

6. **Failover strategy**:
   - "Automatic failover with Patroni provides 30-60s downtime. For critical systems, we'd use synchronous replication to prevent data loss"
   - Demonstrates depth
