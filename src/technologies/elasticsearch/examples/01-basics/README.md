# Elasticsearch Basics: Core Concepts

## What

Demonstrates fundamental Elasticsearch operations: creating indices, defining mappings, and CRUD operations (Create, Read, Update, Delete) on documents.

## Why

Understanding these building blocks is essential because all Elasticsearch patterns are built on top of them. Every search application starts with indexing documents and defining how fields should be stored and searched.

## How

The example shows e-commerce book catalog management:
- **Create Index**: Define schema with explicit field mappings
- **Index Document**: Add a book with title, author, price, publish date
- **Retrieve Document**: Get document by ID
- **Update Document**: Modify specific fields (partial update)
- **Search**: Find documents using match_all query
- **Delete**: Remove a document

## Key Commands

- `PUT /books` - Create index with mappings
- `POST /books/_doc` - Index a new document
- `GET /books/_doc/{id}` - Retrieve document by ID
- `POST /books/_update/{id}` - Update specific fields
- `GET /books/_search` - Search for documents
- `DELETE /books/_doc/{id}` - Delete a document

## Try It

Run the example and observe:
1. How explicit mappings define field types (text vs keyword, float, date)
2. Document ID generation (_id field)
3. Version numbers for updates (_version field)
4. The refresh parameter ensuring immediate searchability
5. Partial updates only modifying specified fields

Check Kibana at http://localhost:5601 to visualize the index and documents.

## Production Considerations

**Index Mappings:**
- Define mappings explicitly for predictable behavior
- text fields are analyzed for full-text search (tokenized)
- keyword fields are exact-match (not tokenized)
- Mappings are immutable - require reindexing to change

**Document Operations:**
- Use `refresh: 'wait_for'` for immediate searchability in tests
- In production, default refresh interval (1s) balances latency and performance
- Bulk API is much more efficient for multiple documents (500-1000 per batch)
- Updates are actually delete + reindex operations under the hood

**Performance:**
- Avoid frequent updates - Elasticsearch optimized for read-heavy workloads
- Each document update increments _version for optimistic concurrency
- Deleted documents aren't immediately removed (cleaned up during segment merges)
- Small indices (<1M docs) can use single shard

**Alternatives:**
- For simple key-value lookups, use Redis or DynamoDB (faster, simpler)
- For small datasets (<100k docs), Postgres full-text search may suffice
- For high-write throughput, consider Kafka or time-series databases

## Further Reading

- [Elasticsearch Mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)
- [Index APIs](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices.html)
- [Document APIs](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs.html)
