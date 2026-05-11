import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const primaryKeyDesignExample: CassandraExample = {
  name: 'Primary Key Design: Partition & Clustering Keys',
  description: 'The MOST critical Cassandra concept for interviews',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('🔑 Cassandra Example: Primary Key Design');
    logger.info('Partition keys, clustering keys, and query patterns\n');

    // Create keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS pk_demo
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);

    // Example 1: Simple primary key
    logger.step('Example 1: Simple primary key - PRIMARY KEY (user_id)');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS pk_demo.users_simple (
        user_id UUID PRIMARY KEY,
        name TEXT,
        email TEXT
      )
    `);
    logger.command('CREATE TABLE users_simple (user_id UUID PRIMARY KEY, ...)');

    const user1 = types.Uuid.random();
    await client.execute(
      'INSERT INTO pk_demo.users_simple (user_id, name, email) VALUES (?, ?, ?)',
      [user1, 'Alice', 'alice@example.com'],
      { prepare: true }
    );
    logger.command('INSERT INTO users_simple ...', 'Alice inserted');

    // Query that works
    const result1 = await client.execute(
      'SELECT * FROM pk_demo.users_simple WHERE user_id = ?',
      [user1],
      { prepare: true }
    );
    logger.command('SELECT * WHERE user_id = ?', '✓ Works (partition key lookup)');
    logger.assert(result1.rows.length === 1, 'Simple primary key lookup works');
    logger.info('');

    // Example 2: Compound partition key
    logger.step('Example 2: Compound partition key - PRIMARY KEY ((tenant_id, user_id))');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS pk_demo.users_compound (
        tenant_id UUID,
        user_id UUID,
        name TEXT,
        email TEXT,
        PRIMARY KEY ((tenant_id, user_id))
      )
    `);
    logger.command('CREATE TABLE users_compound (PRIMARY KEY ((tenant_id, user_id)))');

    const tenant1 = types.Uuid.random();
    await client.execute(
      'INSERT INTO pk_demo.users_compound (tenant_id, user_id, name, email) VALUES (?, ?, ?, ?)',
      [tenant1, user1, 'Alice', 'alice@example.com'],
      { prepare: true }
    );
    logger.command('INSERT INTO users_compound ...', 'Alice inserted with tenant_id');

    // Query that works
    const result2 = await client.execute(
      'SELECT * FROM pk_demo.users_compound WHERE tenant_id = ? AND user_id = ?',
      [tenant1, user1],
      { prepare: true }
    );
    logger.command('SELECT * WHERE tenant_id = ? AND user_id = ?', '✓ Works (full partition key)');
    logger.assert(result2.rows.length === 1, 'Compound partition key lookup works');
    logger.info('Why: Data distributed by hash(tenant_id, user_id) for multi-tenancy\n');

    // Example 3: Partition + clustering keys
    logger.step('Example 3: Partition + clustering - PRIMARY KEY (user_id, created_at)');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS pk_demo.user_events (
        user_id UUID,
        created_at TIMESTAMP,
        event_type TEXT,
        event_data TEXT,
        PRIMARY KEY (user_id, created_at)
      ) WITH CLUSTERING ORDER BY (created_at DESC)
    `);
    logger.command('CREATE TABLE user_events (PRIMARY KEY (user_id, created_at)) WITH CLUSTERING ORDER BY (created_at DESC)');

    // Insert multiple events for same user
    const now = Date.now();
    await client.execute(
      'INSERT INTO pk_demo.user_events (user_id, created_at, event_type, event_data) VALUES (?, ?, ?, ?)',
      [user1, new Date(now - 3000), 'login', 'web'],
      { prepare: true }
    );
    await client.execute(
      'INSERT INTO pk_demo.user_events (user_id, created_at, event_type, event_data) VALUES (?, ?, ?, ?)',
      [user1, new Date(now - 2000), 'page_view', '/dashboard'],
      { prepare: true }
    );
    await client.execute(
      'INSERT INTO pk_demo.user_events (user_id, created_at, event_type, event_data) VALUES (?, ?, ?, ?)',
      [user1, new Date(now - 1000), 'logout', 'web'],
      { prepare: true }
    );
    logger.command('INSERT 3 events for same user', 'Events inserted with different timestamps');

    // Query with clustering key order
    const result3 = await client.execute(
      'SELECT event_type, created_at FROM pk_demo.user_events WHERE user_id = ?',
      [user1],
      { prepare: true }
    );
    logger.command('SELECT * WHERE user_id = ?', `${result3.rows.length} events (DESC order)`);
    logger.info('Events returned in DESC order (most recent first):');
    result3.rows.forEach((row, idx) => {
      logger.info(`  ${idx + 1}. ${row.event_type} at ${row.created_at}`);
    });
    logger.assert(result3.rows[0].event_type === 'logout', 'Most recent event first (DESC order)');
    logger.info('Why: Clustering key provides free sorting within partition\n');

    // Example 4: Composite partition + clustering
    logger.step('Example 4: Composite partition + clustering - PRIMARY KEY ((channel_id, bucket), message_id)');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS pk_demo.messages (
        channel_id BIGINT,
        bucket INT,
        message_id BIGINT,
        author_id BIGINT,
        content TEXT,
        PRIMARY KEY ((channel_id, bucket), message_id)
      ) WITH CLUSTERING ORDER BY (message_id DESC)
    `);
    logger.command('CREATE TABLE messages (PRIMARY KEY ((channel_id, bucket), message_id))');

    // Insert messages in same channel+bucket
    await client.execute(
      'INSERT INTO pk_demo.messages (channel_id, bucket, message_id, author_id, content) VALUES (?, ?, ?, ?, ?)',
      [1001, 100, 5000, 42, 'Hello world'],
      { prepare: true }
    );
    await client.execute(
      'INSERT INTO pk_demo.messages (channel_id, bucket, message_id, author_id, content) VALUES (?, ?, ?, ?, ?)',
      [1001, 100, 5001, 43, 'Hi there!'],
      { prepare: true }
    );
    logger.command('INSERT messages into channel 1001, bucket 100', '2 messages inserted');

    const result4 = await client.execute(
      'SELECT message_id, content FROM pk_demo.messages WHERE channel_id = ? AND bucket = ?',
      [1001, 100],
      { prepare: true }
    );
    logger.command('SELECT * WHERE channel_id = ? AND bucket = ?', `${result4.rows.length} messages`);
    logger.assert(result4.rows.length === 2, 'Messages retrieved from same partition');
    logger.info('Why: Bucketing prevents unbounded partition growth (Discord pattern)\n');

    // Show what DOESN'T work
    logger.step('Common Mistakes: Queries that FAIL');
    logger.warning('✗ SELECT * WHERE email = ? (not in primary key)');
    logger.warning('✗ SELECT * WHERE user_id = ? (missing tenant_id from compound key)');
    logger.warning('✗ SELECT * WHERE created_at > ? (missing partition key)');
    logger.info('');

    // Production considerations
    logger.production('Production Considerations:');
    logger.production('- Partition key determines which node stores the data');
    logger.production('- High cardinality partition keys = better distribution across cluster');
    logger.production('- Clustering keys provide free sorting within a partition');
    logger.production('- Query patterns MUST align with primary key design');
    logger.production('- Wrong primary key = full table scans = extremely slow');
    logger.production('- Compound partition keys useful for multi-tenancy and load distribution');
  },

  async cleanup(client: Client, logger: Logger): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS pk_demo');
  },
};
