# Complex Queries: Bool, Nested, Filtering

## What

Demonstrates advanced Elasticsearch query patterns combining bool queries (must, should, filter, must_not), nested document queries, and query vs filter context for multi-faceted search.

## Why

Real-world search requires combining multiple conditions: text matching, filters, exclusions, and nested data queries. Critical for interviews involving product search ("Design Amazon search"), job boards, or any multi-faceted filtering. Understanding query vs filter context is key to performance optimization.

## How

The example demonstrates book search with reviews:
- **Bool Query**: Combine multiple conditions with must, should, filter, must_not
- **Must**: Required conditions that affect relevance scoring
- **Filter**: Required conditions that don't affect scoring (faster, cacheable)
- **Should**: Optional conditions that boost scores
- **Must_Not**: Exclusion conditions
- **Nested Queries**: Query relationships within nested objects (reviews)
- **Query Context vs Filter Context**: Scoring vs non-scoring operations

## Key Commands

- `bool` query - Combine multiple query clauses
- `must` - Required, affects scoring
- `filter` - Required, no scoring (faster)
- `should` - Optional, boosts score
- `must_not` - Exclusion, no scoring
- `nested` query - Query nested objects maintaining relationships
- `minimum_should_match` - Control how many should clauses must match

## Try It

Run the example and observe:
1. Bool query combines text match + filters + boosts
2. must clauses affect relevance score
3. filter clauses don't affect score (notice identical scores)
4. must_not excludes documents
5. Nested queries maintain review field relationships
6. Complex queries combine all patterns for business logic

Check the _score field - filters don't contribute to scoring.

## Production Considerations

**Query vs Filter Context:**
- Use filter for exact matches, ranges, boolean checks (term, range, exists)
- Use query for full-text search and relevance scoring (match, match_phrase)
- Filters are cacheable and faster (no scoring calculation)
- Filters bypass scoring entirely, use for non-relevance criteria
- Move as much as possible to filter context for performance

**Bool Query Design:**
- Combine specific filters with broad text queries
- Use filter for constraints (price, category, in_stock)
- Use must for primary search terms (affects scoring)
- Use should for boosting (e.g., prefer certain categories)
- Use must_not sparingly (still requires document evaluation)

**Nested Objects:**
- Use nested type to maintain object relationships
- Without nested, arrays are flattened (cross-object matching possible)
- Nested queries have performance cost (separate hidden documents)
- Alternative: Denormalize or use parent-child relationships
- Consider if nested complexity is worth it for your use case

**Performance:**
- Filter context is faster - use for non-scored criteria
- Filters are cached by Elasticsearch automatically
- Nested queries are more expensive than flat documents
- Use minimum_should_match to reduce candidates
- Profile API (`_search?profile=true`) to understand query performance

**Common Patterns:**
- Product search: bool with filters (price, category) + text match
- Job search: bool with location + skills + salary filters
- Event search: date range filters + text search + category filters
- Combine nested (reviews) with top-level filters (price)

**Alternatives:**
- PostgreSQL full-text + WHERE clauses for relational data
- Simple key-value filters in Redis (no complex queries)
- Dedicated faceted search engines (Algolia) for simpler use cases

**Interview Examples:**
- "Design Amazon product search" - bool with category, price, rating filters
- "Design job board search" - location, skills, salary, experience filters
- "Find products with reviews > 4 stars" - nested review queries
- "Search excluding out-of-stock items" - must_not patterns
- "Boost certain categories in search" - should clauses

## Further Reading

- [Bool Query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-bool-query.html)
- [Query and Filter Context](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html)
- [Nested Query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-nested-query.html)
- [Minimum Should Match](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-minimum-should-match.html)
