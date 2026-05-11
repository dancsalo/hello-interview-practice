import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const timeseriesIotExample: CassandraExample = {
  name: 'Time-Series IoT: Sensor Data with TTL',
  description: 'Time-based bucketing, TTL expiration, and range queries for sensor data',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('📡 Cassandra Example: Time-Series IoT Data');
    logger.info('Sensor data with time-based buckets, TTL, and range queries\n');

    // Create keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS iot_demo
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);

    // Step 1: Schema with time-based bucketing
    logger.step('Step 1: Sensor Data Schema with Daily Buckets');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS iot_demo.sensor_data (
        sensor_id TEXT,
        date TEXT,
        reading_time TIMESTAMP,
        temperature DECIMAL,
        humidity DECIMAL,
        battery_level INT,
        PRIMARY KEY ((sensor_id, date), reading_time)
      ) WITH CLUSTERING ORDER BY (reading_time DESC)
      AND default_time_to_live = 2592000
    `);
    logger.command(
      'CREATE TABLE sensor_data (PRIMARY KEY ((sensor_id, date), reading_time)) WITH CLUSTERING ORDER BY (reading_time DESC) AND default_time_to_live = 2592000'
    );
    logger.info('');
    logger.info('Schema design decisions:');
    logger.success('  Partition key: (sensor_id, date) = one partition per sensor per day');
    logger.success('  Clustering key: reading_time DESC = most recent readings first');
    logger.success('  TTL: 2592000 seconds = 30 days automatic expiration');
    logger.info('');
    logger.info('Partition size calculation:');
    logger.info('  - 1 reading/minute = 1,440 readings/day');
    logger.info('  - Each reading ~50 bytes');
    logger.info('  - Daily partition: 1,440 * 50 = 72 KB (very small, efficient)');
    logger.info('  - 1 reading/second = 86,400 readings/day = 4.3 MB (still good)\n');

    // Step 2: Alternative bucket sizes
    logger.step('Step 2: Alternative Bucket Granularities');

    // Hourly buckets for high-frequency sensors
    await client.execute(`
      CREATE TABLE IF NOT EXISTS iot_demo.sensor_data_hourly (
        sensor_id TEXT,
        hour TEXT,
        reading_time TIMESTAMP,
        temperature DECIMAL,
        PRIMARY KEY ((sensor_id, hour), reading_time)
      ) WITH CLUSTERING ORDER BY (reading_time DESC)
    `);
    logger.command('CREATE TABLE sensor_data_hourly (PRIMARY KEY ((sensor_id, hour), reading_time))');
    logger.info('  Use when: 10+ readings/second (36K+ rows/hour)');
    logger.info('');

    // Monthly buckets for low-frequency sensors
    await client.execute(`
      CREATE TABLE IF NOT EXISTS iot_demo.sensor_data_monthly (
        sensor_id TEXT,
        month TEXT,
        reading_time TIMESTAMP,
        temperature DECIMAL,
        PRIMARY KEY ((sensor_id, month), reading_time)
      ) WITH CLUSTERING ORDER BY (reading_time DESC)
    `);
    logger.command('CREATE TABLE sensor_data_monthly (PRIMARY KEY ((sensor_id, month), reading_time))');
    logger.info('  Use when: <1 reading/hour (720 rows/month)');
    logger.info('');

    logger.info('Bucket size selection guide:');
    logger.info('  Write Rate       | Bucket   | Rows/Partition | Size');
    logger.info('  -----------------|----------|---------------|--------');
    logger.info('  10/sec           | Hourly   | 36,000        | 1.8 MB');
    logger.info('  1/sec            | Daily    | 86,400        | 4.3 MB');
    logger.info('  1/min            | Daily    | 1,440         | 72 KB');
    logger.info('  1/hour           | Monthly  | 720           | 36 KB');
    logger.info('');
    logger.production('Rule: Aim for 1K-100K rows per partition, under 100 MB\n');

    // Step 3: Insert sensor readings
    logger.step('Step 3: Insert Sensor Readings Over Multiple Days');
    const sensorId = 'sensor-temp-001';
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
    const twoDaysAgo = new Date(now.getTime() - 2 * 86400000).toISOString().split('T')[0];

    // Insert today's readings
    const todayReadings: Array<{ time: Date; temp: number; humidity: number; battery: number }> = [];
    for (let i = 0; i < 10; i++) {
      const readingTime = new Date(now.getTime() - i * 600000); // Every 10 minutes
      const temp = 22.0 + Math.random() * 3; // 22-25 degrees
      const humidity = 45.0 + Math.random() * 10; // 45-55%
      const battery = 85 - i; // Decreasing battery
      todayReadings.push({ time: readingTime, temp, humidity, battery });

      await client.execute(
        'INSERT INTO iot_demo.sensor_data (sensor_id, date, reading_time, temperature, humidity, battery_level) VALUES (?, ?, ?, ?, ?, ?)',
        [sensorId, today, readingTime, temp, humidity, battery],
        { prepare: true }
      );
    }
    logger.command(`INSERT 10 readings for today (${today})`, 'Partition: (sensor-temp-001, today)');

    // Insert yesterday's readings
    for (let i = 0; i < 8; i++) {
      const readingTime = new Date(now.getTime() - 86400000 - i * 600000);
      await client.execute(
        'INSERT INTO iot_demo.sensor_data (sensor_id, date, reading_time, temperature, humidity, battery_level) VALUES (?, ?, ?, ?, ?, ?)',
        [sensorId, yesterday, readingTime, 20.0 + Math.random() * 2, 50.0 + Math.random() * 5, 90 - i],
        { prepare: true }
      );
    }
    logger.command(`INSERT 8 readings for yesterday (${yesterday})`, 'Partition: (sensor-temp-001, yesterday)');

    // Insert 2 days ago readings
    for (let i = 0; i < 5; i++) {
      const readingTime = new Date(now.getTime() - 2 * 86400000 - i * 600000);
      await client.execute(
        'INSERT INTO iot_demo.sensor_data (sensor_id, date, reading_time, temperature, humidity, battery_level) VALUES (?, ?, ?, ?, ?, ?)',
        [sensorId, twoDaysAgo, readingTime, 19.0 + Math.random() * 2, 55.0 + Math.random() * 5, 95 - i],
        { prepare: true }
      );
    }
    logger.command(`INSERT 5 readings for 2 days ago (${twoDaysAgo})`, 'Partition: (sensor-temp-001, 2daysAgo)');
    logger.info('23 total readings across 3 partitions (3 days)\n');

    // Step 4: Query single day
    logger.step('Step 4: Query Single Day (Single Partition, Fast)');
    const todayResults = await client.execute(
      'SELECT reading_time, temperature, humidity, battery_level FROM iot_demo.sensor_data WHERE sensor_id = ? AND date = ?',
      [sensorId, today],
      { prepare: true }
    );
    logger.command(
      `SELECT * FROM sensor_data WHERE sensor_id = '${sensorId}' AND date = '${today}'`,
      `${todayResults.rows.length} readings`
    );
    logger.info('  Most recent readings (pre-sorted DESC):');
    for (const row of todayResults.rows.slice(0, 3)) {
      const time = new Date(row.reading_time).toISOString().split('T')[1].split('.')[0];
      logger.info(`    ${time}: temp=${Number(row.temperature).toFixed(1)}C, humidity=${Number(row.humidity).toFixed(1)}%, battery=${row.battery_level}%`);
    }
    logger.success('Single partition read! All today\'s data in one query.\n');

    // Step 5: Query time window within a day
    logger.step('Step 5: Range Query Within a Day (Clustering Key Range)');
    const windowStart = new Date(now.getTime() - 3600000); // 1 hour ago
    const windowEnd = now;

    const windowResults = await client.execute(
      'SELECT reading_time, temperature FROM iot_demo.sensor_data WHERE sensor_id = ? AND date = ? AND reading_time >= ? AND reading_time <= ?',
      [sensorId, today, windowStart, windowEnd],
      { prepare: true }
    );
    logger.command(
      'SELECT * WHERE sensor_id = ? AND date = ? AND reading_time >= ? AND reading_time <= ?',
      `${windowResults.rows.length} readings in last hour`
    );
    logger.success('Efficient range scan within single partition (uses clustering key order)');
    logger.info('No full partition scan needed - Cassandra jumps to start position.\n');

    // Step 6: Query date range (multiple partitions)
    logger.step('Step 6: Query Date Range (Multiple Partitions)');
    logger.info('Query last 3 days of data (spans 3 partitions):\n');

    const dates = [today, yesterday, twoDaysAgo];
    let totalRows = 0;
    for (const date of dates) {
      const dateResults = await client.execute(
        'SELECT reading_time, temperature FROM iot_demo.sensor_data WHERE sensor_id = ? AND date = ?',
        [sensorId, date],
        { prepare: true }
      );
      totalRows += dateResults.rows.length;
      logger.command(`  Query date ${date}`, `${dateResults.rows.length} readings`);
    }
    logger.info(`\n  Total: ${totalRows} readings across ${dates.length} partitions`);
    logger.info('  Application merges results from multiple partition queries');
    logger.warning('  Trade-off: Multi-day queries hit multiple partitions (still fast, just more I/O)\n');

    // Step 7: TTL demonstration
    logger.step('Step 7: TTL (Time-To-Live) for Automatic Expiration');
    logger.info('Table has default_time_to_live = 2592000 (30 days)');
    logger.info('');
    logger.info('How TTL works:');
    logger.info('  1. Each cell has an expiration timestamp');
    logger.info('  2. After TTL seconds, data becomes a tombstone');
    logger.info('  3. Compaction removes expired data permanently');
    logger.info('  4. No manual DELETE or cleanup jobs needed');
    logger.info('');

    // Insert with explicit TTL
    await client.execute(
      'INSERT INTO iot_demo.sensor_data (sensor_id, date, reading_time, temperature, humidity, battery_level) VALUES (?, ?, ?, ?, ?, ?) USING TTL 60',
      [sensorId, today, new Date(), 99.9, 99.9, 1],
      { prepare: true }
    );
    logger.command('INSERT ... USING TTL 60', 'This reading expires in 60 seconds');
    logger.info('');

    logger.info('TTL benefits for IoT:');
    logger.success('  - No operational burden (data self-cleans)');
    logger.success('  - Disk space automatically reclaimed');
    logger.success('  - Old partitions disappear entirely after TTL');
    logger.success('  - Combine with TWCS compaction for best efficiency');
    logger.info('');
    logger.info('TTL + Time-Window Compaction Strategy (TWCS):');
    logger.info('  - SSTables grouped by time window (e.g., 1 day)');
    logger.info('  - When ALL data in an SSTable expires, entire file is dropped');
    logger.info('  - No compaction needed for expired windows (most efficient)');
    logger.info('  - Ideal for IoT: write once, read recent, expire old\n');

    // Step 8: Multiple sensors
    logger.step('Step 8: Multi-Sensor Deployment');
    const sensors = ['sensor-temp-001', 'sensor-temp-002', 'sensor-humidity-001'];
    for (const sid of sensors.slice(1)) {
      for (let i = 0; i < 3; i++) {
        await client.execute(
          'INSERT INTO iot_demo.sensor_data (sensor_id, date, reading_time, temperature, humidity, battery_level) VALUES (?, ?, ?, ?, ?, ?)',
          [sid, today, new Date(now.getTime() - i * 600000), 20 + Math.random() * 5, 40 + Math.random() * 20, 90],
          { prepare: true }
        );
      }
    }
    logger.command('INSERT readings for 2 additional sensors', 'Each gets its own partition set');
    logger.info('');
    logger.info('Partition distribution:');
    logger.info('  (sensor-temp-001, 2026-05-11) -> Node A');
    logger.info('  (sensor-temp-002, 2026-05-11) -> Node B');
    logger.info('  (sensor-humidity-001, 2026-05-11) -> Node C');
    logger.success('Each sensor\'s data naturally distributes across the cluster');
    logger.info('1000 sensors * 365 days = 365,000 partitions (excellent distribution)\n');

    // Step 9: Write volume considerations
    logger.step('Step 9: Write Volume and Performance');
    logger.info('Cassandra excels at high write throughput for IoT:');
    logger.info('');
    logger.info('  Scenario: 10,000 sensors, 1 reading/second each');
    logger.info('  Write volume: 10,000 writes/second');
    logger.info('  Cassandra cluster (6 nodes): easily handles 100K+ writes/second');
    logger.info('  Each write: ~1ms (commit log + memtable)');
    logger.info('');
    logger.info('  Why it works:');
    logger.info('  - Writes are O(1) (LSM tree architecture)');
    logger.info('  - No read-before-write needed');
    logger.info('  - High cardinality partition keys (sensor_id + date)');
    logger.info('  - Data distributes evenly across cluster');
    logger.info('  - No hot partitions (each sensor is independent)');
    logger.info('');
    logger.production('Production recommendations:');
    logger.production('  - Use TWCS compaction (Time-Window Compaction Strategy)');
    logger.production('  - Set TTL matching your retention policy');
    logger.production('  - Monitor partition sizes with nodetool');
    logger.production('  - Batch writes per sensor if >10/sec (reduce coordinator load)');
    logger.production('  - Consider async writes with CL=ONE for max throughput\n');

    // Step 10: Assertions
    logger.step('Step 10: Verification');

    logger.assert(
      todayResults.rows.length === 10,
      `Today's partition has all 10 readings`,
      `Expected 10 readings today, got ${todayResults.rows.length}`
    );

    logger.assert(
      windowResults.rows.length > 0,
      'Time window range query returns results within the last hour',
      'Range query returned no results'
    );

    logger.assert(
      totalRows === 23,
      'Multi-day query returns all 23 readings across 3 partitions',
      `Expected 23 total readings, got ${totalRows}`
    );

    // Verify DESC ordering
    if (todayResults.rows.length >= 2) {
      const first = new Date(todayResults.rows[0].reading_time).getTime();
      const second = new Date(todayResults.rows[1].reading_time).getTime();
      logger.assert(
        first >= second,
        'Results are ordered by reading_time DESC (most recent first)',
        'Ordering is incorrect'
      );
    }

    logger.info('\n');
    logger.production('Key Interview Takeaways:');
    logger.production('1. Time-series is a classic Cassandra use case');
    logger.production('2. Time-based bucketing prevents unbounded partition growth');
    logger.production('3. TTL eliminates operational burden of data cleanup');
    logger.production('4. TWCS compaction drops entire expired SSTables efficiently');
    logger.production('5. Write-optimized architecture handles high ingestion rates');
    logger.production('6. Partition per sensor per time bucket = excellent distribution');
  },

  async cleanup(client: Client): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS iot_demo');
  },
};
