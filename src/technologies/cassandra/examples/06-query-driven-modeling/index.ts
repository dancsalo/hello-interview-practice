import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const queryDrivenModelingExample: CassandraExample = {
  name: 'Query-Driven Data Modeling: Denormalization',
  description: 'One table per query pattern, denormalization strategies',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('📝 Cassandra Example: Query-Driven Data Modeling');
    logger.info('Blog system with denormalized tables for each access pattern\n');

    // Create keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS blog_demo
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);

    // Step 1: Explain the problem
    logger.step('Step 1: Why Normalized Models Fail in Cassandra');
    logger.info('In relational databases, you normalize data and use JOINs:');
    logger.info('  posts(post_id, author_id, title, content, created_at)');
    logger.info('  tags(post_id, tag_name)');
    logger.info('  SELECT * FROM posts JOIN tags ON posts.post_id = tags.post_id WHERE tag_name = "cassandra"');
    logger.info('');
    logger.warning('Cassandra has NO JOINs.');
    logger.warning('Cassandra has NO efficient full-table scans.');
    logger.warning('Every query MUST provide the partition key.');
    logger.info('');
    logger.info('Solution: Create a separate table for each query pattern.\n');

    // Step 2: Show the normalized approach (anti-pattern)
    logger.step('Step 2: Normalized Approach (ANTI-PATTERN)');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS blog_demo.posts_normalized (
        post_id UUID PRIMARY KEY,
        author_id UUID,
        title TEXT,
        content TEXT,
        created_at TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE posts_normalized (post_id UUID PRIMARY KEY, ...)');
    logger.warning('Problem: Can only efficiently query by post_id (the partition key)');
    logger.warning('Cannot efficiently: "Get all posts by author X"');
    logger.warning('Cannot efficiently: "Get recent posts from today"');
    logger.warning('Cannot efficiently: "Get posts tagged with cassandra"');
    logger.info('Would need ALLOW FILTERING (full table scan) = unacceptable at scale\n');

    // Step 3: Denormalized tables
    logger.step('Step 3: Denormalized Approach (CORRECT)');

    // Table 1: Posts by author
    await client.execute(`
      CREATE TABLE IF NOT EXISTS blog_demo.posts_by_author (
        author_id UUID,
        created_at TIMESTAMP,
        post_id UUID,
        title TEXT,
        content TEXT,
        PRIMARY KEY (author_id, created_at)
      ) WITH CLUSTERING ORDER BY (created_at DESC)
    `);
    logger.command('CREATE TABLE posts_by_author (PRIMARY KEY (author_id, created_at)) WITH CLUSTERING ORDER BY (created_at DESC)');
    logger.success('Query: "Get all posts by author X, most recent first"');
    logger.info('');

    // Table 2: Posts by date
    await client.execute(`
      CREATE TABLE IF NOT EXISTS blog_demo.posts_by_date (
        date TEXT,
        created_at TIMESTAMP,
        post_id UUID,
        author_id UUID,
        title TEXT,
        content TEXT,
        PRIMARY KEY (date, created_at)
      ) WITH CLUSTERING ORDER BY (created_at DESC)
    `);
    logger.command('CREATE TABLE posts_by_date (PRIMARY KEY (date, created_at)) WITH CLUSTERING ORDER BY (created_at DESC)');
    logger.success('Query: "Get all posts from today, most recent first"');
    logger.info('');

    // Table 3: Posts by tag
    await client.execute(`
      CREATE TABLE IF NOT EXISTS blog_demo.posts_by_tag (
        tag TEXT,
        created_at TIMESTAMP,
        post_id UUID,
        author_id UUID,
        title TEXT,
        PRIMARY KEY (tag, created_at)
      ) WITH CLUSTERING ORDER BY (created_at DESC)
    `);
    logger.command('CREATE TABLE posts_by_tag (PRIMARY KEY (tag, created_at)) WITH CLUSTERING ORDER BY (created_at DESC)');
    logger.success('Query: "Get all posts with tag X, most recent first"');
    logger.info('');

    logger.info('3 tables for 3 query patterns. Same data, different organization.\n');

    // Step 4: Application writes to all tables
    logger.step('Step 4: Application Writes to Multiple Tables');
    logger.info('When creating a post, the application writes to ALL relevant tables:\n');

    const authorId = types.Uuid.random();
    const posts = [
      { title: 'Getting Started with Cassandra', tags: ['cassandra', 'nosql', 'tutorial'] },
      { title: 'Cassandra vs PostgreSQL', tags: ['cassandra', 'postgresql', 'comparison'] },
      { title: 'Time-Series Data Modeling', tags: ['cassandra', 'timeseries', 'iot'] },
    ];

    for (const post of posts) {
      const postId = types.Uuid.random();
      const createdAt = new Date(Date.now() - Math.random() * 86400000); // random time today
      const date = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

      // Write to posts_by_author
      await client.execute(
        'INSERT INTO blog_demo.posts_by_author (author_id, created_at, post_id, title, content) VALUES (?, ?, ?, ?, ?)',
        [authorId, createdAt, postId, post.title, `Content of: ${post.title}`],
        { prepare: true }
      );

      // Write to posts_by_date
      await client.execute(
        'INSERT INTO blog_demo.posts_by_date (date, created_at, post_id, author_id, title, content) VALUES (?, ?, ?, ?, ?, ?)',
        [date, createdAt, postId, authorId, post.title, `Content of: ${post.title}`],
        { prepare: true }
      );

      // Write to posts_by_tag for each tag
      for (const tag of post.tags) {
        await client.execute(
          'INSERT INTO blog_demo.posts_by_tag (tag, created_at, post_id, author_id, title) VALUES (?, ?, ?, ?, ?)',
          [tag, createdAt, postId, authorId, post.title],
          { prepare: true }
        );
      }

      logger.command(`INSERT "${post.title}"`, `Written to 2 tables + ${post.tags.length} tag entries`);
    }
    logger.info('');
    logger.info('Total writes for 3 posts: 3 (by_author) + 3 (by_date) + 8 (by_tag) = 14 writes');
    logger.warning('Write amplification: 1 logical post creation = 4-5 physical writes');
    logger.success('Trade-off: More writes, but each READ hits exactly 1 partition (fast)\n');

    // Step 5: Execute efficient queries
    logger.step('Step 5: Efficient Queries (Each Hits Single Partition)');

    // Query 1: Posts by author
    logger.info('Query 1: "Get all posts by this author"');
    const authorPosts = await client.execute(
      'SELECT title, created_at FROM blog_demo.posts_by_author WHERE author_id = ?',
      [authorId],
      { prepare: true }
    );
    logger.command('SELECT * FROM posts_by_author WHERE author_id = ?', `${authorPosts.rows.length} posts found`);
    for (const row of authorPosts.rows) {
      logger.info(`  - ${row.title}`);
    }
    logger.success('Single partition read, pre-sorted by created_at DESC\n');

    // Query 2: Posts by date
    const today = new Date().toISOString().split('T')[0];
    logger.info('Query 2: "Get all posts from today"');
    const datePosts = await client.execute(
      'SELECT title, author_id FROM blog_demo.posts_by_date WHERE date = ?',
      [today],
      { prepare: true }
    );
    logger.command(`SELECT * FROM posts_by_date WHERE date = '${today}'`, `${datePosts.rows.length} posts found`);
    logger.success('Single partition read, pre-sorted by created_at DESC\n');

    // Query 3: Posts by tag
    logger.info('Query 3: "Get all posts tagged with cassandra"');
    const tagPosts = await client.execute(
      'SELECT title, author_id FROM blog_demo.posts_by_tag WHERE tag = ?',
      ['cassandra'],
      { prepare: true }
    );
    logger.command("SELECT * FROM posts_by_tag WHERE tag = 'cassandra'", `${tagPosts.rows.length} posts found`);
    for (const row of tagPosts.rows) {
      logger.info(`  - ${row.title}`);
    }
    logger.success('Single partition read, pre-sorted by created_at DESC\n');

    // Step 6: When to use SAI vs denormalization
    logger.step('Step 6: SAI vs Denormalization Decision Matrix');
    logger.info('');
    logger.info('Approach          | Query Frequency | Performance  | Write Cost | Flexibility');
    logger.info('-----------------|-----------------|--------------|-----------|------------');
    logger.info('Denormalized table| High (hot path) | Fastest      | High      | Low');
    logger.info('SAI (Secondary)   | Low (occasional)| Good         | Low       | High');
    logger.info('ALLOW FILTERING   | Never in prod   | Terrible     | None      | Highest');
    logger.info('');
    logger.info('Guidelines:');
    logger.production('- Denormalize: Queries in critical path (user-facing, <10ms SLA)');
    logger.production('- SAI: Analytics, admin panels, infrequent queries (acceptable latency)');
    logger.production('- Never ALLOW FILTERING in production (full table scan)');
    logger.info('');
    logger.info('Example: E-commerce product catalog');
    logger.info('  - "Products by category" (user browses) = DENORMALIZE (frequent, latency-sensitive)');
    logger.info('  - "Products by price range" (admin report) = SAI (infrequent, latency-tolerant)\n');

    // Step 7: Data consistency across tables
    logger.step('Step 7: Managing Consistency Across Denormalized Tables');
    logger.info('Challenge: What if write to one table succeeds but another fails?\n');

    logger.info('Strategies:');
    logger.info('  1. Logged Batch (within same partition):');
    logger.info('     - Atomic within a single partition');
    logger.info('     - NOT recommended across partitions (performance penalty)');
    logger.info('');
    logger.info('  2. Application-level retry:');
    logger.info('     - Retry failed writes with idempotent operations');
    logger.info('     - Most common approach');
    logger.info('');
    logger.info('  3. Eventual consistency acceptance:');
    logger.info('     - Accept temporary inconsistency between tables');
    logger.info('     - Background job reconciles periodically');
    logger.info('');
    logger.info('  4. Change Data Capture (CDC):');
    logger.info('     - Write to primary table, CDC propagates to others');
    logger.info('     - Most reliable for complex pipelines\n');

    // Step 8: Assertions
    logger.step('Step 8: Verification');

    logger.assert(
      authorPosts.rows.length === 3,
      'posts_by_author: All 3 posts found for author',
      `Expected 3 posts, got ${authorPosts.rows.length}`
    );

    logger.assert(
      tagPosts.rows.length === 3,
      'posts_by_tag: All 3 posts tagged "cassandra" found',
      `Expected 3 posts with cassandra tag, got ${tagPosts.rows.length}`
    );

    logger.assert(
      datePosts.rows.length === 3,
      'posts_by_date: All 3 posts from today found',
      `Expected 3 posts today, got ${datePosts.rows.length}`
    );

    logger.info('\n');
    logger.production('Key Interview Takeaways:');
    logger.production('1. "What are the access patterns?" is the FIRST question');
    logger.production('2. One table per query pattern (denormalization is expected)');
    logger.production('3. Cassandra has NO JOINs - denormalize instead');
    logger.production('4. Write amplification is the expected cost');
    logger.production('5. Disk space is cheap, query latency is expensive');
    logger.production('6. SAI for flexibility, denormalization for performance');
  },

  async cleanup(client: Client): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS blog_demo');
  },
};
