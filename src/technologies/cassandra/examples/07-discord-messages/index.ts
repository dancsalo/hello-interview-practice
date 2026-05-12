import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const discordMessagesExample: CassandraExample = {
  name: 'Discord Messages: Bucketing Strategy',
  description: 'Real-world messaging pattern with time-based buckets and Snowflake IDs',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('💬 Cassandra Example: Discord Messages');
    logger.info('Bucketing strategy for unbounded partition growth\n');

    // Create keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS discord_demo
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);

    // Step 1: The original schema problem
    logger.step('Step 1: Original Schema (THE PROBLEM)');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS discord_demo.messages_v1 (
        channel_id BIGINT,
        message_id BIGINT,
        author_id BIGINT,
        content TEXT,
        created_at TIMESTAMP,
        PRIMARY KEY (channel_id, message_id)
      ) WITH CLUSTERING ORDER BY (message_id DESC)
    `);
    logger.command('CREATE TABLE messages_v1 (PRIMARY KEY (channel_id, message_id))');
    logger.info('');
    logger.warning('Problem: channel_id is the ONLY partition key');
    logger.warning('A busy channel accumulates messages FOREVER');
    logger.warning('');
    logger.info('Example: A popular Discord server channel:');
    logger.info('  - 1,000 messages/day');
    logger.info('  - After 1 year: 365,000 messages in ONE partition');
    logger.info('  - After 5 years: 1,825,000 messages in ONE partition');
    logger.info('  - Each message ~500 bytes = 900 MB partition (way over 100 MB limit)');
    logger.info('');
    logger.warning('Consequences:');
    logger.warning('  - Partition too large to fit in memory efficiently');
    logger.warning('  - Compaction takes longer (large SSTable segments)');
    logger.warning('  - Read latency increases over time');
    logger.warning('  - Node becomes a hot spot for popular channels\n');

    // Insert some messages to show the problem
    const channelId = BigInt(123456789);
    const authorId = BigInt(987654321);
    for (let i = 0; i < 5; i++) {
      await client.execute(
        'INSERT INTO discord_demo.messages_v1 (channel_id, message_id, author_id, content, created_at) VALUES (?, ?, ?, ?, ?)',
        [channelId, BigInt(Date.now() * 1000 + i), authorId, `Message ${i}`, new Date()],
        { prepare: true }
      );
    }
    logger.command('INSERT 5 messages into messages_v1', 'All in same partition (channel_id)');
    logger.warning('All messages for this channel live in 1 partition forever\n');

    // Step 2: Snowflake IDs
    logger.step('Step 2: Snowflake IDs (Chronologically Sortable)');
    logger.info('Discord uses Snowflake IDs for message_id (not random UUIDs):\n');
    logger.info('Structure (64 bits):');
    logger.info('  [41 bits: ms since DISCORD_EPOCH] [5: worker] [5: process] [12: sequence]');
    logger.info('');

    const DISCORD_EPOCH = 1420070400000; // Jan 1, 2015 in ms

    function makeSnowflake(timestamp: number, sequence: number = 0): bigint {
      const ms = BigInt(timestamp - DISCORD_EPOCH);
      return (ms << 22n) | BigInt(sequence);
    }

    function getTimestamp(snowflake: bigint): number {
      return Number(snowflake >> 22n) + DISCORD_EPOCH;
    }

    // Demo snowflake IDs
    const now = Date.now();
    const snowflake1 = makeSnowflake(now, 1);
    const snowflake2 = makeSnowflake(now, 2);
    const oldSnowflake = makeSnowflake(now - 15 * 24 * 60 * 60 * 1000, 1); // 15 days ago

    logger.command(`makeSnowflake(now, 1)`, `${snowflake1}`);
    logger.command(`makeSnowflake(now, 2)`, `${snowflake2}`);
    logger.info(`snowflake2 > snowflake1: ${snowflake2 > snowflake1} (chronologically ordered)`);
    logger.info('');
    logger.success('Benefits of Snowflake IDs:');
    logger.success('  - Chronologically sortable (no separate timestamp column needed)');
    logger.success('  - Unique across distributed systems (no coordination)');
    logger.success('  - Can extract timestamp from ID (for bucketing)\n');

    // Step 3: The bucketing solution
    logger.step('Step 3: Fixed Schema with 10-Day Buckets (THE SOLUTION)');

    function getBucket(snowflakeId: bigint): number {
      const timestamp = getTimestamp(snowflakeId);
      const daysSinceEpoch = Math.floor((timestamp - DISCORD_EPOCH) / (1000 * 60 * 60 * 24));
      return Math.floor(daysSinceEpoch / 10); // 10-day buckets
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS discord_demo.messages (
        channel_id BIGINT,
        bucket INT,
        message_id BIGINT,
        author_id BIGINT,
        content TEXT,
        PRIMARY KEY ((channel_id, bucket), message_id)
      ) WITH CLUSTERING ORDER BY (message_id DESC)
    `);
    logger.command('CREATE TABLE messages (PRIMARY KEY ((channel_id, bucket), message_id))');
    logger.info('');
    logger.success('Fix: Composite partition key (channel_id, bucket)');
    logger.success('Each partition = 1 channel for 10 days');
    logger.info('');
    logger.info('Bucket calculation:');
    logger.info('  bucket = floor(daysSinceDiscordEpoch / 10)');
    logger.command(`Current bucket`, `${getBucket(snowflake1)}`);
    logger.command(`15-day-old bucket`, `${getBucket(oldSnowflake)}`);
    logger.info('');
    logger.info('Partition size with bucketing:');
    logger.info('  - 1,000 messages/day * 10 days = 10,000 messages per partition');
    logger.info('  - 10,000 * 500 bytes = 5 MB per partition (well under 100 MB limit)');
    logger.info('  - Even busiest channels stay bounded\n');

    // Step 4: Insert messages across multiple buckets
    logger.step('Step 4: Messages Across Multiple Buckets');

    // Current bucket messages
    const currentBucket = getBucket(snowflake1);
    const messages: Array<{ id: bigint; bucket: number; content: string }> = [];

    for (let i = 0; i < 5; i++) {
      const msgId = makeSnowflake(now - i * 60000, i); // 1 minute apart
      const bucket = getBucket(msgId);
      messages.push({ id: msgId, bucket, content: `Recent message ${i}` });
      await client.execute(
        'INSERT INTO discord_demo.messages (channel_id, bucket, message_id, author_id, content) VALUES (?, ?, ?, ?, ?)',
        [channelId, bucket, msgId, authorId, `Recent message ${i}`],
        { prepare: true }
      );
    }

    // Older bucket messages (15 days ago)
    const olderBucket = getBucket(oldSnowflake);
    for (let i = 0; i < 3; i++) {
      const msgId = makeSnowflake(now - 15 * 24 * 60 * 60 * 1000 - i * 60000, i);
      await client.execute(
        'INSERT INTO discord_demo.messages (channel_id, bucket, message_id, author_id, content) VALUES (?, ?, ?, ?, ?)',
        [channelId, getBucket(msgId), msgId, authorId, `Old message ${i}`],
        { prepare: true }
      );
    }

    logger.command('INSERT 5 recent messages', `Bucket ${currentBucket}`);
    logger.command('INSERT 3 old messages (15 days ago)', `Bucket ${olderBucket}`);
    logger.info('Messages now span 2 partitions (2 different buckets)\n');

    // Step 5: Query most recent messages
    logger.step('Step 5: Query Most Recent Messages');
    logger.info('"Show last 50 messages" = query CURRENT bucket only\n');

    const recentMessages = await client.execute(
      'SELECT message_id, content FROM discord_demo.messages WHERE channel_id = ? AND bucket = ? LIMIT 50',
      [channelId, currentBucket],
      { prepare: true }
    );
    logger.command(
      `SELECT * FROM messages WHERE channel_id = ? AND bucket = ${currentBucket} LIMIT 50`,
      `${recentMessages.rows.length} messages`
    );
    for (const row of recentMessages.rows) {
      logger.info(`  - ${row.content}`);
    }
    logger.success('Single partition read! Fast regardless of total channel history.\n');

    // Step 6: Query older messages (scrolling back)
    logger.step('Step 6: Query Older Messages (Scrolling Back in History)');
    logger.info('User scrolls up past current bucket boundary:\n');

    const olderMessages = await client.execute(
      'SELECT message_id, content FROM discord_demo.messages WHERE channel_id = ? AND bucket = ?',
      [channelId, olderBucket],
      { prepare: true }
    );
    logger.command(
      `SELECT * FROM messages WHERE channel_id = ? AND bucket = ${olderBucket}`,
      `${olderMessages.rows.length} messages`
    );
    for (const row of olderMessages.rows) {
      logger.info(`  - ${row.content}`);
    }
    logger.info('');
    logger.info('Application logic for pagination:');
    logger.info('  1. Start with current bucket');
    logger.info('  2. If need more messages, query previous bucket (bucket - 1)');
    logger.info('  3. Merge results, return to user');
    logger.info('  4. Most users only see current bucket (90%+ of queries)\n');

    // Step 7: Partition size comparison
    logger.step('Step 7: Partition Size Comparison');
    logger.info('');
    logger.info('Schema     | Partition Key       | Partition Size (1yr) | Bounded?');
    logger.info('-----------|--------------------|--------------------|--------');
    logger.info('messages_v1| (channel_id)       | 365K msgs, 180 MB  | No (grows forever)');
    logger.info('messages   | (channel_id, bucket)| 10K msgs, 5 MB    | Yes (10 days max)');
    logger.info('');
    logger.info('Bucket size tradeoffs:');
    logger.info('  Smaller buckets (1 day): More partitions to query for history');
    logger.info('  Larger buckets (30 days): Larger partitions, fewer to query');
    logger.info('  Discord chose 10 days: Good balance for most channels');
    logger.info('');
    logger.production('How Discord determines bucket size:');
    logger.production('  - Target: <100 MB per partition');
    logger.production('  - Busiest channel: ~10K messages/day');
    logger.production('  - 10 days * 10K msgs * 500 bytes = 50 MB (under limit)');
    logger.production('  - Even the busiest channels stay manageable\n');

    // Step 8: Edge cases
    logger.step('Step 8: Edge Cases and Considerations');
    logger.info('');
    logger.info('1. Bucket boundary queries:');
    logger.info('   User requests "last 50 messages" but only 30 in current bucket');
    logger.info('   Solution: Query current bucket, if < 50, query previous bucket too');
    logger.info('');
    logger.info('2. Very quiet channels:');
    logger.info('   Channel with 1 message/week = tiny partitions (fine)');
    logger.info('   No wasted space since partitions are sparse');
    logger.info('');
    logger.info('3. Extremely busy channels:');
    logger.info('   If a channel exceeds bucket limit, consider smaller buckets');
    logger.info('   Or shard within bucket: (channel_id, bucket, shard)');
    logger.info('');
    logger.info('4. Message deletion:');
    logger.info('   Creates tombstone in specific bucket partition');
    logger.info('   Old buckets compact away tombstones after gc_grace_seconds\n');

    // Step 9: Assertions
    logger.step('Step 9: Verification');

    logger.assert(
      recentMessages.rows.length === 5,
      'Current bucket contains all 5 recent messages',
      `Expected 5 recent messages, got ${recentMessages.rows.length}`
    );

    logger.assert(
      olderMessages.rows.length === 3,
      'Older bucket contains all 3 old messages',
      `Expected 3 old messages, got ${olderMessages.rows.length}`
    );

    logger.assert(
      currentBucket !== olderBucket,
      `Messages span 2 different buckets (${currentBucket} vs ${olderBucket})`,
      'Expected different buckets for current and old messages'
    );

    logger.assert(
      snowflake2 > snowflake1,
      'Snowflake IDs are chronologically ordered',
      'Snowflake ordering failed'
    );

    logger.info('\n');
    logger.production('Key Interview Takeaways:');
    logger.production('1. Bucketing prevents unbounded partition growth');
    logger.production('2. Composite partition key: (entity_id, bucket)');
    logger.production('3. Bucket size based on write volume (target <100 MB)');
    logger.production('4. Most queries hit current bucket only (fast)');
    logger.production('5. Snowflake IDs: chronologically sortable, distributed-unique');
    logger.production('6. Real-world pattern from Discord engineering blog');
  },

  async cleanup(client: Client): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS discord_demo');
  },
};
