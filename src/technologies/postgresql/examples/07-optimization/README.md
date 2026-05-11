# PostgreSQL Query Optimization: EXPLAIN, CTEs, Window Functions

## What

Demonstrates query optimization techniques including EXPLAIN/EXPLAIN ANALYZE, solving the N+1 query problem, Common Table Expressions (CTEs), window functions, and identifying common query anti-patterns.

## Why

Query optimization is critical in production systems and frequently appears in system design interviews. Understanding how to read query plans, identify performance bottlenecks, and apply optimization patterns separates strong candidates from those who just know basic SQL.

## How

The example creates a user dashboard scenario with users, orders, and order_items tables:

1. **EXPLAIN and EXPLAIN ANALYZE**: Understanding query execution plans
2. **N+1 Query Problem**: Classic anti-pattern and JOIN-based solution
3. **CTEs (Common Table Expressions)**: Breaking complex queries into readable steps
4. **CTEs vs Subqueries**: When to use each approach
5. **Window Functions**: ROW_NUMBER, RANK, LAG, LEAD for analytics
6. **Running Aggregations**: SUM/AVG OVER for cumulative calculations
7. **Index Usage Verification**: Ensuring indexes are actually used
8. **Query Anti-patterns**: Common mistakes and their fixes
9. **Caching Strategies**: Database, application, and materialized view caching

## Key Commands

### EXPLAIN
```sql
-- Shows query plan without executing
EXPLAIN SELECT * FROM orders WHERE user_id = 50;

-- Shows plan with actual execution and timing
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 50;
```

### CTEs (Common Table Expressions)
```sql
WITH user_stats AS (
  SELECT user_id, COUNT(*) as order_count
  FROM orders
  GROUP BY user_id
)
SELECT u.username, us.order_count
FROM users u
JOIN user_stats us ON u.id = us.user_id;
```

### Window Functions
```sql
-- Ranking
SELECT 
  user_id,
  total_amount,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total_amount DESC) as rank
FROM orders;

-- Previous/Next values
SELECT 
  user_id,
  total_amount,
  LAG(total_amount) OVER (PARTITION BY user_id ORDER BY created_at) as previous_amount
FROM orders;

-- Running total
SELECT 
  user_id,
  total_amount,
  SUM(total_amount) OVER (PARTITION BY user_id ORDER BY created_at) as running_total
FROM orders;
```

## Try It

Run the example and observe:
1. EXPLAIN output showing Seq Scan vs Index Scan
2. N+1 query problem performance vs JOIN solution
3. CTE query readability for complex aggregations
4. Window function rankings and running aggregations

Query the database directly:
```bash
psql -h localhost -p 5432 -U demo -d ecommerce

-- See query plan
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 50;

-- Window function example
SELECT 
  user_id, 
  total_amount, 
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY total_amount DESC) 
FROM orders 
WHERE user_id <= 3;
```

## Production Considerations

### Reading Query Plans

**Key terms in EXPLAIN output:**

| Term | Meaning | Performance |
|------|---------|-------------|
| Seq Scan | Sequential scan (full table) | Slow for large tables |
| Index Scan | Uses index, fetches rows | Fast for small result sets |
| Index Only Scan | All data from index | Fastest (no table access) |
| Bitmap Index Scan | Index scan for multiple values | Good for moderate selectivity |
| Nested Loop | Join rows one by one | Good for small datasets |
| Hash Join | Build hash table, probe | Good for large joins |
| Merge Join | Sort both sides, merge | Good for sorted data |

**Cost estimates:**
- First number: Startup cost (cost until first row)
- Second number: Total cost (arbitrary units)
- Compare costs between queries to identify improvements

### N+1 Query Problem Solutions

**Problem:**
```javascript
// Anti-pattern: 1 query + N queries
const users = await db.query('SELECT * FROM users');
for (const user of users) {
  const orders = await db.query('SELECT COUNT(*) FROM orders WHERE user_id = ?', [user.id]);
}
// 1 + 100 queries = 101 round trips!
```

**Solution 1: JOIN**
```sql
SELECT u.*, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id;
-- 1 query, single round trip
```

**Solution 2: Eager Loading (ORM)**
```javascript
// Sequelize example
const users = await User.findAll({
  include: [{ model: Order, attributes: ['id'] }]
});
// Generates optimal JOIN query
```

**Solution 3: DataLoader (GraphQL)**
```javascript
// Batches + caches related queries
const orderLoader = new DataLoader(async (userIds) => {
  const orders = await db.query('SELECT * FROM orders WHERE user_id IN (?)', [userIds]);
  return userIds.map(id => orders.filter(o => o.user_id === id));
});
```

### CTEs vs Subqueries

