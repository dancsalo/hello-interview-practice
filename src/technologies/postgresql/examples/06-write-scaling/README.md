# PostgreSQL Write Scaling: Partitioning & Batching

## What

Demonstrates write scaling strategies including table partitioning (PARTITION BY RANGE), write batching, partition pruning for query performance, partition maintenance, and conceptual overview of sharding and connection pooling for high-throughput systems.

## Why

Many candidates understand reads can be scaled with replicas but struggle with write scaling strategies. System design interviews frequently ask:
- How do you handle write-heavy workloads (analytics, logging)?
- When should you partition vs shard?
- What are the trade-offs of partitioning?
- How do you maintain partitions in production?
- What are realistic PostgreSQL write throughput limits?

This example provides concrete patterns and production insights for these discussions.

## How

This example simulates an analytics events system with time-series data:
- **Non-partitioned baseline**: Standard table for comparison
- **Partitioned table**: PARTITION BY RANGE on created_at timestamp
- **Write batching**: Single vs batched INSERT performance
- **Partition pruning**: Query optimization demonstration
- **Maintenance operations**: Creating/dropping partitions
- **Conceptual patterns**: Sharding strategies, connection pooling

The example creates monthly partitions and demonstrates how PostgreSQL automatically routes data and queries to the appropriate partitions.

## Key Concepts

### Table Partitioning

**What it is**:
- Splitting a large table into smaller, more manageable pieces (partitions)
- Each partition is a separate physical table
- Parent table is virtual - all queries go through it
- PostgreSQL automatically routes data to correct partition

**Partitioning strategies**:

1. **RANGE partitioning** (most common):
   ```sql
   CREATE TABLE events (
     id BIGSERIAL,
     created_at TIMESTAMP NOT NULL,
     data JSONB
   ) PARTITION BY RANGE (created_at);
   
   CREATE TABLE events_2026_05 PARTITION OF events
   FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
   ```
   - Use for: Time-series (logs, events), sequential IDs
   - Examples: BY month, BY week, BY year

2. **LIST partitioning**:
   ```sql
   CREATE TABLE orders (
     id BIGSERIAL,
     region VARCHAR(10),
     data JSONB
   ) PARTITION BY LIST (region);
   
   CREATE TABLE orders_us PARTITION OF orders
   FOR VALUES IN ('US', 'CA');
   
   CREATE TABLE orders_eu PARTITION OF orders
   FOR VALUES IN ('UK', 'DE', 'FR');
   ```
   - Use for: Categories, regions, status values

3. **HASH partitioning** (PostgreSQL 11+):
   ```sql
   CREATE TABLE users (
     id BIGSERIAL,
     username VARCHAR(50),
     data JSONB
   ) PARTITION BY HASH (id);
   
   CREATE TABLE users_0 PARTITION OF users
   FOR VALUES WITH (MODULUS 4, REMAINDER 0);
   
   CREATE TABLE users_1 PARTITION OF users
   FOR VALUES WITH (MODULUS 4, REMAINDER 1);
   ```
   - Use for: Uniform distribution across partitions

### Partition Pruning

PostgreSQL's query optimizer can skip scanning irrelevant partitions:

```sql
-- Only scans events_2026_05 partition
SELECT * FROM events
WHERE created_at >= '2026-05-01' AND created_at < '2026-06-01';

-- Scans ALL partitions (slower)
SELECT * FROM events
WHERE event_type = 'click';  -- No partition key in WHERE
```

**Key insight**: Always include the partition key in WHERE clause when possible for best performance.

### Write Batching

**Single inserts (anti-pattern)**:
```typescript
for (let i = 0; i < 1000; i++) {
  await client.query('INSERT INTO events (data) VALUES ($1)', [data[i]]);
}
// 1000 round trips, 1000 transactions, SLOW
```

**Batched inserts (best practice)**:
```typescript
const values = [];
const params = [];
for (let i = 0; i < 1000; i++) {
  values.push(`($${i + 1})`);
  params.push(data[i]);
}
await client.query(
  `INSERT INTO events (data) VALUES ${values.join(', ')}`,
  params
);
// 1 round trip, 1 transaction, FAST (5-10x faster)
```

**Batching guidelines**:
- Batch size: 100-1000 rows (balance memory vs speed)
- Use COPY for bulk loads (10x faster than batched INSERT)
- Enable `synchronous_commit = off` for non-critical data (2-3x faster)
- Monitor memory usage with large batches

## Try It

