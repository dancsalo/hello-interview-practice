import type { Client } from 'pg';
import type { Logger, PostgreSQLExample } from '../../../../lib/types.js';

export const writeScalingExample: PostgreSQLExample = {
  name: 'Write Scaling: Partitioning & Batching',
  description: 'Table partitioning, write batching, partition pruning, sharding concepts',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('✍️  PostgreSQL Write Scaling: Partitioning & Batching');
    logger.info('Analytics events system with time-series partitioning\n');

    logger.production('Write Scaling Strategies:');
    logger.production('- Batch writes: Reduce per-transaction overhead');
    logger.production('- Table partitioning: Split large tables by key (time, region, user_id)');
    logger.production('- Partition pruning: Query only relevant partitions');
    logger.production('- Sharding: Multiple databases for horizontal write scaling');
    logger.production('- Connection pooling: Reduce connection overhead (PgBouncer)\n');

    // Setup: Create non-partitioned events table first
    logger.step('Setup: Create non-partitioned events table (baseline)');
    await client.query(`
      CREATE TABLE IF NOT EXISTS events_baseline (
        id BIGSERIAL,
        user_id INTEGER NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, created_at)
      )
    `);
    logger.command('CREATE TABLE events_baseline (id, user_id, event_type, event_data, created_at)');

    // Step 1: Demonstrate write batching
    logger.step('Step 1: Write batching for throughput');
    logger.production('Single INSERT vs batched INSERT comparison');

    // Single inserts (slower)
    logger.info('\nApproach 1: Individual INSERTs (anti-pattern)');
    const singleStartTime = Date.now();
    for (let i = 0; i < 100; i++) {
      await client.query(`
        INSERT INTO events_baseline (user_id, event_type, event_data)
        VALUES ($1, $2, $3)
      `, [i % 10, 'page_view', JSON.stringify({ page: `/page${i}` })]);
    }
    const singleInsertTime = Date.now() - singleStartTime;
    logger.command(`INSERT 100 rows individually: ${singleInsertTime}ms`);
    logger.production('Overhead: Connection round-trip + transaction per insert = slow\n');

    // Batched inserts (faster)
    logger.info('Approach 2: Batched INSERTs (best practice)');
    const batchStartTime = Date.now();
    const batchSize = 100;
    const values = [];
    const params = [];
    let paramCount = 1;

    for (let i = 0; i < batchSize; i++) {
      values.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2})`);
      params.push((i + 100) % 10, 'page_view', JSON.stringify({ page: `/page${i + 100}` }));
      paramCount += 3;
    }

    await client.query(
      `INSERT INTO events_baseline (user_id, event_type, event_data) VALUES ${values.join(', ')}`,
      params
    );
    const batchInsertTime = Date.now() - batchStartTime;
    logger.command(`INSERT 100 rows in single batch: ${batchInsertTime}ms`);
    logger.command(`Speedup: ${Math.round(singleInsertTime / Math.max(batchInsertTime, 1))}x faster`);
    logger.production('Single transaction, single round-trip = much faster\n');

    logger.production('Production batching guidelines:');
    logger.production('- Batch size: 100-1000 rows per INSERT (balance memory vs speed)');
    logger.production('- Use prepared statements for repeated inserts');
    logger.production('- Consider COPY for bulk loads (10x faster than INSERT)');
    logger.production('- Async commits for non-critical data (2-3x faster)\n');

    // Step 2: Create partitioned events table
    logger.step('Step 2: Create partitioned events table');
    logger.production('Partitioning by time (RANGE) - most common for analytics');

    await client.query(`
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL,
        user_id INTEGER NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) PARTITION BY RANGE (created_at)
    `);
    logger.command('CREATE TABLE events PARTITION BY RANGE (created_at)');
    logger.production('Parent table is virtual - data stored in partitions\n');

    // Create partitions for different time ranges
    logger.step('Step 3: Create monthly partitions');

    await client.query(`
      CREATE TABLE events_2025_01 PARTITION OF events
      FOR VALUES FROM ('2025-01-01') TO ('2025-02-01')
    `);
    logger.command('CREATE PARTITION events_2025_01 (Jan 2025)');

    await client.query(`
      CREATE TABLE events_2025_02 PARTITION OF events
      FOR VALUES FROM ('2025-02-01') TO ('2025-03-01')
    `);
    logger.command('CREATE PARTITION events_2025_02 (Feb 2025)');

    await client.query(`
      CREATE TABLE events_2025_03 PARTITION OF events
      FOR VALUES FROM ('2025-03-01') TO ('2025-04-01')
    `);
    logger.command('CREATE PARTITION events_2025_03 (Mar 2025)');

    await client.query(`
      CREATE TABLE events_2026_05 PARTITION OF events
      FOR VALUES FROM ('2026-05-01') TO ('2026-06-01')
    `);
    logger.command('CREATE PARTITION events_2026_05 (May 2026 - current)');

    logger.production('\nPartition naming convention: table_YYYY_MM');
    logger.production('Create partitions ahead of time (e.g., cron job creates next month)\n');

    // Step 4: Insert data into partitions
    logger.step('Step 4: Insert events across partitions');

    const eventTypes = ['page_view', 'click', 'purchase', 'signup', 'logout'];
    const partitionDates = [
      '2025-01-15',
      '2025-02-10',
      '2025-03-20',
      '2026-05-11'  // Today
    ];

    for (const date of partitionDates) {
      const batchValues = [];
      const batchParams = [];
      let batchParamCount = 1;

      for (let i = 0; i < 25; i++) {
        batchValues.push(`($${batchParamCount}, $${batchParamCount + 1}, $${batchParamCount + 2}, $${batchParamCount + 3})`);
        batchParams.push(
          i % 10,
          eventTypes[i % eventTypes.length],
          JSON.stringify({ value: i * 10 }),
          date
        );
        batchParamCount += 4;
      }

      await client.query(
        `INSERT INTO events (user_id, event_type, event_data, created_at) VALUES ${batchValues.join(', ')}`,
        batchParams
      );
    }
    logger.command('INSERT 100 events across 4 partitions (25 per partition)');

    const countResult = await client.query('SELECT COUNT(*) FROM events');
    logger.assert(countResult.rows[0].count === '100', '100 events inserted across partitions\n');

    // Step 5: Demonstrate partition pruning
    logger.step('Step 5: Partition pruning demonstration');
    logger.production('Query optimization: Only scan relevant partitions');

    // Query specific month (should only scan one partition)
    const explainRecent = await client.query(`
      EXPLAIN SELECT COUNT(*) FROM events
      WHERE created_at >= '2026-05-01' AND created_at < '2026-06-01'
    `);
    logger.command('EXPLAIN: SELECT COUNT(*) WHERE created_at in May 2026');
    logger.command('Query plan:', explainRecent.rows.map(r => r['QUERY PLAN']).join('\n'));
    logger.production('✓ Partition pruning: Only scans events_2026_05 partition');
    logger.production('Skips other 3 partitions = faster query\n');

    // Query across multiple partitions
    const explainRange = await client.query(`
      EXPLAIN SELECT COUNT(*) FROM events
      WHERE created_at >= '2025-01-01' AND created_at < '2025-04-01'
    `);
    logger.command('EXPLAIN: SELECT COUNT(*) WHERE created_at in Q1 2025');
    logger.command('Query plan:', explainRange.rows.map(r => r['QUERY PLAN']).join('\n'));
    logger.production('Scans only events_2025_01, events_2025_02, events_2025_03');
    logger.production('Skips events_2026_05 partition\n');

    // Query without time filter (scans all partitions)
    const explainAll = await client.query(`
      EXPLAIN SELECT COUNT(*) FROM events WHERE event_type = 'purchase'
    `);
    logger.command('EXPLAIN: SELECT COUNT(*) WHERE event_type = purchase (no date filter)');
    logger.command('Query plan:', explainAll.rows.map(r => r['QUERY PLAN']).join('\n'));
    logger.warning('⚠️  No time filter = scans ALL partitions (slower)');
    logger.production('Always include partition key in WHERE clause when possible\n');

    // Step 6: Performance comparison
    logger.step('Step 6: Query performance comparison');

    // Insert more data for better comparison
    logger.info('Inserting 1000 events into each table...');
    const largeValues = [];
    const largeParams = [];
    let largeParamCount = 1;

    for (let i = 0; i < 1000; i++) {
      largeValues.push(`($${largeParamCount}, $${largeParamCount + 1}, $${largeParamCount + 2}, $${largeParamCount + 3})`);
      largeParams.push(
        i % 100,
        eventTypes[i % eventTypes.length],
        JSON.stringify({ value: i }),
        '2026-05-11'
      );
      largeParamCount += 4;
    }

    await client.query(
      `INSERT INTO events (user_id, event_type, event_data, created_at) VALUES ${largeValues.join(', ')}`,
      largeParams
    );
    await client.query(
      `INSERT INTO events_baseline (user_id, event_type, event_data, created_at) VALUES ${largeValues.join(', ')}`,
      largeParams
    );

    // Query baseline (non-partitioned)
    const baselineStart = Date.now();
    await client.query(`
      SELECT COUNT(*) FROM events_baseline
      WHERE created_at >= '2026-05-01' AND created_at < '2026-06-01'
    `);
    const baselineTime = Date.now() - baselineStart;
    logger.command(`Non-partitioned query time: ${baselineTime}ms`);

    // Query partitioned
    const partitionedStart = Date.now();
    await client.query(`
      SELECT COUNT(*) FROM events
      WHERE created_at >= '2026-05-01' AND created_at < '2026-06-01'
    `);
    const partitionedTime = Date.now() - partitionedStart;
    logger.command(`Partitioned query time: ${partitionedTime}ms`);

    logger.production(`\nPartitioning benefit more visible with larger datasets (10M+ rows)`);
    logger.production('Typical improvement: 5-10x faster for time-range queries\n');

    // Step 7: Partition maintenance
    logger.step('Step 7: Partition maintenance operations');

    logger.production('Creating new partition (for next month):');
    logger.command(`
