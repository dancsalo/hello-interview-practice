# PostgreSQL Indexing: Performance Optimization

## What

Demonstrates B-tree indexes, multi-column indexes, covering indexes, partial indexes, and when to use each type.

## Why

Indexing is fundamental to PostgreSQL performance and comes up in virtually every system design interview. Candidates need to know not just how to create indexes, but when to use specialized index types and understand the trade-offs.

## How

The example creates a products table with 10,000 rows and demonstrates:
- **Query without index**: Full table scan (slow)
- **B-tree index**: Standard index on single column
- **Multi-column index**: Index on (category, price) for filtering and sorting
- **Covering index**: INCLUDE clause to avoid heap access
- **Partial index**: WHERE clause to index only relevant rows

Uses EXPLAIN to show query plans and execution strategies.

## Key Commands

- `CREATE INDEX` - Create B-tree index (default)
- `CREATE INDEX ... ON (col1, col2)` - Multi-column index
- `CREATE INDEX ... INCLUDE (col3, col4)` - Covering index
- `CREATE INDEX ... WHERE condition` - Partial index
- `EXPLAIN` - Show query plan
- `EXPLAIN ANALYZE` - Show query plan with actual execution times

## Try It

Run the example and observe:
1. Performance difference with/without indexes
2. EXPLAIN output showing Seq Scan vs Index Scan
3. How multi-column indexes handle both WHERE and ORDER BY
4. Index-only scans with covering indexes

Check indexes manually:
```bash
psql -h localhost -p 5432 -U demo -d ecommerce
\d products
\di
```

## Production Considerations

**Index Types:**

| Type | Use Case | Example |
|------|----------|---------|
| B-tree | Equality, ranges, sorting | `(category)`, `(price)` |
| Covering | Avoid heap access | `(category) INCLUDE (name, price)` |
| Partial | Index subset of rows | `(category) WHERE stock > 0` |
| Multi-column | Multiple filters/sorts | `(category, price DESC)` |

**When to Create Indexes:**
- Columns in WHERE clauses
- Columns in JOIN conditions
- Columns in ORDER BY
- Foreign key columns (PostgreSQL doesn't auto-index these!)

**When NOT to Create Indexes:**
- Small tables (< 1000 rows)
- Columns with low cardinality (few distinct values)
- Columns that are rarely queried
- Write-heavy tables (indexes slow writes)

**Index Overhead:**
- Each index takes disk space
- Each index slows INSERT, UPDATE, DELETE
- Unused indexes waste resources

**Monitoring:**
```sql
-- Find unused indexes
SELECT * FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_%';

-- Index size
SELECT pg_size_pretty(pg_relation_size('idx_name'));
```

**Maintenance:**
- `REINDEX` - Rebuild fragmented indexes
- `VACUUM` - Clean up dead tuples
- `ANALYZE` - Update statistics for query planner

## Further Reading

- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html)