Run the example and observe:
1. Write batching performance (single vs batched INSERTs)
2. Table partitioning setup (monthly partitions)
3. Partition pruning with EXPLAIN (query optimization)
4. Performance comparison (partitioned vs non-partitioned)
5. Partition maintenance (create/drop operations)
6. Indexing on partitioned tables
7. Sharding concepts and trade-offs
8. Connection pooling strategies
9. PostgreSQL write throughput limits

The example uses a single PostgreSQL instance but demonstrates the concepts that apply at scale.

## Architecture Patterns

### Partition Management

**Creating partitions ahead of time**:
```sql
-- Cron job runs monthly on 25th:
CREATE TABLE IF NOT EXISTS events_2026_06 PARTITION OF events
FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

**Dropping old partitions**:
```sql
-- Option 1: Drop entirely
DROP TABLE events_2025_01;

-- Option 2: Detach and archive (safer)
ALTER TABLE events DETACH PARTITION events_2025_01;
-- Now events_2025_01 is standalone, can be exported to S3
```

**Automated maintenance script** (pseudocode):
```typescript
// Run daily
async function maintainPartitions() {
  const nextMonth = getNextMonth();
  const oldMonth = getMonthNMonthsAgo(3);
  
  // Create next month partition
  await db.query(`
    CREATE TABLE IF NOT EXISTS events_${nextMonth}
    PARTITION OF events
    FOR VALUES FROM ('${nextMonth}-01') TO ('${nextMonth+1}-01')
  `);
  
  // Archive and drop old partition
  await archivePartitionToS3(`events_${oldMonth}`);
  await db.query(`DROP TABLE IF EXISTS events_${oldMonth}`);
}
```

### Multi-Level Partitioning

For very large systems, partition by multiple dimensions:

```sql
-- Partition by year, then by month
CREATE TABLE events (
  id BIGSERIAL,
  created_at TIMESTAMP NOT NULL,
  data JSONB
) PARTITION BY RANGE (EXTRACT(YEAR FROM created_at));

CREATE TABLE events_2026 PARTITION OF events
FOR VALUES FROM (2026) TO (2027)
PARTITION BY RANGE (EXTRACT(MONTH FROM created_at));

CREATE TABLE events_2026_05 PARTITION OF events_2026
FOR VALUES FROM (5) TO (6);

CREATE TABLE events_2026_06 PARTITION OF events_2026
FOR VALUES FROM (6) TO (7);
```

Or by region + time:
```sql
-- Partition by region first
CREATE TABLE orders (
  id BIGSERIAL,
  region VARCHAR(10),
  created_at TIMESTAMP NOT NULL,
  data JSONB
) PARTITION BY LIST (region);

CREATE TABLE orders_us PARTITION OF orders
FOR VALUES IN ('US', 'CA')
PARTITION BY RANGE (created_at);

CREATE TABLE orders_us_2026_05 PARTITION OF orders_us
FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

## Production Considerations

### When to Partition

**Partition when**:
- Table size > 100GB (query performance degradation)
- Time-series data with time-range queries
- Clear retention policy (drop old data)
- Maintenance operations slow (VACUUM, REINDEX)
- Query patterns match partition key

**Don't partition when**:
- Table size < 10GB (overhead not worth it)
- Queries scan entire table (no partition pruning)
- No clear partition key
- High operational complexity not justified

**Decision matrix**:

| Factor | Threshold for Partitioning |
|--------|---------------------------|
| **Table size** | > 100GB |
| **Row count** | > 100 million rows |
| **Query pattern** | 80%+ queries include partition key |
| **Retention policy** | Regular data deletion (>30 days old) |
| **Maintenance time** | VACUUM/REINDEX > 1 hour |

### Configuration Tuning

**Write-optimized settings** (`postgresql.conf`):
```ini
# WAL settings
wal_level = replica
wal_buffers = 16MB
min_wal_size = 1GB
max_wal_size = 4GB

# Commit settings (trade durability for speed)
synchronous_commit = off        # Async commit: 2-3x faster writes
commit_delay = 10               # Microseconds: Group commits
wal_writer_delay = 10ms         # How often to flush WAL

# Checkpoint settings
checkpoint_timeout = 15min      # Less frequent checkpoints
checkpoint_completion_target = 0.9

# Memory
shared_buffers = 8GB            # 25% of RAM
effective_cache_size = 24GB     # 75% of RAM
work_mem = 64MB                 # Per-operation memory

# Parallelism
max_worker_processes = 16
max_parallel_workers = 8
max_parallel_workers_per_gather = 4
```

