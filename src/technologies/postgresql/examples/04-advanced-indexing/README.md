# PostgreSQL Advanced Indexing: GIN, GiST & Specialized Use Cases

## What

Demonstrates specialized PostgreSQL indexes: GIN indexes for full-text search and JSONB queries, and GiST indexes for PostGIS geospatial queries.

## Why

Many candidates only know B-tree indexes. System design interviews often require understanding when PostgreSQL's built-in capabilities (full-text search, JSONB, geospatial) are sufficient vs when to use specialized databases like Elasticsearch or dedicated geospatial systems.

## How

The example creates a social media posts table with:
- **Full-text search**: `tsvector` type with `to_tsvector`/`to_tsquery` for stemming and relevance ranking
- **JSONB metadata**: Flexible schema for tags, mentions, and attributes
- **PostGIS location**: Geographic points for location-based queries

Demonstrates:
1. GIN index for full-text search with `tsvector`
2. GIN index for JSONB containment and key queries
3. GiST index for PostGIS geospatial distance queries
4. Combined queries using all three specialized indexes
5. When to use PostgreSQL vs specialized tools

## Key Commands

### Extensions
- `CREATE EXTENSION pg_trgm` - Trigram matching for fuzzy search
- `CREATE EXTENSION postgis` - Geospatial types and functions

### Full-Text Search
- `to_tsvector('english', text)` - Convert text to searchable tokens
- `to_tsquery('english', query)` - Convert query string to search query
- `@@` - Text search match operator
- `ts_rank()` - Relevance ranking
- `CREATE INDEX ... USING GIN(tsvector_column)` - Index for full-text search

### JSONB
- `@>` - Containment operator (left contains right)
- `?` - Key exists operator
- `->` - Get JSON object (returns JSONB)
- `->>` - Get text value (returns text)
- `CREATE INDEX ... USING GIN(jsonb_column)` - Index for JSONB queries

### PostGIS
- `ST_MakePoint(lon, lat)` - Create point (note: longitude first!)
- `ST_DWithin(geom1, geom2, distance)` - Within distance filter
- `ST_Distance(geom1, geom2)` - Calculate distance
- `<->` - Distance operator for sorting
- `CREATE INDEX ... USING GIST(geography_column)` - Index for spatial queries

## Try It

Run the example and observe:
1. Query plans showing GIN bitmap scans for text/JSONB
2. Query plans showing GiST index scans for geospatial
3. Full-text search with AND, OR, and prefix operators
4. JSONB queries with containment and key existence
5. Combined queries using multiple specialized indexes

Check manually:
```bash
psql -h localhost -p 5432 -U demo -d ecommerce

-- Check extensions
\dx

-- View table structure
\d posts

-- View indexes
\di+ posts*

-- Full-text search
SELECT username, content, ts_rank(content_tsv, to_tsquery('english', 'postgresql')) as rank
FROM posts
WHERE content_tsv @@ to_tsquery('english', 'postgresql')
ORDER BY rank DESC;

-- JSONB query
SELECT username, metadata->'tags' as tags
FROM posts
WHERE metadata @> '{"tags": ["database"]}';

-- Geospatial query (posts within 10km of San Francisco)
SELECT username, ST_Distance(location, ST_MakePoint(-122.4194, 37.7749)::geography) / 1000 as km
FROM posts
WHERE ST_DWithin(location, ST_MakePoint(-122.4194, 37.7749)::geography, 10000)
ORDER BY location <-> ST_MakePoint(-122.4194, 37.7749)::geography;
```

## Production Considerations

### Full-Text Search: PostgreSQL vs Elasticsearch

| Aspect | PostgreSQL FTS | Elasticsearch |
|--------|---------------|---------------|
| **Best for** | < 10M documents, simple queries | Complex queries, faceting, analytics |
| **Pros** | No extra infrastructure, ACID transactions | Purpose-built, horizontal scaling, rich query DSL |
| **Cons** | Limited features, harder to scale | Extra complexity, eventual consistency |
| **When to use** | Search is secondary feature | Search is core feature |

**PostgreSQL is sufficient when:**
- Search volume < 10M documents
- Simple keyword search with ranking
- Search is coupled with transactional data
- Want to avoid operational complexity

