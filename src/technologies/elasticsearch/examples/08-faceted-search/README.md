# Faceted Search: Multi-Dimensional Filtering

## What

Demonstrates faceted search (faceted navigation) by combining queries with aggregations to build e-commerce-style filtering. Shows how to generate facet counts, apply filters while maintaining facet visibility, and enable multi-dimensional product discovery.

## Why

Faceted search is the standard UX pattern for e-commerce, job boards, real estate, and any catalog with multiple filterable dimensions. Users expect to see available filters (facets) with counts and apply multiple filters simultaneously. Critical for interviews involving product search, catalog design, or filtering systems.

## How

The example demonstrates book catalog search:
- **Build Facets**: Use aggregations to generate category, price, rating facets
- **Show Counts**: Display number of products in each facet bucket
- **Apply Filters**: Use bool query filters to narrow results
- **Maintain Facets**: Run aggregations on filtered results to update counts
- **Multi-Faceted**: Combine multiple filters (category + price + rating + availability)
- **Range Facets**: Price ranges, rating ranges for numeric fields

## Key Commands

- `terms` aggregation - Generate categorical facets (category, brand)
- `range` aggregation - Generate numeric range facets (price, rating)
- `bool` query with `filter` - Apply facet selections
- Combine query + aggregations - Get filtered results + facet counts
- `size: 0` - Get only facets without documents (for initial load)

## Try It

Run the example and observe:
1. Initial facets show distribution across all books
2. Category facet shows count per category
3. Price and rating range facets group into buckets
4. Applying category filter updates other facet counts
5. Multiple filters combine (AND logic)
6. Results sorted by relevance, price, or rating

Check how facet counts change as filters are applied.

## Production Considerations

**Facet Design:**
- Show facets with counts (users need to see options)
- Order facets by count (most popular first) or alphabetically
- Limit facet values (top 10-20) to avoid overwhelming UI
- Use range aggregations for numeric fields (price, rating)
- Consider hierarchical facets (category > subcategory)

**Query + Aggregation Pattern:**
- Query filters results, aggregations run on filtered set
- Use filter context (not query context) for facets - no scoring needed
- All facets should run on same filtered results for consistency
- Consider post_filter for special cases (facets see all, results filtered)

**Multi-Select Facets:**
- Use terms query with array for OR logic within facet
- Combine different facet types with AND logic
- Example: (Programming OR Computer Science) AND (price < $80) AND (rating >= 4.5)
- UI should show selected facets with remove option

**Performance:**
- Aggregations efficient with doc_values (columnar storage)
- High-cardinality facets (e.g., author) can be expensive
- Use `size` parameter to limit facet values returned
- Consider composite aggregations for pagination of facets
- Cache common facet queries at application layer

**Facet Count Accuracy:**
- Terms aggregations approximate at scale (shard_size parameter)
- Default shard_size = size * 1.5 + 10 for accuracy
- Increase shard_size for more accurate counts (performance cost)
- For exact counts, use composite aggregations

**Post-Filter Pattern:**
- Use post_filter when facets should see all results but documents filtered
- Example: Show all color facets, but filter results by selected color
- More expensive than filter in query (aggregations run on more documents)
- Only use when facet counts should not change with selection

**UX Patterns:**
- Show applied filters at top with remove option
- Disable/hide facets with zero results (or show greyed out)
- Indicate facet hierarchy (breadcrumbs)
- Support facet search for high-cardinality facets (search brands)
- "Clear all filters" option

**Alternatives:**
- Algolia for simpler implementation (managed service)
- PostgreSQL with JSON columns for basic faceting
- Solr for similar faceting capabilities
- Custom implementation with Redis for small catalogs

**Interview Examples:**
- "Design Amazon product search" - Multi-faceted filtering
- "Design job board search" - Location, salary, skills facets
- "Design real estate search" - Price, bedrooms, location facets
- "Design e-commerce catalog" - Category, brand, price, rating facets
- "Show available filters with counts" - Aggregation-based facets

## Further Reading

- [Aggregations](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html)
- [Terms Aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html)
- [Range Aggregation](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-range-aggregation.html)
- [Post Filter](https://www.elastic.co/guide/en/elasticsearch/reference/current/filter-search-results.html#post-filter)