**Trade-offs**:
- `synchronous_commit = off`: Faster writes, but can lose last few transactions on crash
- Higher `wal_buffers`: Better write throughput, more memory usage
- Less frequent checkpoints: Smoother performance, longer recovery time

### Indexing Partitioned Tables

**Global indexes** (apply to all partitions):
```sql
CREATE INDEX idx_events_user_id ON events(user_id);
-- Automatically creates index on each partition
```

**Partition-specific indexes**:
```sql
-- Index only recent data
CREATE INDEX idx_events_2026_05_event_type 
ON events_2026_05(event_type);
```

**Indexing guidelines**:
- Create indexes on parent table (applies to all current and future partitions)
- Each partition has its own physical index (smaller, faster)
- REINDEX individual partitions to avoid locking entire table
- Drop indexes on old partitions before archival (save space)

```sql
-- REINDEX one partition (low impact)
REINDEX TABLE events_2026_05;

-- vs REINDEX entire table (high impact, locks all partitions)
REINDEX TABLE events;
```

### Monitoring Partitioned Tables

**Check partition sizes**:
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_total_relation_size(schemaname||'.'||tablename) as bytes
FROM pg_tables
WHERE tablename LIKE 'events_%'
ORDER BY bytes DESC;
```

**Monitor partition count**:
```sql
SELECT
  nmsp_parent.nspname AS parent_schema,
  parent.relname AS parent_table,
  COUNT(*) AS partition_count
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
JOIN pg_namespace nmsp_parent ON parent.relnamespace = nmsp_parent.oid
GROUP BY parent_schema, parent_table
ORDER BY partition_count DESC;
```

**Alert thresholds**:
- Partition size > 50GB: Consider daily partitions instead of monthly
- Partition count > 100: Cleanup old partitions, review retention
- Missing next month partition: Automated creation failed

### Backup Strategies

**Per-partition backup** (parallel, faster):
```bash
# Backup current partition
pg_dump -t events_2026_05 mydb > events_2026_05.sql

# Restore to another database
psql targetdb < events_2026_05.sql
```

**Archive old partitions**:
```bash
# Detach partition
psql -c "ALTER TABLE events DETACH PARTITION events_2025_01"

# Export to S3
pg_dump -t events_2025_01 mydb | gzip | aws s3 cp - s3://backups/events_2025_01.sql.gz

# Drop local copy
psql -c "DROP TABLE events_2025_01"
```

**WAL archiving for PITR**:
```ini
# postgresql.conf
archive_mode = on
archive_command = 'aws s3 cp %p s3://wal-archive/%f'
```

## Sharding Concepts

Partitioning splits one table in one database. Sharding splits data across multiple databases.

### When Sharding is Necessary

**Limitations of single-node Postgres**:
- Write throughput: ~5K writes/sec per core (40K writes/sec on 8-core)
- Dataset size: Replication expensive when > 1TB
- Single point of failure (even with replicas)

**Shard when**:
- Write throughput > 10K writes/sec (saturating single node)
- Dataset > 1TB (replication/backup expensive)
- After exhausting: Indexing, partitioning, read replicas, batching
- Query patterns naturally partitioned (by tenant, user, region)

### Sharding Strategies

**1. Shard by User ID (hash-based)**:
```typescript
function getShardForUser(userId: number): Database {
  const shardId = userId % NUM_SHARDS;
  return shards[shardId];
}

// Write
const shard = getShardForUser(userId);
await shard.query('INSERT INTO orders (user_id, ...) VALUES ($1, ...)', [userId, ...]);

// Read
const shard = getShardForUser(userId);
const orders = await shard.query('SELECT * FROM orders WHERE user_id = $1', [userId]);
```

Pros:
- Even distribution (with good hash)
- User queries hit single shard (fast)

Cons:
- Cross-user queries difficult (e.g., leaderboard)
- Rebalancing hard (need to move data)

**2. Shard by Tenant (multi-tenant SaaS)**:
```typescript
function getShardForTenant(tenantId: string): Database {
  return tenantShardMapping[tenantId]; // Lookup table
}

// All Company A data on Shard 1
// All Company B data on Shard 2
```

Pros:
- Strong isolation (security, compliance)
- Easy to reason about (tenant = shard)
- Tenant-level backups/restoration

Cons:
- Uneven distribution (big tenants)
- Cross-tenant queries impossible
- Hot shards (popular tenants)

**3. Shard by Geography**:
```typescript
const shardMapping = {
  'US': usDatabase,
  'EU': euDatabase,
  'APAC': apacDatabase,
};

