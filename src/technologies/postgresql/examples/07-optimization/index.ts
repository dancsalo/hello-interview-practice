import type { Client } from 'pg';
import type { Logger, PostgreSQLExample } from '../../../../lib/types.js';

export const optimizationExample: PostgreSQLExample = {
  name: 'Query Optimization: EXPLAIN, CTEs, Window Functions',
  description: 'Query planning, EXPLAIN ANALYZE, CTEs vs subqueries, window functions, N+1 problem solutions',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('⚡ PostgreSQL Query Optimization: Performance & Patterns');
    logger.info('User dashboard with orders, products, and analytics\n');

    logger.production('Query Optimization Topics:');
    logger.production('- EXPLAIN and EXPLAIN ANALYZE: Understanding query plans');
    logger.production('- N+1 query problem and solutions');
    logger.production('- CTEs (Common Table Expressions) vs subqueries');
    logger.production('- Window functions: ROW_NUMBER, RANK, LAG, LEAD');
    logger.production('- Query anti-patterns and fixes\n');

    // Setup: Create schema for user dashboard
    logger.step('Setup: Create users, orders, and products tables');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE users');

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE orders');

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        product_name VARCHAR(200) NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10, 2) NOT NULL
      )
    `);
    logger.command('CREATE TABLE order_items');

    // Insert sample data
    logger.step('Step 1: Insert sample data');

    // Insert users
    const userValues = [];
    const userParams = [];
    let userParamCount = 1;

    for (let i = 1; i <= 100; i++) {
      userValues.push(`($${userParamCount}, $${userParamCount + 1})`);
      userParams.push(`user${i}`, `user${i}@example.com`);
      userParamCount += 2;
    }

    await client.query(
      `INSERT INTO users (username, email) VALUES ${userValues.join(', ')}`,
      userParams
    );
    logger.command('INSERT 100 users');

    // Insert orders (each user has 5-15 orders)
    const orderValues = [];
    const orderParams = [];
    let orderParamCount = 1;
    const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    for (let userId = 1; userId <= 100; userId++) {
      const orderCount = 5 + Math.floor(Math.random() * 11); // 5-15 orders
      for (let j = 0; j < orderCount; j++) {
        orderValues.push(`($${orderParamCount}, $${orderParamCount + 1}, $${orderParamCount + 2})`);
        const amount = (Math.random() * 500 + 10).toFixed(2);
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        orderParams.push(userId, amount, status);
        orderParamCount += 3;
      }
    }

    await client.query(
      `INSERT INTO orders (user_id, total_amount, status) VALUES ${orderValues.join(', ')}`,
      orderParams
    );

    const orderCount = await client.query('SELECT COUNT(*) FROM orders');
    logger.command(`INSERT ${orderCount.rows[0].count} orders`);

    // Insert order items (2-5 items per order)
    const itemResult = await client.query('SELECT id FROM orders');
    const orderIds = itemResult.rows.map(r => r.id);

    const itemValues = [];
    const itemParams = [];
    let itemParamCount = 1;
    const products = ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headphones', 'Webcam', 'USB Cable', 'Desk Lamp'];

    for (const orderId of orderIds) {
      const itemCount = 2 + Math.floor(Math.random() * 4); // 2-5 items
      for (let j = 0; j < itemCount; j++) {
        itemValues.push(`($${itemParamCount}, $${itemParamCount + 1}, $${itemParamCount + 2}, $${itemParamCount + 3})`);
        const product = products[Math.floor(Math.random() * products.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = (Math.random() * 200 + 10).toFixed(2);
        itemParams.push(orderId, product, quantity, price);
        itemParamCount += 4;
      }
    }

    await client.query(
      `INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ${itemValues.join(', ')}`,
      itemParams
    );

    const itemCount = await client.query('SELECT COUNT(*) FROM order_items');
    logger.command(`INSERT ${itemCount.rows[0].count} order items`);
    logger.assert(parseInt(itemCount.rows[0].count) > 0, 'Order items inserted\n');

    // Step 2: EXPLAIN basics
    logger.step('Step 2: Understanding EXPLAIN');
    logger.production('EXPLAIN shows query execution plan WITHOUT running query');

    const explainSimple = await client.query(`
      EXPLAIN SELECT * FROM users WHERE username = 'user50'
    `);
    logger.command('EXPLAIN SELECT * FROM users WHERE username = user50');
    logger.info('Query plan:');
    for (const row of explainSimple.rows) {
      logger.info(`  ${row['QUERY PLAN']}`);
    }
    logger.production('Seq Scan = Sequential scan (full table scan) - slow for large tables\n');

    // Step 3: EXPLAIN ANALYZE
    logger.step('Step 3: EXPLAIN ANALYZE - actual execution');
    logger.production('EXPLAIN ANALYZE runs query AND shows actual timing');

    const explainAnalyze = await client.query(`
      EXPLAIN ANALYZE SELECT * FROM users WHERE username = 'user50'
    `);
    logger.command('EXPLAIN ANALYZE SELECT * FROM users WHERE username = user50');
    logger.info('Query plan with timing:');
    for (const row of explainAnalyze.rows) {
      logger.info(`  ${row['QUERY PLAN']}`);
    }
    logger.production('Shows: Planning time, Execution time, actual rows vs estimated rows\n');

    // Step 4: N+1 Query Problem
    logger.step('Step 4: N+1 Query Problem (anti-pattern)');
    logger.production('Classic mistake: One query for list, then N queries for details');

    logger.info('\nAnti-pattern: N+1 queries');
    const startN1 = Date.now();

    // Query 1: Get users
    const usersResult = await client.query('SELECT id, username FROM users LIMIT 10');

    // Query 2...N+1: Get order count for each user (BAD!)
    const userOrders = [];
    for (const user of usersResult.rows) {
      const orderCountResult = await client.query(
        'SELECT COUNT(*) FROM orders WHERE user_id = $1',
        [user.id]
      );
      userOrders.push({
        username: user.username,
        order_count: orderCountResult.rows[0].count
      });
    }

    const n1Time = Date.now() - startN1;
    logger.command(`Executed: 1 + ${usersResult.rows.length} = ${usersResult.rows.length + 1} queries`);
    logger.command(`Total time: ${n1Time}ms`);
    logger.production('Problem: Round-trip latency per query adds up (10ms * 11 queries = 110ms+)\n');

    // Step 5: N+1 Solution - JOIN
    logger.step('Step 5: Fix N+1 with JOIN');
    logger.production('Solution: Single query with JOIN and GROUP BY');

    const startJoin = Date.now();
    const joinResult = await client.query(`
      SELECT
        u.username,
        COUNT(o.id) as order_count
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.id <= 10
      GROUP BY u.id, u.username
      ORDER BY u.id
    `);
    const joinTime = Date.now() - startJoin;

    logger.command('SELECT u.username, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id');
    logger.command(`Single query time: ${joinTime}ms`);
    logger.command(`Speedup: ${Math.round(n1Time / Math.max(joinTime, 1))}x faster`);
    logger.production('Single round-trip, database does all the work efficiently\n');

    // Step 6: CTEs (Common Table Expressions)
    logger.step('Step 6: CTEs (WITH clause) for readability');
    logger.production('CTEs make complex queries readable and maintainable');

    logger.info('\nExample: User dashboard with multiple aggregations');
    const cteQuery = `
      WITH user_stats AS (
        SELECT
          user_id,
          COUNT(*) as total_orders,
          SUM(total_amount) as lifetime_value,
          AVG(total_amount) as avg_order_value
        FROM orders
        GROUP BY user_id
      ),
      recent_orders AS (
        SELECT
          user_id,
          COUNT(*) as recent_count
        FROM orders
        WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
        GROUP BY user_id
      )
      SELECT
        u.username,
        u.email,
        COALESCE(us.total_orders, 0) as total_orders,
        COALESCE(us.lifetime_value, 0) as lifetime_value,
        COALESCE(us.avg_order_value, 0) as avg_order_value,
        COALESCE(ro.recent_count, 0) as recent_orders
      FROM users u
      LEFT JOIN user_stats us ON u.id = us.user_id
      LEFT JOIN recent_orders ro ON u.id = ro.user_id
      WHERE u.id <= 5
      ORDER BY us.lifetime_value DESC NULLS LAST
    `;

    const cteResult = await client.query(cteQuery);
    logger.command('WITH user_stats AS (...), recent_orders AS (...) SELECT ...');
    logger.info('Results:');
    for (const row of cteResult.rows) {
      logger.info(`  ${row.username}: ${row.total_orders} orders, $${parseFloat(row.lifetime_value).toFixed(2)} lifetime value`);
    }
    logger.production('\nCTE benefits:');
    logger.production('- Break complex query into logical steps');
    logger.production('- Reusable: Reference CTE multiple times');
    logger.production('- Readable: Each CTE has a descriptive name\n');

    // Step 7: CTEs vs Subqueries
    logger.step('Step 7: CTEs vs Subqueries - when to use each');

    logger.production('CTEs (WITH):');
    logger.production('✓ Better readability for complex queries');
    logger.production('✓ Can reference same CTE multiple times');
    logger.production('✓ PostgreSQL 12+: Can be inlined or materialized');
    logger.production('✗ Not always optimized (older versions materialize)');

    logger.production('\nSubqueries:');
    logger.production('✓ Simpler for one-off computations');
    logger.production('✓ Optimizer can inline and optimize better');
    logger.production('✗ Hard to read when nested deeply');
    logger.production('✗ Cannot reference multiple times\n');

    logger.info('Example: Subquery in WHERE clause');
    const subqueryResult = await client.query(`
      SELECT username, email
      FROM users
      WHERE id IN (
        SELECT user_id
        FROM orders
        GROUP BY user_id
        HAVING COUNT(*) > 10
      )
      LIMIT 5
    `);
    logger.command('SELECT * FROM users WHERE id IN (SELECT user_id FROM orders HAVING COUNT(*) > 10)');
    logger.command(`Found ${subqueryResult.rows.length} power users (>10 orders)`);
    logger.production('Subquery works well here: used once, simple logic\n');

    // Step 8: Window Functions - ROW_NUMBER
    logger.step('Step 8: Window Functions - Rankings and Partitions');
    logger.production('Window functions: Compute values across row sets WITHOUT GROUP BY');

    logger.info('\nROW_NUMBER: Rank orders within each user');
    const windowRank = await client.query(`
      SELECT
        user_id,
        id as order_id,
        total_amount,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total_amount DESC) as rank
      FROM orders
      WHERE user_id <= 3
      ORDER BY user_id, rank
    `);
    logger.command('SELECT user_id, total_amount, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total_amount DESC)');
    logger.info('Top orders per user:');
    for (const row of windowRank.rows) {
      if (row.rank <= 3) {
        logger.info(`  User ${row.user_id}, Order ${row.order_id}: $${parseFloat(row.total_amount).toFixed(2)} (rank ${row.rank})`);
      }
    }
    logger.production('\nROW_NUMBER vs RANK:');
    logger.production('- ROW_NUMBER: Always unique (1, 2, 3, 4, ...)');
    logger.production('- RANK: Ties get same rank (1, 2, 2, 4, ...)');
    logger.production('- DENSE_RANK: No gaps in ranking (1, 2, 2, 3, ...)\n');

    // Step 9: Window Functions - LAG/LEAD
    logger.step('Step 9: Window Functions - LAG and LEAD');
    logger.production('LAG/LEAD: Access previous/next row values');

    logger.info('\nExample: Track order-over-order growth per user');
    const windowLag = await client.query(`
      SELECT
        user_id,
        id as order_id,
        total_amount,
        LAG(total_amount) OVER (PARTITION BY user_id ORDER BY created_at) as previous_amount,
        total_amount - LAG(total_amount) OVER (PARTITION BY user_id ORDER BY created_at) as amount_change
      FROM orders
      WHERE user_id = 1
      ORDER BY created_at
      LIMIT 5
    `);
    logger.command('SELECT total_amount, LAG(total_amount) OVER (PARTITION BY user_id ORDER BY created_at)');
    logger.info('Order progression for User 1:');
    for (const row of windowLag.rows) {
      if (row.previous_amount) {
        const change = parseFloat(row.amount_change);
        const changeStr = change >= 0 ? `+$${change.toFixed(2)}` : `-$${Math.abs(change).toFixed(2)}`;
        logger.info(`  Order ${row.order_id}: $${parseFloat(row.total_amount).toFixed(2)} (${changeStr} vs previous)`);
      } else {
        logger.info(`  Order ${row.order_id}: $${parseFloat(row.total_amount).toFixed(2)} (first order)`);
      }
    }
    logger.production('\nCommon window functions:');
    logger.production('- ROW_NUMBER, RANK, DENSE_RANK: Rankings');
    logger.production('- LAG, LEAD: Previous/next row values');
    logger.production('- SUM/AVG/COUNT OVER: Running aggregations');
    logger.production('- FIRST_VALUE, LAST_VALUE: First/last in partition\n');

    // Step 10: Window Functions - Running Total
    logger.step('Step 10: Window Functions - Running Aggregations');

    logger.info('\nExample: Running total of order amounts');
    const windowSum = await client.query(`
      SELECT
        user_id,
        id as order_id,
        total_amount,
        SUM(total_amount) OVER (
          PARTITION BY user_id
          ORDER BY created_at
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) as running_total
      FROM orders
      WHERE user_id = 1
      ORDER BY created_at
      LIMIT 5
    `);
    logger.command('SELECT total_amount, SUM(total_amount) OVER (PARTITION BY user_id ORDER BY created_at)');
    logger.info('Running total for User 1:');
    for (const row of windowSum.rows) {
      logger.info(`  Order ${row.order_id}: $${parseFloat(row.total_amount).toFixed(2)} (total: $${parseFloat(row.running_total).toFixed(2)})`);
    }
    logger.production('\nWindow frame clauses:');
    logger.production('- ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW: Running total');
    logger.production('- ROWS BETWEEN 2 PRECEDING AND CURRENT ROW: Moving average (last 3 rows)');
    logger.production('- ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING: Remaining sum\n');

    // Step 11: Index usage verification
    logger.step('Step 11: Verify index usage with EXPLAIN');
    logger.production('Use EXPLAIN to ensure indexes are being used');

    logger.info('\nBefore index: Seq Scan');
    const explainBeforeIndex = await client.query(`
      EXPLAIN SELECT * FROM orders WHERE user_id = 50
    `);
    logger.command('EXPLAIN SELECT * FROM orders WHERE user_id = 50');
    for (const row of explainBeforeIndex.rows) {
      logger.info(`  ${row['QUERY PLAN']}`);
    }

    logger.info('\nCreate index on user_id:');
    await client.query('CREATE INDEX idx_orders_user_id ON orders(user_id)');
    logger.command('CREATE INDEX idx_orders_user_id ON orders(user_id)');

    const explainAfterIndex = await client.query(`
      EXPLAIN SELECT * FROM orders WHERE user_id = 50
    `);
    logger.command('EXPLAIN SELECT * FROM orders WHERE user_id = 50');
    for (const row of explainAfterIndex.rows) {
      logger.info(`  ${row['QUERY PLAN']}`);
    }
    logger.production('Index Scan or Bitmap Index Scan = index is being used ✓\n');

    // Step 12: Query anti-patterns
    logger.step('Step 12: Common Query Anti-patterns');

    logger.production('Anti-pattern 1: SELECT *');
    logger.production('✗ SELECT * FROM orders (fetches all columns)');
    logger.production('✓ SELECT id, total_amount FROM orders (only needed columns)');
    logger.production('Impact: Network bandwidth, memory usage\n');

    logger.production('Anti-pattern 2: No WHERE clause');
    logger.production('✗ SELECT * FROM orders (full table scan)');
    logger.production('✓ SELECT * FROM orders WHERE user_id = 50 (filtered)');
    logger.production('Impact: Slow queries, database load\n');

    logger.production('Anti-pattern 3: OR in WHERE (can\'t use index)');
    logger.production('✗ WHERE user_id = 1 OR user_id = 2 (can\'t use index efficiently)');
    logger.production('✓ WHERE user_id IN (1, 2) (uses index)');
    logger.production('Impact: Full table scan vs index scan\n');

    logger.production('Anti-pattern 4: Function on indexed column');
    logger.production('✗ WHERE LOWER(username) = \'user50\' (can\'t use index)');
    logger.production('✓ WHERE username = \'user50\' (uses index)');
    logger.production('Fix: Create functional index: CREATE INDEX ON users(LOWER(username))\n');

    logger.production('Anti-pattern 5: OFFSET for pagination');
    logger.production('✗ SELECT * FROM orders OFFSET 10000 LIMIT 10 (scans 10,010 rows)');
    logger.production('✓ WHERE id > last_seen_id ORDER BY id LIMIT 10 (keyset pagination)');
    logger.production('Impact: Slow for deep pagination\n');

    logger.production('Anti-pattern 6: Implicit type conversion');
    logger.production('✗ WHERE user_id = \'50\' (string, forces type cast, no index)');
    logger.production('✓ WHERE user_id = 50 (integer, uses index)');
    logger.production('Impact: Full table scan\n');

    // Step 13: Query result caching strategies
    logger.step('Step 13: Query Result Caching Strategies');

    logger.production('Database-level caching:');
    logger.production('- PostgreSQL shared_buffers: Caches frequently accessed pages');
    logger.production('- OS page cache: Caches file system data');
    logger.production('- Automatic, transparent to application\n');

    logger.production('Application-level caching:');
    logger.production('1. Redis/Memcached:');
    logger.production('   - Cache expensive aggregations');
    logger.production('   - TTL: 5-60 minutes depending on data freshness needs');
    logger.production('   - Invalidate on writes (cache-aside pattern)');

    logger.production('\n2. Materialized Views:');
    logger.production('   - Pre-computed results stored in database');
    logger.command('   CREATE MATERIALIZED VIEW user_dashboard AS SELECT ...');
    logger.command('   REFRESH MATERIALIZED VIEW user_dashboard;');
    logger.production('   - Pros: No application code changes, SQL queries work');
    logger.production('   - Cons: Stale data until refresh, refresh can be slow');

    logger.production('\n3. Query result memoization:');
    logger.production('   - Application-side: Cache query results in memory');
    logger.production('   - Good for: Request-scoped caching, avoid duplicate queries');
    logger.production('   - Libraries: DataLoader (batching + caching)\n');

    logger.production('When to cache:');
    logger.production('✓ Expensive queries (>100ms)');
    logger.production('✓ Read-heavy data (10:1 read:write ratio)');
    logger.production('✓ Tolerates stale data (dashboard stats)');
    logger.production('✗ Real-time data (inventory levels)');
    logger.production('✗ User-specific data (privacy, cache pollution)\n');

    // Step 14: Production considerations
    logger.step('Step 14: Production Query Optimization Checklist');

    logger.production('Before deploying:');
    logger.production('1. Run EXPLAIN ANALYZE on all queries');
    logger.production('2. Verify indexes are being used (Index Scan, not Seq Scan)');
    logger.production('3. Check query time: aim for <100ms p95, <20ms p50');
    logger.production('4. Test with production-like data volume');
    logger.production('5. Monitor slow query log (log queries >100ms)\n');

    logger.production('Monitoring:');
    logger.production('- Enable pg_stat_statements extension');
    logger.production('- Track: query time p50/p95/p99, calls per query');
    logger.production('- Alert: p95 query time >200ms');
    logger.production('- Dashboard: Top 10 slowest queries by total time\n');

    logger.production('Optimization workflow:');
    logger.production('1. Identify slow query (monitoring, slow query log)');
    logger.production('2. Run EXPLAIN ANALYZE');
    logger.production('3. Look for Seq Scan → add index');
    logger.production('4. Look for high estimated rows → ANALYZE table');
    logger.production('5. Rewrite query (JOIN instead of subquery, etc.)');
    logger.production('6. Verify improvement with EXPLAIN ANALYZE');
    logger.production('7. Deploy and monitor\n');

    logger.production('When to denormalize:');
    logger.production('- Joins are too expensive (5+ table joins)');
    logger.production('- Aggregations computed frequently (cache in column)');
    logger.production('- Example: user.order_count instead of COUNT(orders)');
    logger.production('- Trade-off: Faster reads, slower writes, data consistency risk\n');

    logger.production('Application-level optimization:');
    logger.production('- Eager loading: Load related data in single query (N+1 solution)');
    logger.production('- Query batching: DataLoader pattern (batch + cache)');
    logger.production('- Pagination: Limit result set size');
    logger.production('- Projection: SELECT only needed columns');
    logger.production('- Connection pooling: Reuse connections (PgBouncer)\n');

    logger.success('✓ Query optimization techniques demonstrated!');

    logger.production('\nKey Takeaways:');
    logger.production('1. Use EXPLAIN ANALYZE to understand query performance');
    logger.production('2. Fix N+1 with JOINs and proper eager loading');
    logger.production('3. CTEs improve readability for complex queries');
    logger.production('4. Window functions avoid self-joins and subqueries');
    logger.production('5. Always verify index usage with EXPLAIN');
    logger.production('6. Monitor slow queries in production');
    logger.production('7. Cache expensive queries at application layer\n');

    // Cleanup
    await client.query('DROP TABLE IF EXISTS order_items CASCADE');
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
  },
};
