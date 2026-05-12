# Production Patterns: CDC, Sync, Performance

## What

Demonstrates production-ready Elasticsearch patterns including Change Data Capture (CDC) for database synchronization, bulk indexing for throughput, refresh tuning for write performance, monitoring with index stats, and eventual consistency patterns.

## Why

Elasticsearch is rarely the source of truth - it's a secondary index optimized for search. The critical challenge is keeping it in sync with your primary database (Postgres, MySQL, MongoDB) while maintaining performance and consistency. This is one of the most common interview topics for search systems.

## How

The example demonstrates real-world production patterns:
- **Optimized Settings**: Tune refresh_interval, shards, replicas for workload
- **Bulk Indexing**: Batch operations for high throughput (CDC use case)
- **CDC Pattern**: Simulate database changes flowing to Elasticsearch
- **Explicit Refresh**: Control when changes become searchable
- **Monitoring**: Track index stats, performance, resource usage
- **Eventual Consistency**: Trade immediate consistency for performance
- **Filter Optimization**: Use filter context for caching

## Key Commands

- `refresh_interval` setting - Control indexing latency vs performance
- Bulk API - Batch index/update operations
- `refresh: false` - Async indexing (don't wait for refresh)
- `refresh: wait_for` - Sync indexing (wait for refresh)
- `POST /index/_refresh` - Explicit refresh
- Index stats API - Monitor performance and resource usage
- `track_total_hits` - Count matching documents (performance cost)

## Try It

Run the example and observe:
1. Index created with refresh_interval: 30s (not default 1s)
2. Bulk indexing 1000 products quickly
3. Explicit refresh makes documents searchable
4. CDC-style updates for price changes
5. Index stats show docs, size, operations
6. Search performance with filters
7. Eventual consistency pattern (async indexing)

Check timing - bulk indexing is fast, search is sub-millisecond.

## Production Considerations

**Elasticsearch is NOT the Source of Truth:**
- Primary database (Postgres, MySQL, DynamoDB) is source of truth
- Elasticsearch is a secondary index for search/analytics
- Must be able to rebuild Elasticsearch from primary DB
- Losing Elasticsearch data is recoverable (not true for primary DB)

**Change Data Capture (CDC):**
- Stream database changes to Elasticsearch in near real-time
- Tools: Debezium, AWS DMS, Logstash, custom CDC pipeline
- Capture INSERT, UPDATE, DELETE operations from DB transaction log
- Transform and route to Elasticsearch via Kafka or direct
- Handle schema evolution, conflict resolution

**Sync Strategies:**
- CDC (recommended): Stream changes from database log
- Dual writes: Write to DB and ES simultaneously (consistency issues)
- Polling: Periodically query DB for changes (high latency)
- Full reindex: Scheduled bulk reload (fallback, downtime)
- Event-driven: Application emits events on DB changes

**Bulk Indexing:**
- Batch 500-1000 documents per bulk request
- Trade-off: Latency vs throughput
- Monitor bulk queue size and rejection rate
- Use refresh: false for async (better throughput)
- Handle partial failures (errors: true, inspect items)

**Refresh Tuning:**
- Default refresh_interval: 1s (changes visible after 1s)
- Write-heavy: Increase to 30s or 60s (reduces load)
- Real-time: Use refresh: wait_for (impacts throughput)
- Disable during bulk load: -1, then enable after
- Trade-off: Latency vs indexing performance

**Monitoring:**
- Index stats: docs, size, indexing rate, search rate
- Cluster health: green/yellow/red status
- JVM heap usage: Alert at 85%, critical at 90%
- Query latency: p50, p99, p999
- Indexing latency and throughput
- Disk usage and I/O
- Thread pool rejections

**Performance Optimization:**
- Use filter context (cacheable) for non-scoring queries
- Appropriate shard count (20-50GB per shard)
- Replicas for read throughput (not write throughput)
- Bulk API for indexing (never single-document loops)
- Field data cache vs doc_values tradeoff
- Warm up queries after deployment

**Consistency Model:**
- Elasticsearch is eventually consistent
- Writes visible after refresh_interval
- Accept stale reads for better performance
- Use versioning for optimistic concurrency
- Design system to tolerate eventual consistency

**Disaster Recovery:**
- Snapshots to S3/GCS for backup
- Can rebuild from primary database (CDC replay)
- Test recovery procedures regularly
- Document recovery time objective (RTO)
- Index aliases enable zero-downtime recovery

**Capacity Planning:**
- Estimate documents and growth rate
- Calculate index size (source + inverted index + doc_values)
- Plan for 3x storage (replica + headroom)
- Monitor indexing rate and query rate trends
- Horizontal scaling via sharding

**Anti-Patterns to Avoid:**
- Using ES as primary data store (data loss risk)
- Synchronous dual writes to DB and ES (consistency issues)
- Single-document indexing in loops (use bulk API)
- Over-sharding (too many small shards)
- Under-monitoring (catch issues before users notice)

**Alternatives:**
- PostgreSQL full-text search for simpler use cases
- Algolia for managed search (no ops burden)
- Typesense for lightweight open-source alternative
- Apache Solr for similar capabilities
- Custom inverted index for very specific needs

**Interview Examples:**
- "Keep Elasticsearch in sync with Postgres" - CDC pattern
- "Design search for e-commerce" - Bulk indexing + CDC
- "Optimize write performance" - Refresh tuning, bulk API
- "Handle database failover" - Rebuild from source of truth
- "Monitor search system health" - Index stats, metrics

## Further Reading

- [Tune for Indexing Speed](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-indexing-speed.html)
- [Tune for Search Speed](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-search-speed.html)
- [Bulk API](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html)
- [Index Modules](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html)
- [Monitoring Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/monitor-elasticsearch-cluster.html)