function getShardForRegion(region: string): Database {
  return shardMapping[region];
}
```

Pros:
- Data locality (GDPR compliance)
- Lower latency (geo-distributed)

Cons:
- Uneven load (time zones)
- Cross-region queries expensive

**4. Hybrid: Time + Shard**:
```typescript
// Partition by time, shard within each time period
function getShardForEvent(userId: number, timestamp: Date): Database {
  const month = timestamp.toISOString().slice(0, 7); // "2026-05"
  const shardId = userId % NUM_SHARDS_PER_MONTH;
  return shards[`${month}_${shardId}`];
}
```

Pros:
- Write scaling (multiple shards)
- Time-based retention (drop old shards)

Cons:
- Complexity (many databases)
- Operational overhead

### Sharding Trade-offs

**Challenges**:
- **No cross-shard transactions**: Can't do ACID across shards
- **No cross-shard joins**: Need to join in application layer
- **Complex routing**: Application must route queries to correct shard
- **Rebalancing**: Moving data between shards is hard
- **Operational**: N databases to monitor, backup, upgrade

**Alternatives to consider first**:
1. Vertical scaling (bigger machine)
2. Read replicas (scale reads)
3. Caching layer (Redis) - often 80% reduction
4. Table partitioning (scale queries)
5. Functional sharding (by microservice)

### Sharding Tools

**Citus (PostgreSQL extension)**:
- Distributed tables across worker nodes
- Transparent sharding (SQL unchanged)
- Automatic query routing
- Good for: Multi-tenant SaaS

**Vitess (originally for MySQL, PG support coming)**:
- Automatic sharding and rebalancing
- Connection pooling and query routing
- Good for: Very large scale (YouTube uses it)

**Application-level sharding**:
- Full control over routing
- No external dependencies
- Most flexible but most complex

## Connection Pooling

### Why Pooling Matters

**Without pooling**:
- PostgreSQL creates process per connection (~10MB memory)
- Connection setup: 5-10ms overhead
- max_connections = 100 (default limit)
- 100 concurrent clients = max capacity

**With pooling (PgBouncer)**:
- Connection reuse across clients
- 1000 clients can share 25 Postgres connections
- Reduced connection overhead
- Higher throughput

### PgBouncer Configuration

**Basic setup** (`pgbouncer.ini`):
```ini
[databases]
mydb = host=localhost port=5432 dbname=mydb user=postgres

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction          # Recommended for most cases
max_client_conn = 1000           # Max client connections
default_pool_size = 25           # DB connections per pool
min_pool_size = 5                # Keep minimum connections warm
reserve_pool_size = 5            # Extra connections for spikes
reserve_pool_timeout = 3         # Seconds before using reserve

# Logging
admin_users = postgres
stats_users = postgres
log_connections = 1
log_disconnections = 1
```

**Pool modes**:

1. **Session mode**:
   - Client gets connection for entire session
   - All PostgreSQL features work (prepared statements, temp tables)
   - Less connection reuse (lower concurrency)

2. **Transaction mode** (recommended):
   - Connection returned after transaction
   - Higher connection reuse (1000+ clients with 25 connections)
   - No multi-statement transactions, no prepared statements

3. **Statement mode**:
   - Connection returned after each statement
   - Maximum reuse
   - No transactions, very limited use cases

**Connection pool sizing**:
```
default_pool_size = (CPU cores * 2) + (number of disks)

Example: 8-core CPU, 2 disks → pool_size = 18
```

Tune based on:
- Monitor connection wait time
- CPU utilization (high wait + low CPU = increase pool)
- Disk I/O saturation (high I/O = may not help)

### Application Pooling

**Node.js pg Pool**:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mydb',
  user: 'postgres',
  password: 'password',
  max: 20,                  // Max connections
  min: 5,                   // Min idle connections
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000,
});

// Use pool
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

**Best practices**:
- Use application pool + PgBouncer (two layers)
- Application pool: Small (20-50), per-app instance
- PgBouncer: Larger (100-200), shared across instances
- Monitor pool saturation (active / max)

## Performance Benchmarks

### Write Throughput

**Single-row inserts**:
- ~500 writes/sec (no batching, synchronous_commit = on)
- ~1,500 writes/sec (no batching, synchronous_commit = off)

**Batched inserts** (1000 rows/batch):
- ~20K rows/sec (synchronous_commit = on)
- ~50K rows/sec (synchronous_commit = off)

**COPY command**:
- ~100K rows/sec (fastest for bulk loading)

**Realistic production** (8-core, SSD):
- 5K-10K writes/sec (with indexes, constraints)
- 20K-40K writes/sec (batched, optimized)

### Partition Pruning Benefits

**Non-partitioned table** (1B rows, 500GB):
```sql
SELECT COUNT(*) FROM events
WHERE created_at >= '2026-05-01' AND created_at < '2026-06-01';
-- Seq Scan: 180 seconds
```

**Partitioned table** (monthly partitions):
```sql
SELECT COUNT(*) FROM events
WHERE created_at >= '2026-05-01' AND created_at < '2026-06-01';
-- Scans 1 partition (50GB): 18 seconds (10x faster)
```

**With index on partition**:
```sql
-- Index Scan on events_2026_05: 2 seconds (90x faster)
```

## Common Pitfalls

### 1. Not Including Partition Key in Queries

**Problem**: Query scans all partitions instead of pruning.

```sql
-- BAD: Scans all 12 monthly partitions
SELECT * FROM events WHERE user_id = 123;

