import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const partitioningStrategyExample: CassandraExample = {
  name: 'Partitioning Strategy: Cardinality & Distribution',
  description: 'How to design partition keys for even data distribution',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('🎯 Cassandra Example: Partitioning Strategy');
    logger.info('Partition key cardinality and consistent hashing\n');

    // Create keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS partition_demo
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);

    // BAD EXAMPLE: Low cardinality partition key
    logger.step('BAD Example: Low cardinality partition key');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS partition_demo.user_actions_bad (
        app_name TEXT,
        user_id UUID,
        action_time TIMESTAMP,
        action_type TEXT,
        PRIMARY KEY (app_name, user_id, action_time)
      )
    `);
    logger.command('CREATE TABLE user_actions_bad (PRIMARY KEY (app_name, user_id, action_time))');
    logger.warning('Problem: If app_name is always "myapp", ALL data goes to 1 partition');
    logger.warning('Result: Single node becomes hot spot, other nodes idle');
    logger.warning('Throughput: Limited to 1 node\'s capacity (~10k writes/sec)');
    logger.info('');

    // Insert data showing the problem
    const userId1 = types.Uuid.random();
    const userId2 = types.Uuid.random();
    await client.execute(
      'INSERT INTO partition_demo.user_actions_bad (app_name, user_id, action_time, action_type) VALUES (?, ?, ?, ?)',
      ['myapp', userId1, new Date(), 'login'],
      { prepare: true }
    );
    await client.execute(
      'INSERT INTO partition_demo.user_actions_bad (app_name, user_id, action_time, action_type) VALUES (?, ?, ?, ?)',
      ['myapp', userId2, new Date(), 'page_view'],
      { prepare: true }
    );
    logger.command('INSERT 2 actions with app_name="myapp"', 'Both go to same partition');
    logger.warning('In production: 1M users * 100 actions = 100M rows in ONE partition\n');

    // GOOD EXAMPLE: High cardinality partition key
    logger.step('GOOD Example: High cardinality partition key');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS partition_demo.user_actions_good (
        user_id UUID,
        action_time TIMESTAMP,
        action_type TEXT,
        app_name TEXT,
        PRIMARY KEY (user_id, action_time)
      )
    `);
    logger.command('CREATE TABLE user_actions_good (PRIMARY KEY (user_id, action_time))');
    logger.success('Fix: Use user_id as partition key (millions of unique values)');
    logger.success('Result: Data distributed evenly across ALL nodes');
    logger.success('Throughput: Scales with cluster size (10k writes/sec PER node)');
    logger.info('');

    // Insert data showing the fix
    await client.execute(
      'INSERT INTO partition_demo.user_actions_good (user_id, action_time, action_type, app_name) VALUES (?, ?, ?, ?)',
      [userId1, new Date(), 'login', 'myapp'],
      { prepare: true }
    );
    await client.execute(
      'INSERT INTO partition_demo.user_actions_good (user_id, action_time, action_type, app_name) VALUES (?, ?, ?, ?)',
      [userId2, new Date(), 'page_view', 'myapp'],
      { prepare: true }
    );
    logger.command('INSERT 2 actions with different user_ids', 'Distributed across nodes');
    logger.info('Query pattern: "Give me all actions for user X" (efficient)');
    logger.info('Trade-off: Can\'t efficiently query "all actions across all users"\n');

    // BETTER EXAMPLE: Bucketing for unbounded growth
    logger.step('BETTER Example: Bucketing for unbounded growth');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS partition_demo.sensor_readings (
        sensor_id UUID,
        bucket DATE,
        reading_time TIMESTAMP,
        temperature DECIMAL,
        humidity DECIMAL,
        PRIMARY KEY ((sensor_id, bucket), reading_time)
      ) WITH CLUSTERING ORDER BY (reading_time DESC)
    `);
    logger.command('CREATE TABLE sensor_readings (PRIMARY KEY ((sensor_id, bucket), reading_time))');
    logger.success('Enhancement: Partition by (sensor_id, bucket) to bound partition size');
    logger.info('Why: Sensor generates readings forever → unbounded partition');
    logger.info('Solution: Bucket by day/month to cap partition size');
    logger.info('');

    // Demonstrate bucketing
    const sensorId = types.Uuid.random();
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // Insert readings across multiple days (different partitions)
    await client.execute(
      'INSERT INTO partition_demo.sensor_readings (sensor_id, bucket, reading_time, temperature, humidity) VALUES (?, ?, ?, ?, ?)',
      [sensorId, today, new Date(), 22.5, 45.0],
      { prepare: true }
    );
    await client.execute(
      'INSERT INTO partition_demo.sensor_readings (sensor_id, bucket, reading_time, temperature, humidity) VALUES (?, ?, ?, ?, ?)',
      [sensorId, yesterday, new Date(Date.now() - 24 * 60 * 60 * 1000), 21.8, 48.0],
      { prepare: true }
    );
    logger.command('INSERT readings for today and yesterday', '2 separate partitions created');

    // Query today's readings
    const todayReadings = await client.execute(
      'SELECT temperature, humidity FROM partition_demo.sensor_readings WHERE sensor_id = ? AND bucket = ?',
      [sensorId, today],
      { prepare: true }
    );
    logger.command('SELECT * WHERE sensor_id = ? AND bucket = today', `${todayReadings.rows.length} reading(s)`);
    logger.info('Benefits:');
    logger.info('  - Each partition capped at 1 day of readings');
    logger.info('  - Old partitions can be dropped (TTL or manual cleanup)');
    logger.info('  - Predictable partition size: sensors/day * readings/hour * 24 hours');
    logger.info('  - Query "last 7 days" = read 7 partitions (parallel reads)');
    logger.info('');

    // Explain consistent hashing
    logger.step('Consistent Hashing: How Cassandra distributes data');
    logger.info('Cassandra uses consistent hashing to map partition keys to nodes:');
    logger.info('');
    logger.info('1. Hash partition key → 64-bit token');
    logger.command('hash(user_id) → token', 'e.g., -9223372036854775808 to 9223372036854775807');
    logger.info('');
    logger.info('2. Token ring divided among nodes');
    logger.info('   Node A: -9223...808 to -3074...269');
    logger.info('   Node B: -3074...270 to  3074...269');
    logger.info('   Node C:  3074...270 to  9223...807');
    logger.info('');
    logger.info('3. Virtual nodes (vnodes) for better distribution');
    logger.info('   Default: 256 vnodes per physical node');
    logger.info('   Benefit: Adding/removing nodes rebalances smoothly');
    logger.info('');

    // Demonstrate token distribution concept
    logger.production('Token Distribution Example:');
    logger.info('  Low cardinality: app_name="myapp" → same token → same node (hot spot)');
    logger.info('  High cardinality: 1M user_ids → 1M tokens → evenly spread across nodes');
    logger.info('');

    // Partition size guidelines
    logger.step('Partition Size Guidelines');
    logger.production('Best Practices:');
    logger.production('- Target: <100 MB per partition');
    logger.production('- Max: ~2 billion cells (rows × columns)');
    logger.production('- Warning signs: >100K rows per partition');
    logger.production('- Fix: Add bucketing (date, hash, counter) to partition key');
    logger.info('');

    // Calculate partition size example
    logger.info('Example calculation for sensor readings:');
    logger.info('  - 1 sensor generates 1 reading/second');
    logger.info('  - Each reading: 100 bytes');
    logger.info('  - Without bucketing: 86,400 sec/day × 100 bytes = 8.4 MB/day');
    logger.info('  - After 1 year: 3 GB partition (TOO BIG)');
    logger.info('  - With daily bucketing: 8.4 MB per partition (GOOD)');
    logger.info('');

    // Common patterns
    logger.step('Common Bucketing Patterns');
    logger.info('1. Time-based: PRIMARY KEY ((sensor_id, date), timestamp)');
    logger.info('   - Use when: Continuous data generation (logs, metrics, events)');
    logger.info('   - Bucket by: day, hour, week, month (depends on write rate)');
    logger.info('');
    logger.info('2. Hash-based: PRIMARY KEY ((user_id, bucket), created_at)');
    logger.info('   - Use when: Need to shard a single entity across partitions');
    logger.info('   - Bucket by: hash(some_field) % 10 for 10 buckets');
    logger.info('');
    logger.info('3. Counter-based: PRIMARY KEY ((channel_id, message_bucket), message_id)');
    logger.info('   - Use when: Sequential IDs (Discord messages)');
    logger.info('   - Bucket by: message_id / 10000 (10k messages per partition)');
    logger.info('');

    // Real-world example comparison
    logger.step('Real-World Comparison');
    logger.info('Discord-style chat application:');
    logger.info('');
    logger.warning('❌ BAD: PRIMARY KEY (channel_id, message_id)');
    logger.warning('   Problem: Popular channel with 10M messages = huge partition');
    logger.info('');
    logger.success('✓ GOOD: PRIMARY KEY ((channel_id, bucket), message_id)');
    logger.success('   Solution: bucket = message_id / 10000');
    logger.success('   Result: Max 10k messages per partition');
    logger.success('   Query: "Last 50 messages" reads from 1 partition (fast)');
    logger.info('');

    // Final recommendations
    logger.production('\nFinal Recommendations:');
    logger.production('1. Start with access patterns, not table structure');
    logger.production('2. Use high cardinality partition keys (user_id, sensor_id, order_id)');
    logger.production('3. Add bucketing for unbounded growth scenarios');
    logger.production('4. Monitor partition sizes in production (nodetool cfstats)');
    logger.production('5. Test with production-scale data during design phase');
  },

  async cleanup(client: Client): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS partition_demo');
  },
};
