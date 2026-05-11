import type { Client } from 'pg';
import type { Logger, PostgreSQLExample } from '../../../../lib/types.js';

export const readScalingExample: PostgreSQLExample = {
  name: 'Read Scaling: Replication & Consistency',
  description: 'Primary/replica architecture, replication lag, read-after-write consistency',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('📖 PostgreSQL Read Scaling: Replication & Consistency');
    logger.info('Social media feed with high read volume\n');

    logger.production('Architecture Overview:');
    logger.production('- PRIMARY: Handles all writes (INSERT, UPDATE, DELETE)');
    logger.production('- REPLICAS: Handle read queries (SELECT)');
    logger.production('- Replication: Asynchronous streaming replication (most common)');
    logger.production('- Trade-off: Read scalability vs consistency guarantees\n');

    // Setup: Create tables for social media posts
    logger.step('Setup: Create posts and followers tables');
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        username VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE posts (id, user_id, username, content, created_at)');

    await client.query(`
      CREATE TABLE IF NOT EXISTS followers (
        follower_id INTEGER NOT NULL,
        following_id INTEGER NOT NULL,
        PRIMARY KEY (follower_id, following_id)
      )
    `);
    logger.command('CREATE TABLE followers (follower_id, following_id)');

    // Insert sample data
    await client.query(`
      INSERT INTO followers (follower_id, following_id)
      VALUES (1, 2), (1, 3), (1, 4), (2, 3), (2, 4), (3, 4)
    `);
    logger.command('INSERT 6 follower relationships');

    const samplePosts = [
      { user_id: 2, username: 'alice', content: 'Learning about database replication!' },
      { user_id: 3, username: 'bob', content: 'Building distributed systems at scale' },
      { user_id: 4, username: 'charlie', content: 'PostgreSQL streaming replication explained' },
    ];

    for (const post of samplePosts) {
      await client.query(`
        INSERT INTO posts (user_id, username, content)
        VALUES ($1, $2, $3)
      `, [post.user_id, post.username, post.content]);
    }
    logger.command('INSERT 3 initial posts\n');

    // Simulate connection routing function
    const simulateReplicationLag = async (delayMs: number) => {
      return new Promise((resolve) => setTimeout(resolve, delayMs));
    };

    logger.step('Step 1: Read from replica (normal case - no lag)');
    logger.production('Application routes feed queries to read replicas');

    // Simulate reading feed from replica
    const feedQuery = `
      SELECT p.id, p.username, p.content, p.created_at
      FROM posts p
      JOIN followers f ON p.user_id = f.following_id
      WHERE f.follower_id = $1
      ORDER BY p.created_at DESC
      LIMIT 10
    `;

    const feed = await client.query(feedQuery, [1]); // User 1's feed
    logger.command('SELECT posts FROM replica WHERE follower_id = 1');
    logger.command('Result:', JSON.stringify(feed.rows, null, 2));
    logger.assert(feed.rows.length === 3, 'User sees 3 posts from followed users');
    logger.production('Replica handles read with no issues when caught up\n');

    // Step 2: Demonstrate replication lag issue
    logger.step('Step 2: Read-after-write consistency problem');
    logger.production('Scenario: User posts content, then immediately views their feed');

    // Write to primary
    const newPostResult = await client.query(`
      INSERT INTO posts (user_id, username, content)
      VALUES ($1, $2, $3)
      RETURNING id, created_at
    `, [1, 'current_user', 'Just posted this amazing content!']);
    const newPostId = newPostResult.rows[0].id;
    logger.command('PRIMARY: INSERT new post (id=' + newPostId + ') by current_user');
    logger.production('Write succeeds on primary immediately');

    // Simulate replication lag (replica hasn't caught up yet)
    logger.production('Simulating replication lag: 200ms');
    const replicaLagMs = 200;
    await simulateReplicationLag(replicaLagMs);

    // Try to read from replica before replication completes
    const immediateRead = await client.query(`
      SELECT id, username, content
      FROM posts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [1]);
    logger.command('REPLICA: SELECT latest post by current_user');

    if (immediateRead.rows.length === 0 || immediateRead.rows[0].id !== newPostId) {
      logger.warning('⚠️  User does NOT see their own post!');
      logger.production('Read-after-write inconsistency: Post exists on primary but not yet on replica');
    } else {
      logger.command('Result:', JSON.stringify(immediateRead.rows[0], null, 2));
    }

    logger.production('\nProduction Reality:');
    logger.production('- Typical replication lag: 10-100ms (synchronous), 100ms-1s (asynchronous)');
    logger.production('- Under load: Can spike to seconds or minutes');
    logger.production('- Network partitions: Can cause extended lag or divergence\n');

    // Step 3: Solution 1 - Read from primary after write
    logger.step('Step 3: Solution 1 - Read from primary after write');
    logger.production('Strategy: Route user\'s own queries to primary for 1-2 seconds after write');

    await client.query(`
      INSERT INTO posts (user_id, username, content)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [1, 'current_user', 'Another post with consistent read']);
    logger.command('PRIMARY: INSERT new post by current_user');

    // Read from primary instead of replica
    const primaryRead = await client.query(`
      SELECT id, username, content, created_at
      FROM posts
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [1]);
    logger.command('PRIMARY: SELECT latest post (read from primary, not replica)');
    logger.command('Result:', JSON.stringify(primaryRead.rows[0], null, 2));
    logger.assert(primaryRead.rows.length > 0, '✓ User sees their own post immediately');

    logger.production('\nImplementation Pattern:');
    logger.production('- Set cookie/session flag: last_write_timestamp');
    logger.production('- If (now - last_write_timestamp) < 1000ms: route to primary');
    logger.production('- Else: route to replica');
    logger.production('- Trade-off: Reduces replica load reduction, but guarantees consistency\n');

    // Step 4: Solution 2 - Session/sticky routing
    logger.step('Step 4: Solution 2 - Sticky sessions to replica');
    logger.production('Strategy: Route user to same replica that has their writes');

    logger.production('Approach:');
    logger.production('- Primary forwards write metadata to specific replica');
    logger.production('- Application routes user to that specific replica');
    logger.production('- Requires replica to have caught up before responding');
    logger.production('- Complex: Needs coordination between primary and replicas\n');

    // Step 5: Monitor replication lag
    logger.step('Step 5: Monitoring replication lag (simulation)');
    logger.production('Production: Query pg_stat_replication on primary');

    logger.command('-- On PRIMARY, check replication status:');
    logger.command(`
SELECT
  client_addr,
  state,
  sync_state,
  EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag_seconds
FROM pg_stat_replication;
    `.trim());

    logger.production('\nKey metrics:');
    logger.production('- lag_seconds: How far behind replica is');
    logger.production('- sync_state: async (most common) or sync (slower, consistent)');
    logger.production('- state: streaming (good) or catchup (recovering)');

    const simulatedLag = 0.150; // 150ms
    logger.production(`\nSimulated replication lag: ${simulatedLag}s`);
    if (simulatedLag > 0.5) {
      logger.warning('⚠️  High replication lag detected!');
      logger.production('Action: Alert on-call engineer, investigate replica health');
    } else {
      logger.success('✓ Replication lag within acceptable range\n');
    }

    // Step 6: Demonstrate failover scenario
    logger.step('Step 6: Failover scenario (conceptual)');
    logger.production('What happens when primary fails?');

    logger.production('\nAutomatic Failover Process:');
    logger.production('1. Health check detects primary is down');
    logger.production('2. Select replica with least lag (most up-to-date)');
    logger.production('3. Promote replica to primary (pg_ctl promote)');
    logger.production('4. Update DNS/load balancer to point to new primary');
    logger.production('5. Other replicas reconfigure to stream from new primary');
    logger.production('6. Application reconnects to new primary');

    logger.production('\nFailover Timing:');
    logger.production('- Detection: 5-30 seconds (health check frequency)');
    logger.production('- Promotion: 1-5 seconds (pg_ctl promote)');
    logger.production('- DNS propagation: 30-60 seconds (TTL dependent)');
    logger.production('- Total downtime: 30s - 2 minutes (typical)');

    logger.production('\nData Loss Risk:');
    logger.production('- Asynchronous replication: Can lose recent transactions');
    logger.production('- Synchronous replication: No data loss, but higher latency');
    logger.production('- Trade-off: Performance vs durability\n');

    // Step 7: Advanced patterns
    logger.step('Step 7: Advanced consistency patterns');

    logger.production('Pattern 1: Critical reads from primary');
    logger.production('- Payment confirmation: Read from primary');
    logger.production('- Account balance: Read from primary');
    logger.production('- Social feed: Read from replica (eventual consistency OK)');

    logger.production('\nPattern 2: Quorum reads');
    logger.production('- Read from multiple replicas, return when N agree');
    logger.production('- Higher consistency, but more latency and load');

    logger.production('\nPattern 3: Version vectors/causal consistency');
    logger.production('- Client tracks last write version');
    logger.production('- Only read from replica with >= that version');
    logger.production('- Requires application-level tracking\n');

    // Step 8: When replication isn't enough
    logger.step('Step 8: When to consider sharding');
    logger.production('Vertical scaling limits of replication:');

    logger.production('\nReplication helps with:');
    logger.production('✓ Read scaling (multiple replicas)');
    logger.production('✓ Geographic distribution (replicas in different regions)');
    logger.production('✓ High availability (failover to replica)');

    logger.production('\nReplication does NOT help with:');
    logger.production('✗ Write scaling (single primary bottleneck)');
    logger.production('✗ Dataset size > RAM (all nodes have full copy)');
    logger.production('✗ Hot partitions (all writes to single primary)');

    logger.production('\nConsider sharding when:');
    logger.production('- Write throughput exceeds single node capacity (>10K writes/sec)');
    logger.production('- Dataset size makes replication expensive (>1TB)');
    logger.production('- Query patterns allow partitioning (e.g., by user_id, region)');
    logger.production('- Need better write scalability than read scalability\n');

    logger.production('\nProduction Considerations:');
    logger.production('\nReplication Configuration:');
    logger.production('- wal_level = replica (required for streaming replication)');
    logger.production('- max_wal_senders = 10 (max concurrent replicas)');
    logger.production('- wal_keep_size = 1GB (prevent WAL deletion during lag)');
    logger.production('- hot_standby = on (allow reads on replicas)');

    logger.production('\nConnection Pooling:');
    logger.production('- Separate pools for primary (writes) and replicas (reads)');
    logger.production('- PgBouncer/connection pooler in transaction mode');
    logger.production('- Monitor pool saturation (active connections / max connections)');

    logger.production('\nLoad Balancing:');
    logger.production('- HAProxy/AWS NLB for replica connection distribution');
    logger.production('- Health checks to remove lagging replicas from pool');
    logger.production('- Weighted routing based on replica capacity');

    logger.production('\nMonitoring & Alerting:');
    logger.production('- Alert if replication lag > 1 second for 1 minute');
    logger.production('- Alert if replica count < N (availability concern)');
    logger.production('- Track query latency distribution (p50, p95, p99)');
    logger.production('- Monitor primary CPU/IO saturation');

    logger.production('\nFailover Strategies:');
    logger.production('- Manual failover: DBA-triggered, low risk, slower');
    logger.production('- Automatic failover: Fast, but risk of split-brain');
    logger.production('- Use consensus systems (etcd, Patroni) to prevent split-brain');
    logger.production('- Test failover regularly (chaos engineering)\n');

    logger.success('✓ Read scaling and replication concepts demonstrated!');

    // Cleanup
    await client.query('DROP TABLE IF EXISTS posts CASCADE');
    await client.query('DROP TABLE IF EXISTS followers CASCADE');
  },
};