-- GOOD: Scans only May partition
SELECT * FROM events 
WHERE user_id = 123 
  AND created_at >= '2026-05-01' 
  AND created_at < '2026-06-01';
```

**Solution**: Always include partition key in WHERE clause when possible.

### 2. Forgetting to Create Future Partitions

**Problem**: INSERT fails when data doesn't fit any partition.

```sql
INSERT INTO events (created_at, data) VALUES ('2026-06-01', '{}');
-- ERROR: no partition of relation "events" found for row
```

**Solution**: 
- Cron job creates next month partition on 25th of current month
- Alert if next month partition missing
- Default partition for unexpected data (PostgreSQL 11+):
  ```sql
  CREATE TABLE events_default PARTITION OF events DEFAULT;
  ```

### 3. Too Many Partitions

**Problem**: 1000s of partitions slow down query planning.

**Solution**:
- Keep partition count < 100 (PostgreSQL 12+)
- Regularly drop old partitions (retention policy)
- Use appropriate partition granularity (monthly, not hourly)

### 4. Incorrect Pool Sizing

**Problem**: Too small = connection waits, too large = context switching.

**Solution**:
- Start with: pool_size = CPU cores * 2
- Monitor: connection wait time, CPU utilization
- Scale based on metrics, not guesses

### 5. Not Monitoring WAL Growth

**Problem**: High write load generates WAL faster than archival.

```sql
-- Check WAL generation rate
SELECT
  pg_current_wal_lsn(),
  pg_walfile_name(pg_current_wal_lsn());
```

**Solution**:
- Alert on WAL size > 10GB
- Alert on WAL generation > 1GB/min
- Increase `max_wal_size` or archive faster

## Further Reading

- [PostgreSQL Partitioning Documentation](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Declarative Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-DECLARATIVE)
- [Partition Pruning](https://www.postgresql.org/docs/current/ddl-partitioning.html#DDL-PARTITIONING-PRUNING)
- [PgBouncer](https://www.pgbouncer.org/)
- [Citus: Distributed PostgreSQL](https://www.citusdata.com/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Write-Ahead Logging](https://www.postgresql.org/docs/current/wal-intro.html)

## Interview Talking Points

When discussing write scaling in interviews:

1. **Start with requirements**:
   - "What's the write throughput? Reads:writes ratio?"
   - Influences whether partitioning/sharding needed

2. **Exhaust simple solutions first**:
   - "First, I'd batch writes and optimize indexes"
   - "Then add read replicas if reads are bottleneck"
   - "Partitioning before sharding (simpler)"

3. **Explain partitioning benefits**:
   - "Time-series data: monthly partitions"
   - "Query only recent data: partition pruning = 10x faster"
   - "Easy retention: drop old partitions"

4. **Discuss partition maintenance**:
   - "Cron job creates next month partition"
   - "Archive old partitions to S3 before dropping"
   - Shows production awareness

5. **Know when to shard**:
   - "Single Postgres handles ~40K writes/sec (8-core)"
   - "If writes exceed that, need to shard"
   - "Sharding adds complexity: routing, no cross-shard joins"

6. **Mention connection pooling**:
   - "PgBouncer in transaction mode"
   - "1000 clients share 25 Postgres connections"
   - Production-ready thinking

7. **Realistic about trade-offs**:
   - "Partitioning: Maintenance overhead, planning complexity"
   - "Sharding: No ACID across shards, difficult rebalancing"
   - "Always measure before optimizing"
