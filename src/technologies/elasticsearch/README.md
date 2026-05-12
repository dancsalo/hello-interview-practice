# Elasticsearch Technology Guide

Interactive examples for mastering Elasticsearch patterns in system design interviews.

## What is Elasticsearch?

Elasticsearch is a distributed, RESTful search and analytics engine built on Apache Lucene. It's designed for horizontal scalability, real-time search, and complex data analysis across massive datasets.

### Key Characteristics

- **Distributed**: Automatically shards data across nodes for horizontal scaling
- **Near Real-Time**: Changes visible within ~1 second (configurable)
- **Schema-Free**: Dynamic mapping discovers field types automatically
- **Lucene-Based**: Built on battle-tested Apache Lucene search library
- **RESTful API**: Simple HTTP/JSON interface
- **Inverted Index**: Optimized for full-text search with fast lookups

### Why Elasticsearch for Interviews?

Elasticsearch is the de facto standard for search in modern systems. When interviewers ask "Design a search system," they're usually expecting Elasticsearch or something like it. Learning Elasticsearch deeply gives you:

- The vocabulary to discuss search architecture confidently
- Understanding of distributed search challenges (sharding, replication, consistency)
- Knowledge of real-world tradeoffs (CAP theorem, eventual consistency)
- Patterns for common use cases (e-commerce search, log analytics, geospatial)
- Production considerations (CDC, monitoring, capacity planning)

Elasticsearch appears in interviews for:
- E-commerce product search (Amazon, eBay, Etsy)
- Content platforms (Medium, Stack Overflow, Wikipedia)
- Geospatial services (Yelp, Uber, Airbnb)
- Log analytics and monitoring (ELK stack)
- Analytics dashboards and business intelligence

## 10 Elasticsearch Examples

### 1. Basics: Core Concepts

**What you'll learn**: Fundamental Elasticsearch operations and CRUD patterns

- Creating indices with explicit mappings
- Indexing documents (CREATE)
- Retrieving documents by ID (READ)
- Updating documents (UPDATE)
- Searching with match_all (basic queries)
- Deleting documents (DELETE)

**Key concepts**:
- Inverted index structure
- Document IDs and versioning
- text vs keyword field types
- Mapping immutability

**Interview relevance**: These are the building blocks for all Elasticsearch patterns. You need to understand mappings, field types, and CRUD operations before discussing advanced search features.

**Example path**: `examples/01-basics/`

---

### 2. Full-Text Search: Text Analysis & Matching

**What you'll learn**: Elasticsearch's core strength - full-text search

- Text analysis (tokenization, normalization, stemming)
- match query for general search
- match_phrase for exact phrases
- fuzzy query for typo tolerance
- multi_match for searching across fields

**Key concepts**:
- Text analyzers and tokenization
- Relevance scoring (TF-IDF)
- Query time vs index time analysis
- Field boosting for relevance tuning

**Interview relevance**: Full-text search is why most systems use Elasticsearch. You'll need to explain how text is analyzed, how relevance scoring works, and how to handle typos and phrase matching.

**Example path**: `examples/02-full-text-search/`

---

### 3. Geospatial Search: Location Queries

**What you'll learn**: Location-based queries for proximity search

- geo_point field type for coordinates
- geo_distance for radius searches
- Distance sorting (nearest first)
- geo_bounding_box for map viewports
- Combining geospatial with filters

**Key concepts**:
- BKD tree indexing for spatial data
- Haversine distance calculation
- Geohash-based grid indexing
- Performance characteristics of geo queries

**Interview relevance**: "Design Yelp" and "Design Uber" questions require geospatial search. Understanding how to efficiently find nearby locations and combine proximity with filters is essential.

**Example path**: `examples/03-geospatial-search/`

---

### 4. Aggregations: Analytics & Bucketing

**What you'll learn**: Analytics without loading all documents

- Metrics aggregations (avg, sum, min, max)
- Bucket aggregations (terms, ranges)
- date_histogram for time-series trends
- Nested aggregations for multi-dimensional analysis
- size: 0 pattern for aggregations-only queries

