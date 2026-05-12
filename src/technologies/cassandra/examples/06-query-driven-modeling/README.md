# Query-Driven Data Modeling

## What This Demonstrates

- Entity-relationship modeling vs query-driven modeling
- Same entity stored in multiple tables for different queries
- Denormalization patterns (duplicating data across tables)
- Application-level writes to multiple tables
- When to denormalize vs when to use SAIs
- Why JOINs don't exist in Cassandra

## Why This Matters

Query-driven modeling is the fundamental paradigm shift from relational databases. In Cassandra, you design tables around queries, not entities. This means duplicating data across multiple tables, each optimized for a specific access pattern. Understanding this is critical for system design interviews involving NoSQL databases.

## How It Works

### The Paradigm Shift

**Relational (normalize first, query later):**
1. Identify entities and relationships
2. Normalize to 3NF (eliminate redundancy)
3. Write queries using JOINs
4. Add indexes for performance

**Cassandra (know queries first, design tables):**
1. Identify access patterns (what queries will you run?)
2. Create one table per query pattern
3. Denormalize data into each table
4. Application writes to all relevant tables

### Blog System Example

Three access patterns require three tables:

```cql
-- Query: "Posts by author, most recent first"
CREATE TABLE posts_by_author (
  author_id uuid,
  created_at timestamp,
  post_id uuid,
  title text,
  content text,
  PRIMARY KEY (author_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Query: "Posts from today, most recent first"
CREATE TABLE posts_by_date (
  date text,
  created_at timestamp,
  post_id uuid,
  title text,
  PRIMARY KEY (date, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Query: "Posts with tag X, most recent first"
CREATE TABLE posts_by_tag (
  tag text,
  created_at timestamp,
  post_id uuid,
  title text,
  PRIMARY KEY (tag, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

### Application Write Pattern

```typescript
async function createPost(authorId, title, content, tags) {
  const postId = uuid();
  const createdAt = new Date();
  const date = createdAt.toISOString().split('T')[0];

  // Write to ALL tables
  await client.execute('INSERT INTO posts_by_author ...', [...]);
  await client.execute('INSERT INTO posts_by_date ...', [...]);
  for (const tag of tags) {
    await client.execute('INSERT INTO posts_by_tag ...', [...]);
  }
}
```

## Key Concepts

### Write Amplification

One logical operation = multiple physical writes:
- 1 blog post with 3 tags = 2 + 3 = 5 writes
- This is expected and acceptable in Cassandra
- Writes are cheap (O(1) each), reads are expensive (partition scans)
- Trade-off: Write more, read faster

### SAI vs Denormalization

| Approach | Best For | Performance | Write Cost | Flexibility |
|----------|----------|-------------|-----------|-------------|
| Denormalized table | Frequent queries (hot path) | Fastest | High | Low |
| SAI | Infrequent queries | Good | Low | High |
| ALLOW FILTERING | Never in production | Terrible | None | Highest |

**Rule of thumb:**
- User-facing queries with SLA < 10ms: Denormalize
- Admin/analytics queries: SAI
- Never use ALLOW FILTERING in production

### Consistency Across Tables

When writing to multiple tables, strategies for handling partial failures:

1. **Application-level retry**: Most common, use idempotent operations
2. **Logged batch** (same partition only): Atomic within one partition
3. **Eventual consistency**: Accept temporary divergence, reconcile later
4. **CDC (Change Data Capture)**: Write primary, propagate to others

## Production Considerations

- **Disk space**: Denormalization uses more storage (acceptable trade-off)
- **Write throughput**: Multiple writes per operation (Cassandra handles this well)
- **Schema evolution**: Adding new query pattern = new table + backfill
- **Data staleness**: Denormalized tables may briefly diverge
- **Materialized Views**: Cassandra can auto-maintain denormalized tables (use cautiously)

## Interview Tips

### Common Questions

**Q: "How do you model data in Cassandra?"**
A: Start with access patterns, not entities. Create one table per query pattern. Denormalize data into each table. The application writes to all tables on each mutation.

**Q: "Isn't denormalization wasteful?"**
A: Disk is cheap, latency is expensive. One partition read (denormalized) is orders of magnitude faster than a multi-table JOIN or full table scan. Write amplification is the acceptable cost.

**Q: "What about data consistency across tables?"**
A: Accept eventual consistency or use application-level retries with idempotent operations. Logged batches work within a single partition but have performance penalties across partitions.

**Q: "When would you use a secondary index instead?"**
A: SAI (Storage Attached Index) for infrequent queries where latency is acceptable. Denormalize for frequent, latency-sensitive queries. Never use ALLOW FILTERING in production.

### Key Takeaways

1. "What are the access patterns?" is always the first question
2. One table per query pattern
3. No JOINs in Cassandra - denormalize instead
4. Write amplification is expected and acceptable
5. Disk space is cheap, query time is expensive
6. SAI for flexibility, denormalization for performance

## Further Reading

- [Data Modeling](https://cassandra.apache.org/doc/latest/data_modeling/)
- [SAI Documentation](https://cassandra.apache.org/doc/latest/cassandra/cql/sai.html)
- [Materialized Views](https://cassandra.apache.org/doc/latest/cassandra/cql/mvs.html)
