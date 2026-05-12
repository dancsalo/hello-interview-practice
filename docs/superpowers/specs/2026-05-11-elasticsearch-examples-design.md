# Elasticsearch Examples - Design Specification

**Date:** 2026-05-11  
**Status:** Approved  
**Goal:** Create 10 interview-focused Elasticsearch examples that mirror the Redis format and style

---

## Overview

This project adds comprehensive Elasticsearch examples to the system design interview preparation platform, following the hybrid approach (Option C) that balances complete coverage with practical interview scenarios. The implementation will match Redis in structure, quality, and educational value while showcasing Elasticsearch's unique strengths in search, geospatial queries, and analytics.

## Goals

1. **Education**: Teach Elasticsearch through hands-on, runnable examples
2. **Interview Prep**: Cover patterns that appear in real system design interviews
3. **Consistency**: Mirror Redis implementation structure and UX exactly
4. **Integration**: Seamless integration with existing CLI, Docker, and testing infrastructure
5. **Quality**: Production-ready patterns with comprehensive documentation

## Architecture

### Project Structure

```
src/technologies/elasticsearch/
├── README.md                    # Technology overview (mirrors Redis README)
├── index.ts                     # Example exports
└── examples/
    ├── 01-basics/
    │   ├── README.md           # What, Why, How, Production Considerations
    │   └── index.ts            # Runnable example with assertions
    ├── 02-full-text-search/
    ├── 03-geospatial-search/
    ├── 04-aggregations/
    ├── 05-complex-queries/
    ├── 06-sorting-pagination/
    ├── 07-document-versioning/
    ├── 08-faceted-search/
    ├── 09-index-management/
    └── 10-production-patterns/
```

### Infrastructure Components

**New Files:**
- `src/technologies/elasticsearch/` directory (21 files total)
- `src/lib/elasticsearch-client.ts` - Client wrapper implementing TechnologyClient
- `scripts/reset-elasticsearch.ts` - Data reset script
- `test/elasticsearch-examples.test.ts` - Integration tests

**Updated Files:**
- `docker-compose.yml` - Add Elasticsearch and Kibana services
- `package.json` - Add @elastic/elasticsearch dependency and scripts
- `src/cli.ts` - Add Elasticsearch to technology menu
- `src/lib/types.ts` - Extend types for generic technology clients
- `src/lib/docker-utils.ts` - Add Elasticsearch/Kibana health checks
- `README.md` - Update technology list and services documentation
- `.env.example` - Add Elasticsearch environment variables

## The 10 Examples

### 1. Basics - Core Concepts
**What:** Documents, indices, mappings, CRUD operations  
**Why:** Foundation for all Elasticsearch usage  
**Demo:** Create books index, define mappings, add/retrieve/update/delete documents  
**Key Concepts:** Document structure, index creation, explicit vs dynamic mappings, field types  
**Interview:** "How would you store product catalog data in Elasticsearch?"

### 2. Full-Text Search - Text Analysis & Matching
**What:** Match queries, phrase matching, fuzzy search, text analysis  
**Why:** Core strength of Elasticsearch - finding documents by content  
**Demo:** Search books by title/description, demonstrate tokenization, stemming, relevance scoring  
**Key Concepts:** Analyzers, tokenizers, TF-IDF scoring, match vs match_phrase vs fuzzy  
**Interview:** "Design a search feature for an e-commerce site"

### 3. Geospatial Search - Location Queries
**What:** geo_point fields, geo_distance queries, proximity search  
**Why:** Critical for location-based services (Yelp, Uber, DoorDash)  
**Demo:** Find restaurants within radius, sort by distance, combine with filters  
**Key Concepts:** geo_point vs geo_shape, geohashes, BKD trees, radius queries  
**Interview:** "Design Yelp - find nearby restaurants" or "Design Uber"

### 4. Aggregations - Analytics & Bucketing
**What:** Metrics aggregations (avg, sum, min, max), bucket aggregations (terms, histogram, date_histogram)  
**Why:** Powerful analytics without loading all documents - dashboard/reporting use cases  
**Demo:** Calculate average book price, group by category, time-series sales analysis  
**Key Concepts:** Aggregation pipeline, bucket vs metric aggs, doc_values role  
**Interview:** "Design an analytics dashboard showing sales trends"

### 5. Complex Queries - Bool, Nested, Filtering
**What:** Bool queries (must, should, filter, must_not), nested documents, filtering strategies  
**Why:** Real-world queries combine multiple conditions with scoring and filtering  
**Demo:** Find books matching text + price range + category + rating, nested review queries  
**Key Concepts:** Query vs filter context, scoring impact, nested object handling  
**Interview:** "How do you handle multi-faceted product search with filters?"