**Key concepts**:
- doc_values for columnar storage
- Aggregation accuracy vs performance
- Bucket pipeline for complex calculations
- Memory considerations for aggregations

**Interview relevance**: Dashboards and analytics questions require aggregations. "Design an analytics dashboard" or "Show sales trends" need efficient aggregation patterns without loading millions of documents.

**Example path**: `examples/04-aggregations/`

---

### 5. Complex Queries: Bool, Nested, Filtering

**What you'll learn**: Combining multiple search conditions

- bool query combining must, should, filter, must_not
- Query context vs filter context
- nested queries for related data
- minimum_should_match for precision control
- Multi-faceted search logic

**Key concepts**:
- Query scoring vs filtering (performance)
- Filter caching for speed
- Nested document structure and queries
- Boolean logic composition

**Interview relevance**: Real-world search requires combining conditions: text matching + filters + exclusions. Understanding query vs filter context is critical for performance optimization.

**Example path**: `examples/05-complex-queries/`

---

### 6. Sorting & Pagination: Result Navigation

**What you'll learn**: Efficient pagination strategies

- Single and multi-field sorting
- from/size pagination (simple but limited)
- search_after for efficient deep pagination
- Point-in-Time API for consistency
- Avoiding deep pagination pitfalls

**Key concepts**:
- Deep pagination performance problems
- Cursor-based vs offset-based pagination
- Pagination consistency during updates
- Sort tie-breakers for determinism

**Interview relevance**: Every search system needs pagination. You'll need to explain the tradeoffs between from/size and search_after, and when to use Point-in-Time for consistency.

**Example path**: `examples/06-sorting-pagination/`

---

### 7. Document Versioning: Concurrent Updates

**What you'll learn**: Optimistic concurrency control

- _version for update tracking
- _seq_no and _primary_term for precise control
- Conflict detection (409 errors)
- Retry patterns for conflicts
- Atomic script-based updates

**Key concepts**:
- Optimistic locking in distributed systems
- Read-modify-write race conditions
- Version checking for consistency
- Server-side scripts for atomicity

**Interview relevance**: "Design inventory management" or "Prevent overselling" questions require understanding concurrent updates. Knowing how to use versioning and atomic operations is essential.

**Example path**: `examples/07-document-versioning/`

---

### 8. Faceted Search: Multi-Dimensional Filtering

**What you'll learn**: E-commerce-style filtering with facets

- Building facets with aggregations
- Showing counts per facet value
- Applying filters while maintaining facets
- Range facets for numeric fields
- Multi-select facet patterns

**Key concepts**:
- Aggregations for facet generation
- Query + aggregation pattern
- post_filter for special cases
- Facet count accuracy at scale

**Interview relevance**: "Design Amazon product search" requires faceted filtering. Users expect to see available filters (category, price, rating) with counts and apply multiple filters simultaneously.

**Example path**: `examples/08-faceted-search/`

---

### 9. Index Management: Mappings & Reindexing

**What you'll learn**: Schema evolution without downtime

- Custom analyzers for text processing
- Explicit mappings for predictable behavior
- Reindex API for schema changes
- Index aliases for zero-downtime migrations
- Atomic alias switching

**Key concepts**:
- Mapping immutability challenges
- Analyzer configuration
- Zero-downtime migration patterns
- Alias-based versioning

**Interview relevance**: Production systems evolve. You need to explain how to add fields, change field types, and migrate schemas without downtime. The alias-based pattern is industry standard.

**Example path**: `examples/09-index-management/`

---

### 10. Production Patterns: CDC, Sync, Performance

**What you'll learn**: Real-world production patterns

- Change Data Capture (CDC) for sync
- Bulk indexing for throughput
- Refresh tuning for performance
- Monitoring with index stats
- Eventual consistency patterns
- Elasticsearch as secondary index

**Key concepts**:
- CDC for database synchronization
- Bulk API for high throughput
- refresh_interval tuning tradeoffs
- Source of truth vs search index
- Performance monitoring

**Interview relevance**: This is the most important example for senior interviews. Understanding that Elasticsearch is NOT the source of truth and how to keep it in sync with your primary database (Postgres, MySQL) is critical.