**Use CTEs when:**
- Complex query with multiple logical steps
- Need to reference same computation multiple times
- Readability is important (team maintenance)
- Recursive queries (WITH RECURSIVE)

**Use Subqueries when:**
- Simple, one-off computation
- Used in WHERE clause (optimizer can inline)
- Single reference only

**Example: CTE materialization control (PostgreSQL 12+)**
```sql
-- Force materialization (compute once, reuse)
WITH data AS MATERIALIZED (
  SELECT expensive_computation() ...
)
SELECT * FROM data WHERE ...;

-- Prevent materialization (inline for optimization)
WITH data AS NOT MATERIALIZED (
  SELECT * FROM large_table WHERE ...
)
SELECT * FROM data WHERE ...;
```

### Window Functions

**Common use cases:**

1. **Rankings within groups**
```sql
-- Top 3 products per category
SELECT * FROM (
  SELECT 
    category,
    product_name,
    ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC) as rank
  FROM products
) WHERE rank <= 3;
```

2. **Running aggregations**
```sql
-- Year-to-date sales
SELECT 
  month,
  sales,
  SUM(sales) OVER (ORDER BY month) as ytd_sales
FROM monthly_sales;
```

3. **Period-over-period comparison**
```sql
-- Month-over-month growth
SELECT 
  month,
  revenue,
  LAG(revenue) OVER (ORDER BY month) as prev_month,
  revenue - LAG(revenue) OVER (ORDER BY month) as growth
FROM monthly_revenue;
```

4. **Moving averages**
```sql
-- 7-day moving average
SELECT 
  date,
  value,
  AVG(value) OVER (
    ORDER BY date 
    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
  ) as moving_avg
FROM daily_metrics;
```

### Query Anti-patterns

| Anti-pattern | Why It's Bad | Fix |
|--------------|--------------|-----|
| `SELECT *` | Fetches unnecessary columns | `SELECT id, name` only needed |
| No WHERE clause | Full table scan | Add filters on indexed columns |
| `OR` conditions | Can't use index efficiently | Use `IN` or UNION |
| Function on indexed column | Index not usable | Functional index or rewrite |
| `OFFSET` pagination | Scans skipped rows | Keyset pagination (`WHERE id > last_id`) |
| Implicit type conversion | Forces type cast, no index | Match column types exactly |
| `SELECT DISTINCT` overuse | Often masks design issue | Fix joins or GROUP BY properly |
| Correlated subquery | Runs for each row | Convert to JOIN or window function |

### Index Usage Verification

**Check if index is used:**
```sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 50;
```

**Red flags:**
- Seq Scan on large table (>10K rows)
- Estimated rows vs actual rows mismatch (bad statistics)
- High cost estimate (>10000)

**Fixes:**
- Add index on filter columns
- Run ANALYZE to update statistics
- Consider multi-column index for multiple filters

**Verify index usage in production:**
```sql
-- Unused indexes (candidates for removal)
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  idx_scan 
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
AND indexrelname NOT LIKE 'pg_%';

-- Index cache hit ratio (should be >99%)
SELECT 
  sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) as index_hit_rate
FROM pg_statio_user_indexes;
```

### Query Result Caching

**Cache layers:**

1. **PostgreSQL shared_buffers** (automatic)
   - Caches data pages in memory
   - Configure: 25% of RAM
   - Transparent to application

2. **Application cache (Redis/Memcached)**
```javascript
// Cache expensive aggregations
const cacheKey = `user:${userId}:stats`;
let stats = await redis.get(cacheKey);
if (!stats) {
  stats = await db.query('SELECT ... FROM orders ...');
  await redis.setex(cacheKey, 300, JSON.stringify(stats)); // 5 min TTL
}
```

3. **Materialized Views**
```sql
-- Pre-compute expensive query
CREATE MATERIALIZED VIEW user_dashboard AS
SELECT 
  u.id,
  u.username,
  COUNT(o.id) as order_count,
  SUM(o.total_amount) as lifetime_value
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.username;

-- Refresh periodically (cron job)
REFRESH MATERIALIZED VIEW user_dashboard;

-- Query is fast (reads pre-computed results)
SELECT * FROM user_dashboard WHERE id = 50;
```

4. **Query result memoization (request-scoped)**
```javascript
// GraphQL DataLoader pattern
const orderLoader = new DataLoader(async (userIds) => {
  // Batch multiple requests into single query
  const orders = await db.query('SELECT * FROM orders WHERE user_id = ANY($1)', [userIds]);
  return userIds.map(id => orders.filter(o => o.user_id === id));
});
```

**Caching guidelines:**