### 6. Sorting & Pagination - Result Navigation
**What:** Field sorting, multi-field sorting, from/size, search_after, Point-in-Time (PIT)  
**Why:** Critical for UX - different pagination strategies have different tradeoffs  
**Demo:** Sort by relevance/price/date, paginate through results with different methods  
**Key Concepts:** Deep pagination problems, stateless vs stateful pagination, consistency  
**Interview:** "How do you handle pagination for millions of search results?"

### 7. Document Versioning - Concurrent Updates
**What:** Optimistic concurrency control, version numbers, partial updates  
**Why:** Prevent lost updates in distributed systems  
**Demo:** Update book price with version check, demonstrate conflict handling, partial updates  
**Key Concepts:** _version field, external versioning, retry strategies  
**Interview:** "How do you handle concurrent updates to product inventory?"

### 8. Faceted Search - Multi-Dimensional Filtering
**What:** Combine aggregations + queries for e-commerce-style faceted navigation  
**Why:** Standard pattern for product catalogs, job boards, real estate sites  
**Demo:** Build category/price/rating facets, show counts per facet, apply filters  
**Key Concepts:** Post-filter aggregations, filter vs query context for facets  
**Interview:** "Design Amazon's product search with category/price/rating filters"

### 9. Index Management - Mappings & Configuration
**What:** Explicit mappings, analyzers, field types, index settings, reindexing  
**Why:** Proper mapping is critical for performance and query capabilities  
**Demo:** Define custom analyzer, configure field mappings, demonstrate mapping limitations, reindex  
**Key Concepts:** Text vs keyword, custom analyzers, mapping immutability, reindexing strategies  
**Interview:** "How do you handle schema changes in Elasticsearch?"

### 10. Production Patterns - CDC, Sync, Performance
**What:** Change Data Capture (CDC), sync strategies, performance optimization, monitoring  
**Why:** Elasticsearch is rarely the source of truth - must stay in sync with primary DB  
**Demo:** Simulate CDC from PostgreSQL to Elasticsearch, demonstrate sync patterns  
**Key Concepts:** Eventual consistency, dual writes vs CDC, refresh intervals, bulk indexing  
**Interview:** "How do you keep Elasticsearch in sync with your primary database?"

## Technical Implementation

### Docker Services

Add to `docker-compose.yml`:

```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
  container_name: system-design-elasticsearch
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false
    - ES_JAVA_OPTS=-Xms512m -Xmx512m
  ports:
    - "${ELASTICSEARCH_PORT:-9200}:9200"
  volumes:
    - elasticsearch-data:/usr/share/elasticsearch/data
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 1G

kibana:
  image: docker.elastic.co/kibana/kibana:8.12.0
  container_name: system-design-kibana
  ports:
    - "${KIBANA_PORT:-5601}:5601"
  environment:
    - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
  depends_on:
    elasticsearch:
      condition: service_healthy
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:5601/api/status || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 512M

volumes:
  elasticsearch-data:
```

**Why these settings:**
- Single-node mode for local development simplicity
- Security disabled for easier local access (not production)
- Memory limits prevent resource exhaustion
- Health checks ensure services are ready before examples run

### TypeScript Client

Create `src/lib/elasticsearch-client.ts`:

```typescript
import { Client } from '@elastic/elasticsearch';
import type { TechnologyClient } from './types.js';

export class ElasticsearchClient implements TechnologyClient {
  private client: Client;
  
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
    });
  }
  
  async connect(): Promise<void> {
    await this.client.ping();
  }
  
  async disconnect(): Promise<void> {
    await this.client.close();
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.client.cluster.health();
      return health.status !== 'red';
    } catch {
      return false;
    }
  }
  
  async reset(): Promise<void> {
    await client.indices.delete({
      index: '*,-.*',  // All except system indices
      ignore_unavailable: true,
      allow_no_indices: true
    });
  }
  
  getClient(): Client {
    return this.client;
  }
}
```

### Example Implementation Pattern

Each example follows this structure:

```typescript
import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const exampleName = {
  name: 'Example: Title',
  description: 'Brief description',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Example: Title');
    logger.info('Context and use case\n');

    logger.step('Step 1: Operation description');
    // Perform operation
    logger.command('API call representation', 'result');
    logger.assert(condition, 'Success message');
    logger.production('Production tip or consideration\n');

    // Additional steps...

    logger.success('\n✓ Example completed!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'index_name', ignore_unavailable: true });
  }
};
```