**Example path**: `examples/10-production-patterns/`

---

## Key Concepts Across Examples

### Performance

- Elasticsearch is **designed for search**: Sub-millisecond queries on billions of documents
- **Inverted index** structure makes text search fast (O(1) term lookup)
- **doc_values** provide efficient columnar storage for sorting and aggregations
- **Not optimized for writes**: Each write requires updating inverted index
- Tradeoff: **Read-optimized** at the expense of write complexity

### Scalability

Elasticsearch scales horizontally through sharding:
- **Shards**: Divide index into partitions distributed across nodes
- **Replicas**: Copies of shards for redundancy and read throughput
- **Hash-based routing**: Documents distributed by ID hash to shards
- **Scaling reads**: Add replicas
- **Scaling writes**: Add more shards (requires reindex)
- **Shard sizing**: Aim for 20-50GB per shard

### Infrastructure

Deployment patterns:
1. **Single node**: Development only, no redundancy
2. **Cluster with replicas**: High availability, can lose nodes
3. **Multi-zone cluster**: Availability zone awareness for resilience
4. **Dedicated master nodes**: Separate coordination from data
5. **Hot-warm-cold architecture**: Tiered storage for cost optimization

### Consistency

Elasticsearch is **eventually consistent**:
- **Near real-time**: Changes visible after refresh_interval (default 1s)
- **No ACID transactions**: Can't update multiple documents atomically
- **No cross-index queries**: Each search targets specific indices
- **Distributed coordination**: Uses Raft-like consensus for cluster state
- **Tradeoff**: Availability and performance over immediate consistency

### Common Patterns

- **Filter context**: Use for exact matches (faster, cacheable)
- **Query context**: Use for full-text and relevance scoring
- **Bulk API**: Batch operations for throughput (500-1000 docs per batch)
- **Aliases**: Enable zero-downtime migrations and versioning
- **CDC**: Keep in sync with source of truth database

### Common Pitfalls

- **Using as primary database**: Elasticsearch is a secondary index, not source of truth
- **Over-sharding**: Too many small shards hurts performance
- **Deep pagination**: from+size > 10k is expensive, use search_after
- **Mapping mistakes**: Fields are immutable, requires reindex to change
- **Ignoring refresh_interval**: Default 1s adds overhead for write-heavy workloads
- **Single-document indexing**: Use bulk API for efficiency

## Getting Started

### Running Examples

```bash
# Start Elasticsearch and Kibana services
docker-compose up -d

# Launch CLI
npm start

# Select Elasticsearch, then choose an example
```

### Visualizing Data

Kibana provides a GUI for exploring data:

```bash
# Open in browser
open http://localhost:5601

# Kibana automatically connects to Elasticsearch
```

You can use Dev Tools for ad-hoc queries, Index Management for viewing indices, and Maps for visualizing geospatial data.

### Resetting Data

```bash
# Reset all Elasticsearch data
npm run reset:elasticsearch

# Or use CLI option after running an example
```

## Production Considerations

Each example README includes a "Production Considerations" section discussing:
- Performance optimization strategies
- Scaling challenges and solutions
- Failure modes and resilience patterns
- When NOT to use the pattern
- Monitoring and observability requirements
- Alternative approaches and tradeoffs

These are crucial for interviews where you need to discuss production-grade systems.

## Interview Tips

### Do:
- Explain shard and replica strategy for your scale
- Discuss eventual consistency tradeoffs
- Mention CDC for keeping in sync with primary database
- Consider mapping design upfront (immutable)
- Use filter context when scoring not needed (performance)
- Know when to use alternatives (Postgres, Algolia, etc.)

### Don't:
- Treat Elasticsearch as source of truth
- Ignore mapping limitations (reindex required for changes)
- Use deep pagination (from+size > 10k)
- Over-shard (20-50GB per shard is ideal)
- Forget about refresh_interval tuning for writes
- Overlook monitoring (heap, disk, query latency)

### Common Questions:

**Q: Why Elasticsearch instead of PostgreSQL full-text search?**  
A: Elasticsearch scales horizontally, has richer search features (fuzzy, geospatial, facets), and is optimized for search workloads. Postgres is better for relational data with light search needs.