**Use Elasticsearch when:**
- Complex queries (faceting, aggregations, highlighting)
- Search is primary feature
- Need horizontal scaling
- Analytics on search data

### JSONB: Flexible vs Normalized Schema

**Use JSONB for:**
- Truly flexible schemas (user preferences, settings)
- Semi-structured data with varying fields
- Rapid prototyping before schema solidifies
- Data that changes frequently in structure

**Use separate columns for:**
- Data with known, stable schema
- Frequent updates to specific fields
- Complex joins and aggregations
- Strong type enforcement needed

**Trade-offs:**
- JSONB: Flexibility, but harder to enforce constraints and query efficiently
- Normalized: Structure, but requires migrations for schema changes
- GIN index on JSONB grows with document complexity

### PostGIS: PostgreSQL vs Specialized Geospatial DBs

| Aspect | PostgreSQL PostGIS | MongoDB Geo | Elasticsearch Geo |
|--------|-------------------|-------------|-------------------|
| **Best for** | < 100M points, moderate complexity | Large-scale, simple geo queries | Geo + search combined |
| **Index type** | GiST | 2dsphere | BKD tree |
| **Pros** | Mature, feature-rich, ACID | Horizontal scaling, simple API | Combined text + geo search |
| **Cons** | Vertical scaling limits | Fewer geo operations | Complex setup |

**PostgreSQL PostGIS is sufficient when:**
- Data volume < 100M points
- Complex spatial operations (intersections, buffers, unions)
- Geospatial data coupled with transactional data
- ACID guarantees required

**Use specialized geo DB when:**
- Billions of points
- Primary use case is geospatial
- Need horizontal scaling for geo queries
- Simple proximity/bounding box queries

### Index Maintenance

**GIN Indexes:**
- Larger than B-tree indexes (stores all tokens/keys)
- Slower to build (can take hours on large tables)
- `fastupdate=on` (default): Batches updates for performance
- Run `VACUUM` regularly to prevent bloat
- Consider `gin_pending_list_limit` for bulk updates

**GiST Indexes:**
- Balanced tree structure for geometric data
- Lossy (may require heap access for exact results)
- Periodic `REINDEX` may improve query performance
- Monitor with `pg_stat_user_indexes`

**Monitoring:**
```sql
-- Index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'posts';

-- Index size
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
WHERE tablename = 'posts';

-- Unused indexes (candidates for removal)
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE 'pg_%';
```

### When to Start Simple and When to Migrate

**Start with PostgreSQL when:**
- Building MVP or early-stage product
- Uncertain about scale and requirements
- Want to minimize operational complexity
- Search/geo is secondary to core business logic

**Migrate to specialized tools when:**
- PostgreSQL becomes bottleneck (slow queries, high CPU)
- Need features not available in PostgreSQL
- Query patterns justify specialized tools
- Have resources to manage additional infrastructure

**Migration strategy:**
- Dual-write to both systems during transition
- Use PostgreSQL as source of truth initially
- Gradually shift reads to specialized system
- Monitor performance and rollback if needed

## Performance Tips

1. **Full-Text Search:**
   - Use `tsvector` column instead of generating on each query
   - Consider trigger to auto-update `tsvector` on insert/update
   - Use `setweight()` to prioritize title over body
   - Combine with pg_trgm for fuzzy matching

2. **JSONB:**
   - Use `jsonb_path_ops` GIN operator class for containment-only queries (smaller index)
   - Avoid deep nesting (impacts index size and query performance)
   - Extract frequently-queried fields to separate columns
   - Use expression indexes for specific JSON paths

3. **PostGIS:**
   - Always use geography for lat/lon (handles Earth curvature)
   - Use geometry for planar coordinates (e.g., local surveys)
   - Create spatial indexes on both columns when joining
   - Consider partitioning by geographic region (e.g., by city/country)

## Further Reading

- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [JSONB Indexing](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [GIN Indexes](https://www.postgresql.org/docs/current/gin.html)
- [GiST Indexes](https://www.postgresql.org/docs/current/gist.html)
- [When to use Elasticsearch](https://www.elastic.co/guide/en/elasticsearch/reference/current/sql-translate.html)
