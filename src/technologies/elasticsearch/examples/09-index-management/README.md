# Index Management: Mappings & Reindexing

## What

Demonstrates Elasticsearch index management including custom analyzers, explicit mappings, reindexing for schema changes, and index aliases for zero-downtime migrations. Shows the complete lifecycle of evolving an index in production.

## Why

Production systems require schema evolution without downtime. Elasticsearch mappings are immutable once created, so adding/changing fields requires reindexing. Aliases enable zero-downtime transitions. Critical for interviews involving schema evolution, database migrations, or production system design.

## How

The example demonstrates evolving a book catalog:
- **Custom Analyzer**: Define text processing rules (tokenization, stopwords, stemming)
- **Explicit Mappings**: Control field types and indexing behavior
- **Analyze API**: Test analyzer behavior before applying
- **Aliases**: Point to current index version for client transparency
- **Reindex API**: Copy documents between indices with optional transformations
- **Atomic Alias Switch**: Update alias without downtime

## Key Commands

- `PUT /index` with `settings.analysis` - Define custom analyzers
- `PUT /index` with `mappings` - Define field types and properties
- `POST /index/_analyze` - Test analyzer behavior
- `PUT /index/_alias/name` - Create alias
- `POST /_reindex` - Copy documents between indices
- `POST /_aliases` - Atomically update aliases

## Try It

Run the example and observe:
1. Custom analyzer removes stopwords and normalizes text
2. Explicit mappings control field types
3. Alias 'books' points to books_v1
4. books_v2 created with additional fields (rating, categories)
5. Reindex copies all documents from v1 to v2
6. Alias switched atomically from v1 to v2
7. Applications use 'books' alias, unaware of version

Check how the analyzer tokenizes text - stopwords removed.

## Production Considerations

**Mapping Immutability:**
- Cannot change existing field types after indexing
- Cannot change analyzer for existing fields
- Can add new fields to existing indices
- For incompatible changes, must reindex to new index
- Plan mappings carefully before production

**Custom Analyzers:**
- Define for domain-specific text processing
- Standard components: tokenizer, character filters, token filters
- Test with _analyze API before deploying
- Analyzers set at index creation, cannot change later
- Use same analyzer for index and search

**Reindexing Strategy:**
- Create new index with updated mapping
- Reindex data from old to new index
- Can run while serving traffic (source index read-only or accepting writes)
- Use scroll/slice for large indices (parallel reindexing)
- Monitor progress and handle errors

**Zero-Downtime Migration:**
1. Create new index (books_v2) with updated schema
2. Reindex data from old (books_v1) to new
3. Optionally: dual-write to both indices during transition
4. Switch alias atomically in single API call
5. Delete old index after validation
6. Applications use alias, unaware of transition

**Alias Patterns:**
- Write alias: Direct new documents to specific index
- Read alias: Query current version
- Filtered aliases: Subset of documents per tenant/category
- Routing aliases: Shard-level routing for performance

**Performance:**
- Reindexing large indices takes time (hours for TB-scale)
- Use wait_for_completion=false for async reindexing
- Slice reindexing for parallelization
- Tune refresh_interval during reindex (set to -1, restore after)
- Monitor cluster health during large reindexes

**Data Transformation:**
- Reindex can include script to transform documents
- Add computed fields, rename fields, change formats
- Example: Split full_name into first_name + last_name
- Test transformations on subset before full reindex

**Rollback Strategy:**
- Keep old index until validation complete
- Can switch alias back if issues found
- Monitor error logs and query performance after switch
- Have rollback plan ready

**Alternatives:**
- Relational databases: ALTER TABLE (often requires locking)
- MongoDB: Flexible schema, no reindexing needed
- DynamoDB: Add attributes without schema change
- Cassandra: ALTER TABLE (limited, careful planning needed)

**Interview Examples:**
- "How do you add a field to Elasticsearch index?" - Reindex pattern
- "Zero-downtime schema migration" - Alias switching strategy
- "How do you change a field type?" - Create new index, reindex
- "Custom text processing for search" - Custom analyzer design
- "Index versioning strategy" - Alias-based approach

## Further Reading

- [Mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)
- [Analysis](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis.html)
- [Reindex API](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-reindex.html)
- [Index Aliases](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-aliases.html)
- [Custom Analyzers](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis-custom-analyzer.html)