**Q: How do you keep Elasticsearch in sync with your database?**  
A: Change Data Capture (CDC) streams database changes to Elasticsearch. Tools like Debezium capture transaction log changes and route to ES via Kafka. Elasticsearch is a secondary index, not the source of truth.

**Q: What happens if Elasticsearch goes down?**  
A: Reads fail (search unavailable), but primary database unaffected. Can rebuild Elasticsearch from database. Design for graceful degradation (show cached results or error message).

**Q: How do you handle schema changes?**  
A: Mappings are immutable. Create new index with updated mapping, reindex data, switch alias atomically. Zero-downtime migration pattern. Can take hours for large indices.

**Q: When would you NOT use Elasticsearch?**  
A: Small datasets (<100k docs) - Postgres full-text is simpler. ACID transactions needed - use relational DB. Simple key-value lookups - use Redis or DynamoDB. Very high write throughput - consider Kafka or time-series DB.

**Q: How does sharding work?**  
A: Index divided into shards (primary partitions). Documents routed by hash(doc_id) % num_shards. Each shard is a Lucene index. Shards distributed across nodes. Queries scatter-gather across all shards.

**Q: What's the difference between text and keyword fields?**  
A: text fields are analyzed (tokenized, normalized) for full-text search. keyword fields are not analyzed - exact match only. Use text for search, keyword for filtering and aggregations.

## Further Reading

### Official Documentation
- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Search APIs](https://www.elastic.co/guide/en/elasticsearch/reference/current/search.html)
- [Query DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)

### Deep Dives
- **Original guide**: `../../../key_technologies/elasticsearch/original.md` - Comprehensive overview of Elasticsearch concepts
- [Elasticsearch: The Definitive Guide](https://www.elastic.co/guide/en/elasticsearch/guide/current/index.html) - In-depth book
- [How Elasticsearch Works](https://www.elastic.co/blog/found-elasticsearch-from-the-bottom-up) - Architecture deep dive

### Architecture
- [Distributed Search Execution](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-your-data.html)
- [Cluster Coordination](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-discovery.html)
- [Index Modules](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html)

### Performance
- [Tune for Indexing Speed](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-indexing-speed.html)
- [Tune for Search Speed](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-search-speed.html)
- [Sizing Elasticsearch](https://www.elastic.co/elasticon/conf/2016/sf/quantitative-cluster-sizing) - Capacity planning

### Alternatives & Comparisons
- When to use PostgreSQL instead (ACID, relational data, light search)
- When to use Algolia instead (managed service, simpler, hosted)
- When to use Solr instead (similar capabilities, XML-based, older)
- When to use DynamoDB instead (AWS-native, key-value, global tables)
- When to use Kafka instead (event streaming, not search)

## What's Next?

After mastering these Elasticsearch examples:

1. **Experiment**: Modify examples to test edge cases and performance
2. **Visualize**: Use Kibana to explore data and query patterns
3. **Practice**: Explain patterns out loud for interview prep
4. **Combine**: Think about how patterns work together in real systems
5. **Compare**: Try Redis or PostgreSQL examples for similar use cases

## Common Use Cases Summary

| Use Case | Elasticsearch Feature | Example |
|----------|----------------------|---------|
| Product search | Full-text + facets | E-commerce catalog |
| Autocomplete | Completion suggester | Search suggestions |
| Log analytics | Time-series indexing | ELK stack monitoring |
| Geospatial search | geo_point + geo_distance | Find nearby restaurants |
| Content discovery | Full-text + relevance | Blog/article search |
| Business analytics | Aggregations + Kibana | Sales dashboards |
| Faceted navigation | Aggregations + filters | Category filtering |
| Inventory management | Versioning + scripts | Stock tracking |
| Real-time reporting | date_histogram | Metrics and trends |
| Document management | Full-text + metadata | Enterprise search |

---

**Ready to dive in?** Run `npm start` and select Elasticsearch to explore these patterns hands-on.

For questions about Elasticsearch concepts and design, refer to the comprehensive guide: `../../../key_technologies/elasticsearch/original.md`