| Data Type | Strategy | TTL |
|-----------|----------|-----|
| User profile | Redis | 1 hour |
| Dashboard stats | Redis | 5-15 min |
| Product catalog | Redis | 1 hour |
| Reporting data | Materialized View | Daily refresh |
| Session data | Redis | Session duration |
| Real-time inventory | No cache | N/A |

### When to Denormalize

**Denormalization reduces joins but increases complexity.**

**Good candidates:**
- Frequently joined data (5+ table joins)
- Aggregations computed on every query
- Read-heavy (100:1 read:write ratio)

**Example: Cache order count**
```sql
-- Add denormalized column
ALTER TABLE users ADD COLUMN order_count INTEGER DEFAULT 0;

-- Update via trigger
CREATE TRIGGER update_order_count
AFTER INSERT OR DELETE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_user_order_count();

-- Query is now simple
SELECT username, order_count FROM users WHERE id = 50;
-- No JOIN needed!
```

**Trade-offs:**
- Pros: Faster reads, simpler queries
- Cons: Slower writes, data consistency risk, storage overhead

### Application-level Optimization

**Eager loading (avoid N+1):**
```javascript
// ORM example (Sequelize)
const users = await User.findAll({
  include: [{ 
    model: Order, 
    attributes: ['id', 'total_amount'],
    required: false // LEFT JOIN
  }]
});
```

**Query batching (DataLoader):**
```javascript
// Batches requests within event loop tick
const user1Orders = orderLoader.load(1);
const user2Orders = orderLoader.load(2);
// Executes: SELECT * FROM orders WHERE user_id IN (1, 2)
```

**Pagination:**
```sql
-- Keyset pagination (efficient)
SELECT * FROM orders 
WHERE id > 1000 
ORDER BY id 
LIMIT 10;

-- OFFSET pagination (avoid for deep pages)
SELECT * FROM orders 
ORDER BY id 
OFFSET 10000 LIMIT 10;
-- Scans 10,010 rows even though returning 10!
```

**Projection (select only needed columns):**
```javascript
// Anti-pattern
const users = await db.query('SELECT * FROM users');

// Better
const users = await db.query('SELECT id, username, email FROM users');
// Less network transfer, less memory
```

### Monitoring

**Enable pg_stat_statements:**
```sql
-- Add to postgresql.conf
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.track = all

-- Restart PostgreSQL, then create extension
CREATE EXTENSION pg_stat_statements;

-- Find slowest queries
SELECT 
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  total_exec_time
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

**Slow query log:**
```sql
-- Log queries slower than 100ms
ALTER DATABASE mydb SET log_min_duration_statement = 100;
```

**Alerts to set up:**
- Query p95 time > 200ms
- Slow query count > 10/min
- Connection pool exhaustion
- Cache hit ratio < 95%

### Optimization Workflow

1. **Identify slow query** (monitoring, logs)
2. **Reproduce locally** with production-like data
3. **Run EXPLAIN ANALYZE**
4. **Analyze:**
   - Seq Scan? → Add index
   - High cost? → Rewrite query
   - Estimated vs actual rows mismatch? → ANALYZE table
5. **Apply fix**
6. **Verify improvement** with EXPLAIN ANALYZE
7. **Deploy and monitor**

## Common Interview Questions

**Q: How do you identify a slow query in production?**
A: Enable pg_stat_statements extension, monitor query execution times, set up slow query log (log_min_duration_statement), track p50/p95/p99 latencies.

**Q: What's the N+1 query problem and how do you solve it?**
A: Executing 1 query to fetch a list, then N queries to fetch related data for each item. Solve with JOINs, eager loading in ORMs, or DataLoader pattern for batching.

**Q: When would you use a window function vs GROUP BY?**
A: Window functions when you need per-row results with aggregate info (rankings, running totals). GROUP BY when you need aggregated summary rows.

**Q: How do you know if an index is being used?**
A: Run EXPLAIN or EXPLAIN ANALYZE. Look for "Index Scan" or "Index Only Scan" vs "Seq Scan". Check pg_stat_user_indexes for index usage stats.

**Q: What's the difference between EXPLAIN and EXPLAIN ANALYZE?**
A: EXPLAIN shows the query plan without executing. EXPLAIN ANALYZE executes the query and shows actual timing and row counts.

**Q: When should you denormalize data?**
A: When joins are expensive (5+ tables), data is read-heavy (100:1 ratio), and you can manage consistency. Trade-off: faster reads, slower writes, storage overhead.

## Further Reading

- [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
- [Window Functions](https://www.postgresql.org/docs/current/tutorial-window.html)
- [Common Table Expressions (WITH)](https://www.postgresql.org/docs/current/queries-with.html)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [Query Planning](https://www.postgresql.org/docs/current/runtime-config-query.html)
- [DataLoader Pattern](https://github.com/graphql/dataloader)