**Key patterns:**
- `refresh: 'wait_for'` after index operations for immediate searchability
- Explicit index creation with mappings
- JSON query DSL structure
- Cleanup removes all created indices
- NonInteractive mode support for testing

### Data Models

**Examples 1-2, 5-10 (Bookstore):**
```javascript
{
  title: "The Great Gatsby",           // text - full-text searchable
  author: "F. Scott Fitzgerald",       // keyword - exact matching
  description: "A novel about...",     // text - full-text searchable
  price: 10.99,                        // float
  publish_date: "1925-04-10",          // date
  categories: ["Classic", "Fiction"],  // keyword array
  inventory_count: 45,                 // integer
  reviews: [                           // nested
    {
      user: "reader1",                 // keyword
      rating: 5,                       // integer
      comment: "A masterpiece!"        // text
    }
  ]
}
```

**Example 3 (Restaurants):**
```javascript
{
  name: "Joe's Pizza",                           // text
  cuisine: "Italian",                            // keyword
  location: { lat: 40.7128, lon: -74.0060 },    // geo_point
  rating: 4.5,                                   // float
  price_range: "$$",                             // keyword
  delivery_zone: {                               // geo_shape
    type: "polygon",
    coordinates: [...]
  }
}
```

**Example 4 (Orders):**
```javascript
{
  order_id: "ORD-123",              // keyword
  customer_id: "CUST-456",          // keyword
  total: 125.50,                    // float
  items: [...],                     // nested
  order_date: "2026-05-11T10:30",   // date
  status: "completed"               // keyword
}
```

### Logger Output Format

Match Redis examples exactly:

```typescript
// Section header
logger.section('📦 Elasticsearch Example: Full-Text Search');
logger.info('Book catalog search with relevance scoring\n');

// Steps with commands
logger.step('Step 1: Create index with text analysis');
await client.indices.create({ ... });
logger.command('PUT /books/_mapping', '{ "properties": { ... } }');
logger.success('Mapping configured with text analyzer');

// Assertions
logger.assert(result.acknowledged, 'Index created successfully');

// Production tips
logger.production('Use match_phrase for exact phrases, fuzzy for typo tolerance\n');

// Success
logger.success('\n✓ Full-text search demonstrated!');
```

### README Structure

Each example README follows this format:

```markdown
# Example Title

## What
Brief description of what this example demonstrates

## Why
- Interview relevance
- Real-world use cases
- When you'd use this pattern

## How
Explanation of the implementation approach and key operations

## Key Commands
- `POST /index/_doc` - Index a document
- `GET /index/_search` - Search documents
- `PUT /index/_mapping` - Define field mappings
- ...

## Try It
What to observe when running:
1. Relevance scores in search results
2. Query execution time
3. Document structure in Kibana
4. ...

## Production Considerations

**Performance:**
- Scaling challenges
- Memory implications
- Query optimization

**Reliability:**
- Failure modes
- Consistency guarantees
- Error handling

**Alternatives:**
- When NOT to use this pattern
- Simpler alternatives (e.g., Postgres full-text)
- When to use specialized tools

**Monitoring:**
- Key metrics to track
- Common issues
- Debugging approaches

## Further Reading
- [Official Elasticsearch docs](...)
- Related patterns
- Deep dive resources
```

### CLI Integration

Update `src/cli.ts`:

```typescript
const technologies = [
  { name: 'Redis', value: 'redis' },
  { name: 'Elasticsearch', value: 'elasticsearch' },
];

async function initializeTechnology(tech: string) {
  switch(tech) {
    case 'redis':
      return await initializeRedisClient();
    case 'elasticsearch':
      const esClient = new ElasticsearchClient();
      await esClient.connect();
      return esClient;
  }
}

async function loadExamples(tech: string) {
  const examples = await import(`./technologies/${tech}/index.js`);
  return examples.default;
}
```

Health checks before showing technology menu:

```typescript
const health = await Promise.all([
  checkRedisHealth(),
  checkElasticsearchHealth(),
  checkKibanaHealth(),
  checkPostgresHealth()
]);

// Show warnings for unhealthy services
// Filter available technologies based on health
```

### Testing Infrastructure

