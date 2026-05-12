# E-Commerce Product Catalog

## What This Demonstrates

- Multiple access patterns for the same entity (product)
- Primary table with partition key `product_id`
- Denormalized table for frequent queries (by category)
- Storage Attached Index (SAI) for infrequent queries (by price range)
- When to use SAI vs denormalization
- Performance characteristics of each approach
- Clustering keys for range queries within partitions

## Why This Matters

E-commerce catalogs are a common system design interview topic because they naturally have multiple access patterns (browse by category, filter by price, search by name, lookup by ID). This example demonstrates the decision-making process for choosing between denormalization and SAI based on query frequency and latency requirements.

## How It Works

### Multiple Access Patterns

A product catalog must support:
1. **By product_id**: Product detail page (highest frequency)
2. **By category**: Category listing page (high frequency)
3. **By price range**: Price filter (medium frequency)
4. **By category + price**: Combined filter (medium frequency)
5. **By name/search**: Search bar (low frequency, use external search)

### Schemas

```cql
-- Primary table: lookup by product_id
CREATE TABLE products (
  product_id uuid PRIMARY KEY,
  name text,
  category text,
  price decimal,
  inventory int
);

-- SAI for price range queries
CREATE INDEX ON products(price) USING 'sai';

-- Denormalized for category browsing (sorted by price)
CREATE TABLE products_by_category (
  category text,
  price decimal,
  product_id uuid,
  name text,
  inventory int,
  PRIMARY KEY (category, price, product_id)
) WITH CLUSTERING ORDER BY (price ASC);
```

### Performance Comparison

| Access Pattern | Approach | Partitions | Performance |
|---------------|----------|-----------|-------------|
| By product_id | Primary key | 1 | Fastest |
| By category | Denormalized | 1 | Fast |
| By price range | SAI | Many | Slower |
| Category + price | Denormalized | 1 | Fast |

## Key Concepts

### SAI (Storage Attached Index)

SAI is Cassandra's modern secondary index:
- Attached to SSTable files (no separate data structure)
- Supports equality, range, and CONTAINS queries
- Scans multiple partitions (coordinator-heavy)
- No extra table or write amplification needed

**Best for**: Infrequent queries where flexibility matters more than latency.

### Denormalization for Performance

Create a separate table optimized for each frequent query:
- Partition key matches the query's filter column
- Clustering key enables sorted results and range scans
- Duplicates data (write amplification: 2-5x)

**Best for**: High-frequency, latency-sensitive queries (user-facing hot paths).

### Clustering Keys for Range Queries

```cql
-- products_by_category: clustered by price
SELECT * FROM products_by_category
WHERE category = 'electronics'
AND price >= 100 AND price <= 500;
```

This is a **single partition read** with a range scan on the clustering key:
- Partition key (`category`) identifies the partition
- Clustering key (`price`) is sorted on disk
- Range scan is sequential I/O within the partition

### Decision Matrix

| Query Pattern | Frequency | Approach |
|--------------|-----------|----------|
| Lookup by ID | High | Primary key |
| Browse by category | High | Denormalized table |
| Filter by price | Low | SAI |
| Category + price | Medium | Denormalized table |
| Full-text search | Low | External (Elasticsearch) |

## Production Considerations

- **Write amplification**: Each product mutation writes to 2+ tables
- **Consistency**: Application manages writes to denormalized tables
- **Schema evolution**: New query pattern = new table + data backfill
- **SAI limitations**: Not for high-throughput queries (coordinator bottleneck)
- **External search**: Elasticsearch/Solr for complex text search, faceting
- **Materialized Views**: Alternative to manual denormalization (use cautiously)

## Interview Tips

### Common Questions

**Q: "How would you design a product catalog in Cassandra?"**
A: Start with access patterns. Primary table keyed by product_id. Denormalized table for category browsing (sorted by price for range filtering). SAI for infrequent price-only queries. External search engine for full-text search.

**Q: "When would you use SAI vs a denormalized table?"**
A: Denormalize for frequent, latency-sensitive queries (user-facing pages). SAI for infrequent queries where flexibility matters (admin panels, analytics). SAI trades performance for flexibility; denormalization trades write complexity for read speed.

**Q: "What are the tradeoffs of denormalization?"**
A: Pros: fastest reads, predictable latency, pre-sorted results. Cons: write amplification (2-5x), application manages consistency, schema rigidity (new pattern = new table). Trade-off is worth it for high-frequency queries.

**Q: "How do you handle a new access pattern?"**
A: Create a new table optimized for that query. Backfill existing data. Update application to write to new table on mutations. This is expected in Cassandra - schema evolves with access patterns.

### Key Takeaways

1. Identify ALL access patterns before designing schema
2. Denormalize for frequent queries (one table per pattern)
3. SAI for infrequent, flexible queries
4. Clustering keys enable efficient range scans within partition
5. Write amplification is the cost of read efficiency
6. External search for complex text/faceted queries

## Further Reading

- [SAI Documentation](https://cassandra.apache.org/doc/latest/cassandra/cql/sai.html)
- [Data Modeling Best Practices](https://docs.datastax.com/en/dse/6.8/cql/cql/cql_using/cqlBestPractices.html)
- [Secondary Indexes vs Denormalization](https://www.datastax.com/blog/secondary-indexes-cassandra)
