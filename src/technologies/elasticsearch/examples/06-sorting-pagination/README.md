# Sorting & Pagination: Result Navigation

## What

Demonstrates Elasticsearch sorting and pagination strategies: single and multi-field sorting, basic from/size pagination, efficient search_after cursor-based pagination, and Point-in-Time API for consistent pagination across index changes.

## Why

Pagination is critical for UX in search applications. Different strategies have different tradeoffs: from/size is simple but slow for deep pagination, search_after is efficient but stateless, and PIT ensures consistency. Understanding these tradeoffs is essential for system design interviews involving search or large result sets.

## How

The example demonstrates book catalog browsing:
- **Single-field Sort**: Sort by price, rating, date, etc.
- **Multi-field Sort**: Primary + secondary sort (e.g., rating DESC, price ASC)
- **from/size Pagination**: Simple offset-based pagination
- **search_after Pagination**: Cursor-based, stateless, efficient for deep pagination
- **Point-in-Time (PIT)**: Consistent snapshot for pagination across index changes

## Key Commands

- `sort` - Sort results by field(s)
- `from/size` - Offset-based pagination
- `search_after` - Cursor-based pagination with sort values
- `openPointInTime` - Create consistent snapshot
- `closePointInTime` - Release PIT resources
- Multi-field sort with array of sort criteria

## Try It

Run the example and observe:
1. Single-field sort (by price, rating, date)
2. Multi-field sort breaks ties with secondary field
3. from/size pagination is simple (page 1, page 2)
4. search_after uses last result's sort values as cursor
5. PIT ensures consistent view during pagination
6. Always include _id in sort for deterministic ordering

Check the performance difference between from/size and search_after.

## Production Considerations

**Pagination Strategy:**
- from/size: Simple, good for shallow pagination (<10k results)
- search_after: Efficient for deep pagination, no random access
- PIT: Use with search_after for consistency across changes
- scroll API: Deprecated, use PIT + search_after instead

**Performance:**
- from/size cost: O(from + size) documents processed per shard
- Deep pagination (from: 10000) is expensive - avoid
- search_after: O(size) performance regardless of depth
- PIT has small overhead but ensures consistency
- Always sort by a tie-breaker field (_id) for determinism

**UX Patterns:**
- "Load more" / infinite scroll: Use search_after
- Traditional pagination with page numbers: Use from/size (limit max pages)
- Export/download: Use PIT + search_after for consistency
- Real-time feeds: Use search_after with timestamp sort
- Random access (jump to page 100): Accept performance cost or pre-aggregate

**Sorting Considerations:**
- Sort on keyword fields, not text (text can't sort)
- Multi-field sort has minimal overhead
- _score as first sort for relevance-based pagination
- Date ranges + sort by date for time-series data
- Numeric sorts are fast (indexed in doc_values)

**Deep Pagination Problem:**
- Elasticsearch limits from + size to 10,000 by default (index.max_result_window)
- Deep pagination requires processing many documents on each shard
- Coordinator node must merge sorted results from all shards
- Use search_after or limit pagination depth

**Consistency:**
- Without PIT, index changes can cause duplicates/missing results
- PIT creates snapshot - changes during pagination not visible
- PIT expires (keep_alive), must refresh or accept expiration
- Trade-off: consistency vs freshness

**Alternatives:**
- PostgreSQL LIMIT/OFFSET for relational data (same deep pagination issues)
- Keyset pagination (WHERE id > last_id) similar to search_after
- Materialized views for pre-computed pages
- Client-side pagination after fetching larger set (small datasets only)

**Interview Examples:**
- "Design Twitter feed pagination" - search_after with timestamp
- "Paginate through millions of search results" - search_after + PIT
- "Design e-commerce product listing" - from/size for few pages
- "Export all search results" - PIT + search_after iteration
- "Sort by relevance then price" - multi-field sort

## Further Reading

- [Sort Search Results](https://www.elastic.co/guide/en/elasticsearch/reference/current/sort-search-results.html)
- [Paginate Search Results](https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html)
- [Search After](https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html#search-after)
- [Point in Time API](https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html)