Create `test/elasticsearch-examples.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { StepByStepLogger } from '../src/lib/step-by-step-logger.js';
import { basicsExample } from '../src/technologies/elasticsearch/examples/01-basics/index.js';
// ... import all 10 examples

describe('Elasticsearch Examples', () => {
  let client: Client;
  let logger: StepByStepLogger;

  beforeAll(async () => {
    client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
    });
    logger = new StepByStepLogger();
    
    await waitForElasticsearch(client, 30000);
  });

  afterAll(async () => {
    await client.close();
  });

  it('should run basics example without errors', async () => {
    await basicsExample.run(client, logger, { nonInteractive: true });
    await basicsExample.cleanup?.(client);
    expect(logger.hasErrors()).toBe(false);
  });

  // Test all 10 examples...
});

async function waitForElasticsearch(client: Client, timeout: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await client.cluster.health();
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Elasticsearch not ready');
}
```

### Scripts

**Reset script** (`scripts/reset-elasticsearch.ts`):

```typescript
import { Client } from '@elastic/elasticsearch';

async function resetElasticsearch() {
  const client = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
  });

  console.log('🔄 Resetting Elasticsearch data...');
  
  try {
    await client.indices.delete({
      index: '*,-.*',
      ignore_unavailable: true,
      allow_no_indices: true
    });
    
    console.log('✅ Elasticsearch data reset successfully');
  } catch (error) {
    console.error('❌ Failed to reset Elasticsearch:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

resetElasticsearch();
```

**Package.json scripts:**

```json
{
  "scripts": {
    "reset:elasticsearch": "tsx scripts/reset-elasticsearch.ts",
    "reset": "npm run reset:redis && npm run reset:elasticsearch"
  }
}
```

## Technology Overview

### Key Concepts Document

`src/technologies/elasticsearch/README.md` will include:

**Introduction:**
- What is Elasticsearch? (distributed search engine, built on Lucene)
- Core architecture (nodes, indices, shards, replicas, segments)
- Why for interviews? (ubiquitous for search, well-understood tradeoffs)

**10 Examples Summary:**
- Each example with: What, Why, Key Concepts, Interview Relevance

**Elasticsearch vs Alternatives:**

| Scenario | Use Elasticsearch | Use Alternative |
|----------|-------------------|-----------------|
| Full-text search (>100k docs) | ✅ Yes | ❌ Too complex for small datasets |
| Geospatial queries | ✅ Native support | Use PostGIS if already on Postgres |
| Analytics/Aggregations | ✅ Fast, flexible | Use data warehouse for complex SQL |
| Primary data store | ❌ Not durable enough | Use Postgres, DynamoDB |
| Strong consistency | ❌ Eventually consistent | Use relational DB |
| High write throughput | ❌ Updates expensive | Use Kafka, time-series DB |
| Simple key-value lookup | ❌ Overkill | Use Redis, DynamoDB |

**Common Interview Questions:**

**Q: How does Elasticsearch achieve fast search?**  
A: Inverted index for O(1) term lookup, doc values for aggregations, immutable segments for efficient caching, distributed queries across shards in parallel.

**Q: How do you keep it in sync with your database?**  
A: Change Data Capture (CDC) with Debezium/Kafka, event-driven updates on writes, periodic full reindex as fallback. Never dual-write synchronously (consistency issues).

**Q: What are the consistency guarantees?**  
A: Eventually consistent. Refresh interval (default 1s) controls when writes become visible. Can force with `refresh: 'wait_for'` but impacts performance.

**Q: How does it scale?**  
A: Horizontal sharding distributes data/queries, replicas increase read throughput and availability. Optimal shard size is 20-50GB. Query coordination can become bottleneck.

**Q: When should you NOT use Elasticsearch?**  
A: Primary data store (durability), high update rates (expensive), strong consistency needs, small datasets (<100k docs), simple lookups, ACID transactions.

**Production Considerations:**

**Performance:**
- Bulk indexing (500-1000 docs per batch)
- Tune refresh interval for write-heavy (30s instead of 1s)
- Use routing for data co-location
- Monitor JVM heap, query latency, indexing rate

**Reliability:**
- Never use as primary data store
- CDC for sync (Debezium, Logstash, custom)
- Index aliases for zero-downtime reindexing
- Monitor cluster health, shard status

**Cost Optimization:**
- Appropriate shard count (not too many small shards)
- Hot/warm/cold architecture for time-series data
- Compression for older data
- Rightsizing based on query patterns

## Implementation Strategy

### Development Order

**Phase 1: Foundation (Examples 1-3)**
1. Docker services + dependencies
2. Client wrapper and types
3. CLI integration and health checks
4. Example 01: Basics
5. Example 02: Full-Text Search
6. Example 03: Geospatial Search

