# Aggregations: Analytics & Bucketing

## What

Demonstrates Elasticsearch's aggregation framework for analytics without loading all documents: metrics aggregations (avg, sum, min, max), bucket aggregations (terms, date_histogram), and nested aggregations for multi-dimensional analysis.

## Why

Aggregations power dashboards, reporting, and analytics at scale. Critical for interviews involving analytics (e.g., "Design an analytics dashboard"), e-commerce (sales trends), and business intelligence. Elasticsearch aggregations are faster than loading data and aggregating in-memory, especially for large datasets.

## How

The example demonstrates e-commerce order analytics:
- **Metrics Aggregations**: Calculate avg, sum, min, max across numeric fields
- **Terms Buckets**: Group orders by categorical fields (status, customer)
- **Date Histogram**: Time-series analysis (daily/weekly/monthly trends)
- **Nested Aggregations**: Calculate metrics per bucket (revenue per status)
- **size: 0**: Return only aggregations, not documents

## Key Commands

- `avg` - Calculate average of field values
- `sum` - Calculate total of field values
- `min/max` - Find minimum/maximum values
- `terms` - Group documents by field value (buckets)
- `date_histogram` - Group documents by time intervals
- Nested aggregations - Calculate metrics per bucket

## Try It

Run the example and observe:
1. Metrics calculated without loading documents
2. Terms aggregation groups by status (completed, pending, cancelled)
3. Nested aggregations show revenue per status bucket
4. Date histogram reveals daily order trends
5. Multi-level aggregations (top customers with spend)
6. size: 0 returns only aggregations, not documents

Check the query performance - aggregations are fast even on millions of docs.

## Production Considerations

**Performance:**
- Aggregations use doc_values (columnar storage) for speed
- Terms aggregations have accuracy tradeoffs at scale (set shard_size higher)
- Date histograms efficient for time-series data
- Avoid deep nested aggregations (performance degrades)
- Use filters before aggregations to reduce dataset

**Accuracy:**
- Terms aggregations on high-cardinality fields may be approximate
- Top N terms might miss some due to distributed nature
- Use composite aggregations for pagination through buckets
- Cardinality aggregation is approximate (HyperLogLog)

**Memory:**
- Field data cache for text field aggregations (use keyword instead)
- doc_values stored on disk, not heap (efficient)
- Large terms aggregations can be memory-intensive
- Consider pre-aggregating data for very high-cardinality

**Design Patterns:**
- Combine filters with aggregations (filter context, then aggregate)
- Use post_filter for faceted search (aggregations see all docs)
- Pipeline aggregations for complex calculations (bucket_script, derivative)
- Store pre-aggregated data for dashboard performance

**Scaling:**
- Aggregations scale horizontally across shards
- Coordinator node combines shard results (can be bottleneck)
- Use index rollup for pre-aggregated time-series data
- Consider dedicated aggregation nodes for heavy workloads

**Alternatives:**
- PostgreSQL window functions for relational data
- ClickHouse for very high-volume analytics
- Apache Druid for real-time OLAP
- Pre-aggregate in ETL pipeline (e.g., Spark) for very complex analysis

**Interview Examples:**
- "Design an analytics dashboard" - Use aggregations for metrics
- "Show sales trends" - date_histogram with revenue per day
- "Top products by revenue" - terms aggregation with sum
- "Customer segmentation" - multi-level bucket aggregations
- "Real-time monitoring" - aggregations on time-windowed data

## Further Reading

- [Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)
- [Metrics Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-metrics.html)
- [Bucket Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket.html)
- [Pipeline Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-pipeline.html)