CREATE TABLE events_2026_06 PARTITION OF events
FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
    `.trim());

    logger.production('\nDropping old partition (archival):');
    logger.command('-- Option 1: Drop entirely');
    logger.command('DROP TABLE events_2025_01;');
    logger.command('\n-- Option 2: Detach and archive');
    logger.command('ALTER TABLE events DETACH PARTITION events_2025_01;');
    logger.command('-- Now events_2025_01 is standalone table, can be archived to S3\n');

    logger.production('Production partition maintenance:');
    logger.production('- Cron job: Create next month partition on 25th of current month');
    logger.production('- Retention policy: Drop partitions older than 90 days');
    logger.production('- Archive before drop: Export to S3/data warehouse');
    logger.production('- Monitor partition sizes: Alert if partition > 100GB\n');

    // Step 8: Indexes on partitions
    logger.step('Step 8: Indexing partitioned tables');

    logger.production('Create index on parent table (applied to all partitions):');
    await client.query(`
      CREATE INDEX idx_events_user_id ON events(user_id)
    `);
    logger.command('CREATE INDEX idx_events_user_id ON events(user_id)');
    logger.production('Automatically creates index on each partition and future partitions\n');

    // Show indexes on partitions
    const partitionIndexes = await client.query(`
      SELECT
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE tablename LIKE 'events_2026_05%'
      ORDER BY tablename, indexname
    `);
    logger.command('Show indexes on events_2026_05 partition:');
    for (const row of partitionIndexes.rows) {
      logger.info(`  ${row.indexname} on ${row.tablename}`);
    }

    logger.production('\nIndex considerations:');
    logger.production('- Indexes on parent apply to all partitions');
    logger.production('- Each partition has its own index (smaller, faster)');
    logger.production('- Create partition-specific indexes if needed');
    logger.production('- REINDEX partition individually (less locking)\n');

    // Step 9: When to partition
    logger.step('Step 9: When to use table partitioning');

    logger.production('Partitioning helps with:');
    logger.production('✓ Time-series data (logs, events, metrics)');
    logger.production('✓ Large tables (>100GB) with predictable access patterns');
    logger.production('✓ Retention policies (drop old partitions)');
    logger.production('✓ Query performance on specific ranges');
    logger.production('✓ Maintenance operations (VACUUM, REINDEX per partition)');

    logger.production('\nPartitioning does NOT help with:');
    logger.production('✗ Small tables (<10GB) - overhead not worth it');
    logger.production('✗ Unpredictable query patterns (scans all partitions)');
    logger.production('✗ Write scaling to multiple nodes (need sharding)');
    logger.production('✗ Uniform data distribution (no hot partitions)');

    logger.production('\nPartitioning strategies:');
    logger.production('- RANGE: Time-series (created_at), sequential IDs');
    logger.production('- LIST: Categories (region, status, tenant)');
    logger.production('- HASH: Uniform distribution (user_id % N) - PostgreSQL 11+\n');

    // Step 10: Sharding concepts
    logger.step('Step 10: Sharding for horizontal write scaling');
    logger.production('Partitioning = single database, sharding = multiple databases');

    logger.production('\nSharding strategies:');
    logger.production('1. By User ID: Users 1-100K → DB1, 100K-200K → DB2');
    logger.production('   - Pros: Good distribution, user queries hit one shard');
    logger.production('   - Cons: Cross-shard queries difficult, rebalancing hard');

    logger.production('\n2. By Tenant: Company A → DB1, Company B → DB2');
    logger.production('   - Pros: Isolation, easy to reason about, simple backups');
    logger.production('   - Cons: Uneven distribution (big tenants), no multi-tenant queries');

    logger.production('\n3. By Geography: US → DB1, EU → DB2, APAC → DB3');
    logger.production('   - Pros: Data locality, compliance (GDPR), lower latency');
    logger.production('   - Cons: Uneven load, cross-region queries expensive');

    logger.production('\n4. By Time + Shard: Jan/Shard1, Jan/Shard2, Feb/Shard1, Feb/Shard2');
    logger.production('   - Pros: Combines benefits of partitioning and sharding');
    logger.production('   - Cons: Complex to manage, need good tooling\n');

    logger.production('Sharding trade-offs:');
    logger.production('- Complexity: Application routing, shard management');
    logger.production('- Transactions: No cross-shard ACID transactions');
    logger.production('- Joins: Cross-shard joins very slow or impossible');
    logger.production('- Rebalancing: Moving data between shards is complex');
    logger.production('- Operational: N databases to monitor, backup, maintain');

    logger.production('\nWhen to shard:');
    logger.production('- Write throughput > 10K/sec (single Postgres bottleneck)');
    logger.production('- Dataset size > 1TB (replication expensive)');
    logger.production('- After exhausting: Indexing, partitioning, read replicas, caching');
    logger.production('- Query patterns allow it (tenant-scoped, user-scoped)\n');

    // Step 11: Connection pooling
    logger.step('Step 11: Connection pooling for write performance');

    logger.production('Why connection pooling matters:');
    logger.production('- PostgreSQL process per connection = expensive (memory overhead)');
    logger.production('- Connection setup: 5-10ms overhead per connection');
    logger.production('- max_connections default: 100 (limited)');
    logger.production('- Connection pool: Reuse connections, reduce overhead');

    logger.production('\nPgBouncer modes:');
    logger.production('1. Session mode: Client owns connection for session duration');
    logger.production('   - Pros: All PostgreSQL features work');
    logger.production('   - Cons: Less connection reuse');

    logger.production('\n2. Transaction mode (recommended):');
    logger.production('   - Connection returned to pool after transaction');
    logger.production('   - Pros: High connection reuse, handle 1000s of clients');
    logger.production('   - Cons: No prepared statements across transactions');

    logger.production('\n3. Statement mode: Connection per statement');
    logger.production('   - Pros: Maximum reuse');
    logger.production('   - Cons: No transactions, very limited use case');

    logger.production('\nPgBouncer configuration example:');
    logger.command(`
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
    `.trim());

    logger.production('\nConnection pool sizing:');
    logger.production('- default_pool_size = CPU cores * 2 (start here)');
    logger.production('- Monitor: connection wait time, pool saturation');
    logger.production('- Scale up if: high wait time, low CPU utilization');
    logger.production('- Scale down if: high CPU, many idle connections\n');

    // Step 12: Write throughput limits
    logger.step('Step 12: PostgreSQL write throughput limits');

    logger.production('Single-node write limits:');
    logger.production('- Sequential writes: ~5K writes/sec per core');
    logger.production('- With proper indexes: ~3K writes/sec per core (index overhead)');
    logger.production('- Batch writes: ~20K writes/sec per core (less overhead)');
    logger.production('- Total: 8-core server = 24K-40K writes/sec (realistic)');

    logger.production('\nBottlenecks:');
    logger.production('- WAL (write-ahead log) fsync: Disk I/O bottleneck');
    logger.production('- Index updates: CPU bound (B-tree modifications)');
    logger.production('- Lock contention: Hot rows/tables reduce throughput');
    logger.production('- Checkpoint frequency: Spikes in I/O usage');

    logger.production('\nOptimizations:');
    logger.production('- synchronous_commit = off (async, faster, small data loss risk)');
    logger.production('- commit_delay = 10 microseconds (group commits)');
    logger.production('- wal_buffers = 16MB (buffer WAL writes)');
    logger.production('- checkpoint_timeout = 15min (reduce checkpoint frequency)');
    logger.production('- Use SSD/NVMe for WAL (low latency critical)');
    logger.production('- Batch writes (shown earlier)');
    logger.production('- Remove unnecessary indexes (reduce overhead)\n');

    logger.production('\nProduction Considerations:');
    logger.production('\nMonitoring write performance:');
    logger.production('- Track: writes/sec, transaction latency, WAL generation rate');
    logger.production('- Alert: Transaction latency p95 > 100ms');
    logger.production('- Alert: WAL generation > 1GB/min (high write load)');
    logger.production('- Dashboard: Show writes/sec over time, identify spikes');

    logger.production('\nCapacity planning:');
    logger.production('- Load test: Benchmark write throughput before production');
    logger.production('- Headroom: Run at 60-70% capacity (handle spikes)');
    logger.production('- Scaling plan: Know when to add replicas (reads) vs shard (writes)');

    logger.production('\nBackup considerations:');
    logger.production('- Partitioned tables: Backup per partition (parallel, faster)');
    logger.production('- WAL archiving: Enable for point-in-time recovery');
    logger.production('- pg_dump: Can backup single partitions (e.g., current month)');
    logger.production('- Continuous archival: Archive old partitions to S3/Glacier\n');

    logger.success('✓ Write scaling, partitioning, and batching strategies demonstrated!');

    // Cleanup
    await client.query('DROP TABLE IF EXISTS events CASCADE');
    await client.query('DROP TABLE IF EXISTS events_baseline CASCADE');
  },
};