**Phase 2: Intermediate (Examples 4-6)**
7. Example 04: Aggregations
8. Example 05: Complex Queries
9. Example 06: Sorting & Pagination

**Phase 3: Advanced (Examples 7-10)**
10. Example 07: Document Versioning
11. Example 08: Faceted Search
12. Example 09: Index Management
13. Example 10: Production Patterns

**Phase 4: Polish**
14. Technology README with full context
15. Testing infrastructure
16. Reset scripts
17. Documentation updates
18. End-to-end validation

**Why this order:**
- Foundation establishes patterns for later examples
- Each example builds on previous concepts
- Can validate integration early
- Advanced examples require understanding basics

### File Count Summary

**New Files (25):**
- 1 technology README
- 1 technology index.ts
- 10 example index.ts files
- 10 example README.md files
- 1 client wrapper
- 1 reset script
- 1 test file

**Updated Files (7):**
- docker-compose.yml
- package.json
- src/cli.ts
- src/lib/types.ts
- src/lib/docker-utils.ts
- README.md
- .env.example

**Total: 32 files touched**

## Success Criteria

The implementation is complete when:

✅ **Functionality:**
- All 10 examples run successfully in interactive mode
- All 10 examples pass automated tests
- CLI integrates seamlessly with Elasticsearch technology
- Health checks reliably detect service status
- Reset scripts clean all Elasticsearch data

✅ **Quality:**
- Documentation matches Redis quality and depth
- Code follows existing project conventions
- Examples demonstrate interview-relevant patterns
- Production considerations are thorough and practical
- Logger output is clear and educational

✅ **Integration:**
- Docker services start reliably with health checks
- Kibana visualizes indexed data correctly
- Non-interactive mode works for testing
- Error handling is graceful and informative

✅ **Education:**
- Each example has clear What/Why/How
- Key concepts are explained inline
- Production tips are actionable
- Interview relevance is explicit
- Further reading provides depth

## Key Design Decisions

### Why Elasticsearch 8.12.0?
- Stable, well-tested version
- Compatible with Kibana 8.12.0
- Security can be disabled for local dev simplicity
- Well-documented

### Why Disable Security Locally?
- Simplifies local development (no auth setup)
- Matches Redis pattern (no auth required)
- Educational focus, not production deployment
- Can be mentioned in production considerations

### Why Single-Node Mode?
- Sufficient for learning and examples
- Reduces resource usage
- Simpler setup for students
- Multi-node complexity not needed for concepts

### Why Include Kibana?
- Powerful visualization tool
- Matches RedisInsight pattern
- Helps students see data structures
- Useful for debugging examples

### Why 10 Examples?
- Matches Redis for consistency
- Comprehensive coverage
- Progressive learning curve
- Interview-complete

### Why These Specific Examples?
- All appear in real interviews
- Cover full breadth of Elasticsearch capabilities
- Progress from basic to advanced naturally
- Balance "using" with "understanding"

### Why PostgreSQL Integration?
- Example 10 needs source DB for CDC demo
- Already in docker-compose for Redis cache example
- Realistic production pattern

## Risks & Mitigations

**Risk: Elasticsearch resource usage**
- Mitigation: Memory limits in docker-compose, single-node mode, clear docs on requirements

**Risk: Complex setup for students**
- Mitigation: Health checks ensure services ready, clear error messages, troubleshooting docs

**Risk: Examples too complex**
- Mitigation: Progressive difficulty, clear comments, step-by-step output

**Risk: Inconsistency with Redis**
- Mitigation: Follow Redis structure exactly, reuse logger patterns, match README format

**Risk: Maintenance burden**
- Mitigation: Comprehensive tests, clear documentation, follow existing patterns

## Future Enhancements

**Not in initial scope, but possible later:**
- Elasticsearch cluster examples (multi-node)
- Security configuration examples
- ILM (Index Lifecycle Management)
- Snapshot/restore
- Cross-cluster search
- Machine learning features
- More complex aggregations (pipeline aggs, bucket scripts)

These can be added as additional examples or advanced topics after the core 10 are proven.

---

## Summary

This design creates 10 high-quality Elasticsearch examples that:
- Mirror Redis format and style exactly
- Cover interview-essential patterns comprehensively
- Integrate seamlessly with existing infrastructure
- Provide educational value through clear documentation
- Demonstrate production-ready patterns and considerations

The hybrid approach balances breadth (10 examples like Redis) with depth (interview-focused patterns), ensuring students get comprehensive Elasticsearch knowledge for system design interviews.
