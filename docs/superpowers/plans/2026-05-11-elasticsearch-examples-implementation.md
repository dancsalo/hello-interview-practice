# Elasticsearch Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create 10 interview-focused Elasticsearch examples that mirror Redis format and style

**Architecture:** Add Elasticsearch + Kibana Docker services, create client wrapper, implement 10 progressive examples (basics → advanced), integrate with existing CLI/testing infrastructure, comprehensive documentation mirroring Redis structure

**Tech Stack:** Elasticsearch 8.12.0, Kibana 8.12.0, @elastic/elasticsearch client, TypeScript, Docker, Vitest

---

## File Structure

**New files (25):**
- `src/technologies/elasticsearch/README.md` - Technology overview
- `src/technologies/elasticsearch/index.ts` - Example exports
- `src/technologies/elasticsearch/client.ts` - Client wrapper
- `src/technologies/elasticsearch/examples/01-basics/index.ts` + `README.md`
- `src/technologies/elasticsearch/examples/02-full-text-search/index.ts` + `README.md`
- `src/technologies/elasticsearch/examples/03-geospatial-search/index.ts` + `README.md`
- `src/technologies/elasticsearch/examples/04-aggregations/index.ts` + `README.md`
- `src/technologies/elasticsearch/examples/05-complex-queries/index.ts` + `README.md`
- `src/technologies/elasticsearch/examples/06-sorting-pagination/index.ts` + `README.md`
- `src/technologies/elasticsearch/examples/07-document-versioning/index.ts` + `README.md`
- `src/technologies/elasticsearch/examples/08-faceted-search/index.ts` + `README.md`
- `src/technologies/elasticsearch/examples/09-index-management/index.ts` + `README.md`
- `src/technologies/elasticsearch/examples/10-production-patterns/index.ts` + `README.md`
- `scripts/reset-elasticsearch.ts` - Reset script
- `test/elasticsearch-examples.test.ts` - Integration tests

**Updated files (7):**
- `docker-compose.yml` - Add Elasticsearch/Kibana services
- `package.json` - Add dependencies and scripts
- `src/cli.ts` - Elasticsearch integration
- `src/lib/types.ts` - Generic Example type
- `src/lib/docker-utils.ts` - Health checks
- `README.md` - Update docs
- `.env.example` - Add env vars

---

## Phase 1: Foundation & Infrastructure

### Task 1: Docker Services Setup

**Files:**
- Modify: `docker-compose.yml:58-61` (after postgres service)
- Modify: `.env.example:1-9`

- [ ] **Step 1: Add Elasticsearch environment variables to .env.example**

```bash
# Elasticsearch
ELASTICSEARCH_PORT=9200
ELASTICSEARCH_URL=http://localhost:9200
KIBANA_PORT=5601
```

- [ ] **Step 2: Verify .env.example update**

Run: `cat .env.example | grep -A3 "Elasticsearch"`
Expected: Shows the 3 new Elasticsearch environment variables

- [ ] **Step 3: Add Elasticsearch service to docker-compose.yml**

Add after the postgres service (line 58):

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
      - elasticsearch-data:/data
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
```

- [ ] **Step 4: Add elasticsearch-data volume**

Add to volumes section at bottom of docker-compose.yml:

```yaml
volumes:
  redis-data:
  postgres-data:
  elasticsearch-data:
```

- [ ] **Step 5: Start Docker services and verify health**

Run: `docker-compose up -d elasticsearch kibana`
Expected: Services start successfully

Run: `docker-compose ps | grep -E "elasticsearch|kibana"`
Expected: Both services show "healthy" status (may take 30-60 seconds)

- [ ] **Step 6: Test Elasticsearch endpoint**

Run: `curl http://localhost:9200/_cluster/health`
Expected: JSON response with status "yellow" or "green"

- [ ] **Step 7: Test Kibana endpoint**

Run: `curl http://localhost:5601/api/status`
Expected: JSON response with overall state

- [ ] **Step 8: Commit Docker configuration**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add Elasticsearch and Kibana Docker services

Add Elasticsearch 8.12.0 and Kibana 8.12.0 services with:
- Single-node mode for local development
- Security disabled for simplicity
- Health checks for reliability
- Memory limits (1G for ES, 512M for Kibana)
- Environment variable configuration"
```

---

### Task 2: Dependencies and Package Configuration

**Files:**
- Modify: `package.json:1-50`

- [ ] **Step 1: Add @elastic/elasticsearch dependency**

Run: `npm install @elastic/elasticsearch@8.12.0`
Expected: Package installed successfully

- [ ] **Step 2: Add reset:elasticsearch script to package.json**

Add to scripts section:

```json
"reset:elasticsearch": "tsx scripts/reset-elasticsearch.ts",
```

- [ ] **Step 3: Update reset script to include elasticsearch**

Modify the "reset" script:

```json
"reset": "npm run reset:redis && npm run reset:elasticsearch",
```

- [ ] **Step 4: Verify package.json changes**

Run: `cat package.json | grep -A5 '"scripts"'`
Expected: Shows reset:elasticsearch script

Run: `cat package.json | grep '@elastic/elasticsearch'`
Expected: Shows @elastic/elasticsearch dependency

- [ ] **Step 5: Commit package changes**

```bash
git add package.json package-lock.json
git commit -m "feat: add Elasticsearch client dependency and scripts

Add @elastic/elasticsearch@8.12.0 and npm scripts for:
- reset:elasticsearch - Reset Elasticsearch data
- Updated reset script to include Elasticsearch"
```

---

### Task 3: Type Extensions

**Files:**
- Modify: `src/lib/types.ts:1-34`

- [ ] **Step 1: Update Example interface to be generic**

Replace the existing Example interface (lines 15-20) with:

```typescript
export interface Example<T = RedisClientType> {
  name: string;
  description: string;
  run: (client: T, logger: Logger, options?: { nonInteractive?: boolean }) => Promise<void>;
  cleanup?: (client: T) => Promise<void>;
}
```

- [ ] **Step 2: Verify types compile**

Run: `npm run build`
Expected: No type errors

- [ ] **Step 3: Commit type changes**

```bash
git add src/lib/types.ts
git commit -m "refactor: make Example interface generic for multiple technologies

Update Example<T> to support different client types (Redis, Elasticsearch).
Add optional nonInteractive parameter for testing mode."
```

---

### Task 4: Elasticsearch Client Wrapper

**Files:**
- Create: `src/technologies/elasticsearch/client.ts`
- Test: Manual verification with Docker

- [ ] **Step 1: Create elasticsearch directory**

Run: `mkdir -p src/technologies/elasticsearch/examples`
Expected: Directory created

- [ ] **Step 2: Write Elasticsearch client wrapper**

Create `src/technologies/elasticsearch/client.ts`:

```typescript
import { Client } from '@elastic/elasticsearch';
import type { TechnologyClient } from '../../lib/types.js';

export class ElasticsearchClient implements TechnologyClient {
  private client: Client | null = null;
  private url: string;

  constructor() {
    this.url = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = new Client({
      node: this.url,
    });

    // Verify connection
    await this.client.ping();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const health = await this.client.cluster.health();
      return health.status !== 'red';
    } catch (error) {
      return false;
    }
  }

  async reset(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    await this.client.indices.delete({
      index: '*,-.*',
      ignore_unavailable: true,
      allow_no_indices: true,
    });
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }
    return this.client;
  }
}
```

- [ ] **Step 3: Verify client compiles**

Run: `npm run build`
Expected: No errors, client.ts compiles successfully

- [ ] **Step 4: Test client connection manually**

Create test file `test-es-client.ts`:

```typescript
import { ElasticsearchClient } from './src/technologies/elasticsearch/client.js';

async function test() {
  const client = new ElasticsearchClient();
  await client.connect();
  const healthy = await client.healthCheck();
  console.log('Health check:', healthy);
  await client.disconnect();
}

test();
```

Run: `tsx test-es-client.ts`
Expected: Prints "Health check: true"

Run: `rm test-es-client.ts`
Expected: Test file removed

- [ ] **Step 5: Commit client wrapper**

```bash
git add src/technologies/elasticsearch/client.ts
git commit -m "feat: add Elasticsearch client wrapper

Implement ElasticsearchClient with TechnologyClient interface:
- Connection management with ping verification
- Health checks via cluster.health API
- Reset method to delete all non-system indices
- Error handling for disconnected state"
```

---

### Task 5: Health Check Integration

**Files:**
- Modify: `src/lib/docker-utils.ts:1-100`

- [ ] **Step 1: Read existing docker-utils structure**

Run: `cat src/lib/docker-utils.ts | head -50`
Expected: Shows existing health check functions

- [ ] **Step 2: Add Elasticsearch health check function**

Add after existing health check functions:

```typescript
  static async checkElasticsearchHealth(): Promise<ServiceHealth> {
    try {
      const response = await fetch('http://localhost:9200/_cluster/health');
      if (!response.ok) {
        return {
          name: 'Elasticsearch',
          healthy: false,
          url: 'http://localhost:9200',
        };
      }
      const data = await response.json();
      return {
        name: 'Elasticsearch',
        healthy: data.status !== 'red',
        url: 'http://localhost:9200',
      };
    } catch (error) {
      return {
        name: 'Elasticsearch',
        healthy: false,
        url: 'http://localhost:9200',
      };
    }
  }

  static async checkKibanaHealth(): Promise<ServiceHealth> {
    try {
      const response = await fetch('http://localhost:5601/api/status');
      if (!response.ok) {
        return {
          name: 'Kibana',
          healthy: false,
          url: 'http://localhost:5601',
        };
      }
      const data = await response.json();
      return {
        name: 'Kibana',
        healthy: data.status?.overall?.state === 'green',
        url: 'http://localhost:5601',
      };
    } catch (error) {
      return {
        name: 'Kibana',
        healthy: false,
        url: 'http://localhost:5601',
      };
    }
  }
```

- [ ] **Step 3: Update checkServices to include new health checks**

Find the `checkServices` function and add Elasticsearch and Kibana checks:

```typescript
  static async checkServices(): Promise<ServiceHealth[]> {
    return Promise.all([
      this.checkRedisHealth(),
      this.checkElasticsearchHealth(),
      this.checkKibanaHealth(),
      this.checkPostgresHealth(),
    ]);
  }
```

- [ ] **Step 4: Verify health checks compile**

Run: `npm run build`
Expected: No errors

- [ ] **Step 5: Test health checks**

Run: `npm start` then select Exit
Expected: Shows Redis, Elasticsearch, Kibana, and Postgres health status

- [ ] **Step 6: Commit health check updates**

```bash
git add src/lib/docker-utils.ts
git commit -m "feat: add Elasticsearch and Kibana health checks

Add health check functions for Elasticsearch and Kibana:
- checkElasticsearchHealth: checks cluster health API
- checkKibanaHealth: checks Kibana status API
- Update checkServices to include new checks"
```

---

### Task 6: Reset Script

**Files:**
- Create: `scripts/reset-elasticsearch.ts`

- [ ] **Step 1: Write reset script**

Create `scripts/reset-elasticsearch.ts`:

```typescript
import { Client } from '@elastic/elasticsearch';

async function resetElasticsearch() {
  const client = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  });

  console.log('🔄 Resetting Elasticsearch data...');

  try {
    await client.indices.delete({
      index: '*,-.*',
      ignore_unavailable: true,
      allow_no_indices: true,
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

- [ ] **Step 2: Test reset script**

Run: `npm run reset:elasticsearch`
Expected: Prints "✅ Elasticsearch data reset successfully"

- [ ] **Step 3: Verify reset worked**

Run: `curl http://localhost:9200/_cat/indices`
Expected: Only system indices (starting with .) remain

- [ ] **Step 4: Commit reset script**

```bash
git add scripts/reset-elasticsearch.ts
git commit -m "feat: add Elasticsearch reset script

Create reset-elasticsearch.ts to delete all non-system indices.
Deletes indices matching '*,-.*' pattern to preserve system indices."
```

---

## Phase 2: Example 01 - Basics

### Task 7: Example 01 Implementation

**Files:**
- Create: `src/technologies/elasticsearch/examples/01-basics/index.ts`
- Create: `src/technologies/elasticsearch/examples/01-basics/README.md`

- [ ] **Step 1: Create example directory**

Run: `mkdir -p src/technologies/elasticsearch/examples/01-basics`
Expected: Directory created

- [ ] **Step 2: Write Example 01 implementation**

Create `src/technologies/elasticsearch/examples/01-basics/index.ts`:

```typescript
import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const basicsExample = {
  name: 'Basics: Core Concepts',
  description: 'Documents, indices, mappings, and CRUD operations',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Basics: Core Concepts');
    logger.info('E-commerce book catalog management\n');

    // Create index
    logger.step('Step 1: Create index with explicit mapping');
    await client.indices.create({
      index: 'books',
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            author: { type: 'keyword' },
            price: { type: 'float' },
            publish_date: { type: 'date' },
          },
        },
      },
    });
    logger.command('PUT /books', JSON.stringify({
      mappings: {
        properties: {
          title: { type: 'text' },
          author: { type: 'keyword' },
          price: { type: 'float' },
          publish_date: { type: 'date' },
        },
      },
    }, null, 2));
    logger.success('Index created with mapping\n');

    // Add document
    logger.step('Step 2: Index a document');
    const indexResult = await client.index({
      index: 'books',
      body: {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        price: 10.99,
        publish_date: '1925-04-10',
      },
      refresh: 'wait_for',
    });
    logger.command('POST /books/_doc', JSON.stringify({
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      price: 10.99,
      publish_date: '1925-04-10',
    }, null, 2));
    logger.info(`Document ID: ${indexResult._id}`);
    logger.assert(indexResult.result === 'created', 'Document indexed successfully');
    logger.production('refresh: wait_for ensures document is immediately searchable\n');

    // Retrieve document
    logger.step('Step 3: Retrieve document by ID');
    const getResult = await client.get({
      index: 'books',
      id: indexResult._id,
    });
    logger.command(`GET /books/_doc/${indexResult._id}`, JSON.stringify(getResult._source, null, 2));
    logger.assert(getResult.found === true, 'Document retrieved successfully\n');

    // Update document
    logger.step('Step 4: Update document');
    const updateResult = await client.update({
      index: 'books',
      id: indexResult._id,
      body: {
        doc: {
          price: 12.99,
        },
      },
      refresh: 'wait_for',
    });
    logger.command(`POST /books/_update/${indexResult._id}`, JSON.stringify({ doc: { price: 12.99 } }, null, 2));
    logger.info(`Version: ${updateResult._version}`);
    logger.assert(updateResult.result === 'updated', 'Document updated successfully');
    logger.production('Partial updates modify only specified fields\n');

    // Search all documents
    logger.step('Step 5: Search all documents');
    const searchResult = await client.search({
      index: 'books',
      body: {
        query: {
          match_all: {},
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { match_all: {} } }, null, 2));
    logger.info(`Found ${searchResult.hits.hits.length} document(s)`);
    logger.assert(searchResult.hits.hits.length === 1, 'Search returned documents\n');

    // Delete document
    logger.step('Step 6: Delete document');
    const deleteResult = await client.delete({
      index: 'books',
      id: indexResult._id,
    });
    logger.command(`DELETE /books/_doc/${indexResult._id}`);
    logger.assert(deleteResult.result === 'deleted', 'Document deleted successfully');
    logger.production('Deletes are soft until segment merge\n');

    logger.success('\n✓ All basic CRUD operations demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'books', ignore_unavailable: true });
  },
};
```

- [ ] **Step 3: Verify example compiles**

Run: `npm run build`
Expected: No errors

- [ ] **Step 4: Write Example 01 README**

Create `src/technologies/elasticsearch/examples/01-basics/README.md`:

```markdown
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
```

- [ ] **Step 5: Commit Example 01**

```bash
git add src/technologies/elasticsearch/examples/01-basics/
git commit -m "feat: add Elasticsearch Example 01 - Basics

Implement core concepts example demonstrating:
- Index creation with explicit mappings
- CRUD operations (create, read, update, delete)
- Field types (text, keyword, float, date)
- Document versioning and refresh control

Includes comprehensive README with production considerations."
```

---

### Task 8: Example Index Export

**Files:**
- Create: `src/technologies/elasticsearch/index.ts`

- [ ] **Step 1: Create index export file**

Create `src/technologies/elasticsearch/index.ts`:

```typescript
import { basicsExample } from './examples/01-basics/index.js';

export const ELASTICSEARCH_EXAMPLES = [
  basicsExample,
];
```

- [ ] **Step 2: Verify exports compile**

Run: `npm run build`
Expected: No errors

- [ ] **Step 3: Commit index exports**

```bash
git add src/technologies/elasticsearch/index.ts
git commit -m "feat: add Elasticsearch examples index

Create index.ts to export all Elasticsearch examples.
Currently exports basicsExample, more to be added."
```

---

## Phase 3: CLI Integration

### Task 9: CLI Integration for Elasticsearch

**Files:**
- Modify: `src/cli.ts:1-300`

- [ ] **Step 1: Import Elasticsearch client and examples**

Add imports after Redis imports (around line 7):

```typescript
import { ElasticsearchClient } from './technologies/elasticsearch/client.js';
import { ELASTICSEARCH_EXAMPLES } from './technologies/elasticsearch/index.js';
```

- [ ] **Step 2: Update technology menu**

Find the `showTechnologyMenu` function and update the Elasticsearch option (around line 145):

```typescript
{
  name: '🔍 Elasticsearch (1 example)',
  value: 'elasticsearch',
},
```

- [ ] **Step 3: Add Elasticsearch client property to CLI class**

Add after redisClient property (around line 36):

```typescript
private elasticsearchClient: ElasticsearchClient;
```

- [ ] **Step 4: Initialize Elasticsearch client in constructor**

Add after Redis client initialization (around line 42):

```typescript
this.elasticsearchClient = new ElasticsearchClient();
```

- [ ] **Step 5: Update shutdown handler for Elasticsearch**

In `handleShutdown` function, add Elasticsearch disconnect:

```typescript
try {
  await this.redisClient.disconnect();
  this.logger.success('Disconnected from Redis');
  await this.elasticsearchClient.disconnect();
  this.logger.success('Disconnected from Elasticsearch');
} catch (error) {
  this.logger.error(`Error during shutdown: ${error}`);
}
```

- [ ] **Step 6: Add Elasticsearch connection method**

Add after `connectRedis` method:

```typescript
private async connectElasticsearch(): Promise<boolean> {
  const spinner = ora('Connecting to Elasticsearch...').start();

  try {
    await this.elasticsearchClient.connect();
    const healthy = await this.elasticsearchClient.healthCheck();

    if (healthy) {
      spinner.succeed('Connected to Elasticsearch');
      return true;
    } else {
      spinner.fail('Elasticsearch health check failed');
      return false;
    }
  } catch (error) {
    spinner.fail(`Failed to connect to Elasticsearch: ${error}`);
    return false;
  }
}
```

- [ ] **Step 7: Update main run method to handle Elasticsearch**

Find the section after technology selection and add Elasticsearch handling:

```typescript
if (technology === 'redis') {
  const connected = await this.connectRedis();
  if (!connected) {
    return;
  }
  await this.showExampleMenu(REDIS_EXAMPLES, this.redisClient.getClient());
} else if (technology === 'elasticsearch') {
  const connected = await this.connectElasticsearch();
  if (!connected) {
    return;
  }
  await this.showExampleMenu(ELASTICSEARCH_EXAMPLES, this.elasticsearchClient.getClient());
}
```

- [ ] **Step 8: Test CLI with Elasticsearch**

Run: `npm start`
Expected: Shows Elasticsearch option in menu

Select Elasticsearch, then select Example 01 - Basics
Expected: Example runs successfully with all steps passing

- [ ] **Step 9: Commit CLI integration**

```bash
git add src/cli.ts
git commit -m "feat: integrate Elasticsearch into CLI

Add Elasticsearch support to CLI:
- Import ElasticsearchClient and examples
- Add elasticsearch client to CLI class
- Implement connectElasticsearch method
- Update technology menu to enable Elasticsearch
- Handle Elasticsearch in main run loop
- Add Elasticsearch disconnect in shutdown handler"
```

---

## Phase 4: Example 02 - Full-Text Search

### Task 10: Example 02 Implementation

**Files:**
- Create: `src/technologies/elasticsearch/examples/02-full-text-search/index.ts`
- Create: `src/technologies/elasticsearch/examples/02-full-text-search/README.md`

- [ ] **Step 1: Create example directory**

Run: `mkdir -p src/technologies/elasticsearch/examples/02-full-text-search`
Expected: Directory created

- [ ] **Step 2: Write Example 02 implementation**

Create `src/technologies/elasticsearch/examples/02-full-text-search/index.ts`:

```typescript
import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const fullTextSearchExample = {
  name: 'Full-Text Search: Text Analysis',
  description: 'Match queries, phrase matching, and fuzzy search',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Example: Full-Text Search');
    logger.info('Book catalog search with relevance scoring\n');

    // Create index
    logger.step('Step 1: Create index with text fields');
    await client.indices.create({
      index: 'books',
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            author: { type: 'keyword' },
            description: { type: 'text' },
            price: { type: 'float' },
          },
        },
      },
    });
    logger.command('PUT /books');
    logger.success('Index created with text analysis fields\n');

    // Add sample documents
    logger.step('Step 2: Index sample books');
    await client.bulk({
      body: [
        { index: { _index: 'books' } },
        {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          description: 'A novel about the American Dream in the Jazz Age',
          price: 10.99,
        },
        { index: { _index: 'books' } },
        {
          title: 'Great Expectations',
          author: 'Charles Dickens',
          description: 'A coming-of-age story set in Victorian England',
          price: 12.99,
        },
        { index: { _index: 'books' } },
        {
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          description: 'A powerful novel about racial injustice in the American South',
          price: 11.99,
        },
        { index: { _index: 'books' } },
        {
          title: '1984',
          author: 'George Orwell',
          description: 'A dystopian novel about totalitarianism',
          price: 13.99,
        },
      ],
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '4 documents indexed');
    logger.success('Sample books indexed\n');

    // Match query
    logger.step('Step 3: Match query - find books with "great" in title');
    const matchResult = await client.search({
      index: 'books',
      body: {
        query: {
          match: {
            title: 'great',
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { match: { title: 'great' } } }, null, 2));
    logger.info(`Found ${matchResult.hits.hits.length} book(s)`);
    for (const hit of matchResult.hits.hits) {
      logger.info(`  - ${(hit._source as any).title} (score: ${hit._score})`);
    }
    logger.assert(matchResult.hits.hits.length === 2, 'Found books with "great"');
    logger.production('match query tokenizes input and finds any matching token\n');

    // Match phrase query
    logger.step('Step 4: Match phrase - exact phrase "american dream"');
    const phraseResult = await client.search({
      index: 'books',
      body: {
        query: {
          match_phrase: {
            description: 'american dream',
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { match_phrase: { description: 'american dream' } } }, null, 2));
    logger.info(`Found ${phraseResult.hits.hits.length} book(s)`);
    for (const hit of phraseResult.hits.hits) {
      logger.info(`  - ${(hit._source as any).title}`);
    }
    logger.assert(phraseResult.hits.hits.length === 1, 'Found exact phrase match');
    logger.production('match_phrase requires tokens to appear in order\n');

    // Fuzzy query
    logger.step('Step 5: Fuzzy search - handle typos');
    const fuzzyResult = await client.search({
      index: 'books',
      body: {
        query: {
          fuzzy: {
            title: {
              value: 'expctations',
              fuzziness: 'AUTO',
            },
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { fuzzy: { title: { value: 'expctations', fuzziness: 'AUTO' } } } }, null, 2));
    logger.info(`Found ${fuzzyResult.hits.hits.length} book(s) despite typo`);
    for (const hit of fuzzyResult.hits.hits) {
      logger.info(`  - ${(hit._source as any).title} (score: ${hit._score})`);
    }
    logger.assert(fuzzyResult.hits.hits.length >= 1, 'Fuzzy search handled typo');
    logger.production('fuzziness: AUTO allows 1-2 character edits based on term length\n');

    // Multi-match query
    logger.step('Step 6: Multi-match - search across multiple fields');
    const multiResult = await client.search({
      index: 'books',
      body: {
        query: {
          multi_match: {
            query: 'american',
            fields: ['title', 'description'],
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { multi_match: { query: 'american', fields: ['title', 'description'] } } }, null, 2));
    logger.info(`Found ${multiResult.hits.hits.length} book(s) with "american"`);
    for (const hit of multiResult.hits.hits) {
      logger.info(`  - ${(hit._source as any).title} (score: ${hit._score})`);
    }
    logger.assert(multiResult.hits.hits.length >= 2, 'Search across multiple fields');
    logger.production('multi_match searches multiple fields with combined scoring\n');

    logger.success('\n✓ Full-text search patterns demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'books', ignore_unavailable: true });
  },
};
```

- [ ] **Step 3: Write Example 02 README**

Create `src/technologies/elasticsearch/examples/02-full-text-search/README.md`:

```markdown
# Full-Text Search: Text Analysis & Matching

## What

Demonstrates Elasticsearch's core strength: full-text search with text analysis, relevance scoring, and different query types (match, match_phrase, fuzzy, multi_match).

## Why

Full-text search is the primary use case for Elasticsearch. Understanding how text is analyzed (tokenized, lowercased, stemmed) and how queries are scored is critical for building search features in e-commerce, content platforms, and document management systems.

## How

The example demonstrates book catalog search:
- **Match Query**: Find documents containing search terms (tokenized)
- **Match Phrase**: Find exact phrase matches (order matters)
- **Fuzzy Query**: Handle typos with edit distance
- **Multi-Match**: Search across multiple fields simultaneously

## Key Commands

- `match` - Tokenized term matching
- `match_phrase` - Exact phrase with term order
- `fuzzy` - Typo-tolerant search with edit distance
- `multi_match` - Search multiple fields with combined scoring

## Try It

Run the example and observe:
1. Relevance scores (_score) - higher is more relevant
2. How "great" matches both "Great Gatsby" and "Great Expectations"
3. Match phrase requires terms in order ("american dream" vs "dream american")
4. Fuzzy search handles typos like "expctations" → "expectations"
5. Multi-match searches title and description with combined scoring

Check query execution time and document relevance ranking.

## Production Considerations

**Text Analysis:**
- Text fields are analyzed: tokenized, lowercased, stopwords removed, stemmed
- Keyword fields are not analyzed - exact match only
- Custom analyzers can define language-specific rules
- Analysis happens at index time and query time

**Query Types:**
- match: Best for general search, handles phrases as tokens
- match_phrase: Use for exact phrases, quoted searches
- fuzzy: Good for autocorrect, but can be slow on large fields
- multi_match: Search multiple fields, but more expensive than single field

**Performance:**
- Relevance scoring (TF-IDF) requires doc_values and inverted index
- Fuzzy queries are expensive - limit fuzziness and field length
- Multi-match queries execute multiple searches internally
- Use filters (must not contribute to scoring) when exact matching

**Relevance Tuning:**
- Boost specific fields: `{"multi_match": {"query": "...", "fields": ["title^3", "description"]}}`
- Use function_score for custom scoring (recency, popularity)
- minimum_should_match for precision control
- Analyze query performance with _explain API

**Alternatives:**
- For exact keyword matching, use term queries (faster)
- For small datasets, Postgres full-text search may suffice
- For autocomplete, use completion suggester or edge n-grams
- For semantic search, use dense_vector with embeddings

## Further Reading

- [Full-Text Queries](https://www.elastic.co/guide/en/elasticsearch/reference/current/full-text-queries.html)
- [Text Analysis](https://www.elastic.co/guide/en/elasticsearch/reference/current/analysis.html)
- [Relevance Scoring](https://www.elastic.co/guide/en/elasticsearch/guide/current/scoring-theory.html)
```

- [ ] **Step 4: Update index exports**

Modify `src/technologies/elasticsearch/index.ts`:

```typescript
import { basicsExample } from './examples/01-basics/index.js';
import { fullTextSearchExample } from './examples/02-full-text-search/index.js';

export const ELASTICSEARCH_EXAMPLES = [
  basicsExample,
  fullTextSearchExample,
];
```

- [ ] **Step 5: Update CLI example count**

In `src/cli.ts`, update the Elasticsearch menu option:

```typescript
{
  name: '🔍 Elasticsearch (2 examples)',
  value: 'elasticsearch',
},
```

- [ ] **Step 6: Test Example 02**

Run: `npm start`
Select Elasticsearch → Example 02 - Full-Text Search
Expected: All 6 steps pass with search results showing relevance scores

- [ ] **Step 7: Commit Example 02**

```bash
git add src/technologies/elasticsearch/examples/02-full-text-search/ src/technologies/elasticsearch/index.ts src/cli.ts
git commit -m "feat: add Elasticsearch Example 02 - Full-Text Search

Implement full-text search example demonstrating:
- Match queries with tokenization
- Match phrase for exact phrase matching
- Fuzzy queries for typo tolerance
- Multi-match across multiple fields
- Relevance scoring and ranking

Includes comprehensive README with text analysis concepts."
```

---

## Phase 5: Example 03 - Geospatial Search

### Task 11: Example 03 Implementation

**Files:**
- Create: `src/technologies/elasticsearch/examples/03-geospatial-search/index.ts`
- Create: `src/technologies/elasticsearch/examples/03-geospatial-search/README.md`

- [ ] **Step 1: Create example directory**

Run: `mkdir -p src/technologies/elasticsearch/examples/03-geospatial-search`
Expected: Directory created

- [ ] **Step 2: Write Example 03 implementation**

Create `src/technologies/elasticsearch/examples/03-geospatial-search/index.ts`:

```typescript
import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const geospatialSearchExample = {
  name: 'Geospatial Search: Location Queries',
  description: 'geo_point fields and proximity search for location-based services',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Example: Geospatial Search');
    logger.info('Restaurant discovery (Yelp-style proximity search)\n');

    // Create index with geo_point
    logger.step('Step 1: Create index with geo_point field');
    await client.indices.create({
      index: 'restaurants',
      body: {
        mappings: {
          properties: {
            name: { type: 'text' },
            cuisine: { type: 'keyword' },
            location: { type: 'geo_point' },
            rating: { type: 'float' },
            price_range: { type: 'keyword' },
          },
        },
      },
    });
    logger.command('PUT /restaurants');
    logger.success('Index created with geo_point field\n');

    // Add sample restaurants (NYC locations)
    logger.step('Step 2: Index restaurants with locations');
    await client.bulk({
      body: [
        { index: { _index: 'restaurants' } },
        {
          name: "Joe's Pizza",
          cuisine: 'Italian',
          location: { lat: 40.7300, lon: -73.9950 },
          rating: 4.5,
          price_range: '$',
        },
        { index: { _index: 'restaurants' } },
        {
          name: 'Katz\'s Delicatessen',
          cuisine: 'Deli',
          location: { lat: 40.7223, lon: -73.9873 },
          rating: 4.6,
          price_range: '$$',
        },
        { index: { _index: 'restaurants' } },
        {
          name: 'Le Bernardin',
          cuisine: 'French',
          location: { lat: 40.7614, lon: -73.9776 },
          rating: 4.8,
          price_range: '$$$$',
        },
        { index: { _index: 'restaurants' } },
        {
          name: 'Shake Shack',
          cuisine: 'Burgers',
          location: { lat: 40.7414, lon: -73.9883 },
          rating: 4.3,
          price_range: '$$',
        },
        { index: { _index: 'restaurants' } },
        {
          name: 'Xi\'an Famous Foods',
          cuisine: 'Chinese',
          location: { lat: 40.7228, lon: -73.9969 },
          rating: 4.4,
          price_range: '$',
        },
      ],
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '5 restaurants indexed');
    logger.success('Sample restaurants indexed\n');

    // Find restaurants within 1km of a location
    logger.step('Step 3: Find restaurants within 1km radius');
    const userLocation = { lat: 40.7300, lon: -73.9900 };
    const radiusResult = await client.search({
      index: 'restaurants',
      body: {
        query: {
          geo_distance: {
            distance: '1km',
            location: userLocation,
          },
        },
        sort: [
          {
            _geo_distance: {
              location: userLocation,
              order: 'asc',
              unit: 'km',
            },
          },
        ],
      },
    });
    logger.command('GET /restaurants/_search', JSON.stringify({
      query: {
        geo_distance: {
          distance: '1km',
          location: userLocation,
        },
      },
    }, null, 2));
    logger.info(`Found ${radiusResult.hits.hits.length} restaurant(s) within 1km`);
    for (const hit of radiusResult.hits.hits) {
      const source = hit._source as any;
      const distance = hit.sort?.[0] as number;
      logger.info(`  - ${source.name} (${distance.toFixed(2)} km)`);
    }
    logger.assert(radiusResult.hits.hits.length >= 2, 'Found nearby restaurants');
    logger.production('geo_distance uses BKD trees for efficient spatial queries\n');

    // Find restaurants within 2km with cuisine filter
    logger.step('Step 4: Combine proximity with filters');
    const filteredResult = await client.search({
      index: 'restaurants',
      body: {
        query: {
          bool: {
            must: {
              geo_distance: {
                distance: '2km',
                location: userLocation,
              },
            },
            filter: [
              { term: { price_range: '$' } },
              { range: { rating: { gte: 4.0 } } },
            ],
          },
        },
        sort: [
          {
            _geo_distance: {
              location: userLocation,
              order: 'asc',
              unit: 'km',
            },
          },
        ],
      },
    });
    logger.command('GET /restaurants/_search', 'with cuisine and price filters');
    logger.info(`Found ${filteredResult.hits.hits.length} restaurant(s)`);
    for (const hit of filteredResult.hits.hits) {
      const source = hit._source as any;
      const distance = hit.sort?.[0] as number;
      logger.info(`  - ${source.name} - ${source.cuisine} - ${source.price_range} (${distance.toFixed(2)} km)`);
    }
    logger.assert(filteredResult.hits.hits.length >= 1, 'Combined geospatial and filters');
    logger.production('Combine geo queries with filters for multi-faceted search\n');

    // Bounding box query
    logger.step('Step 5: Bounding box search');
    const bboxResult = await client.search({
      index: 'restaurants',
      body: {
        query: {
          geo_bounding_box: {
            location: {
              top_left: { lat: 40.75, lon: -74.00 },
              bottom_right: { lat: 40.72, lon: -73.98 },
            },
          },
        },
      },
    });
    logger.command('GET /restaurants/_search', JSON.stringify({
      query: {
        geo_bounding_box: {
          location: {
            top_left: { lat: 40.75, lon: -74.00 },
            bottom_right: { lat: 40.72, lon: -73.98 },
          },
        },
      },
    }, null, 2));
    logger.info(`Found ${bboxResult.hits.hits.length} restaurant(s) in bounding box`);
    logger.assert(bboxResult.hits.hits.length >= 1, 'Bounding box query works');
    logger.production('Bounding box queries useful for map viewport searches\n');

    logger.success('\n✓ Geospatial search patterns demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'restaurants', ignore_unavailable: true });
  },
};
```

- [ ] **Step 3: Write Example 03 README**

Create `src/technologies/elasticsearch/examples/03-geospatial-search/README.md`:

```markdown
# Geospatial Search: Location Queries

## What

Demonstrates Elasticsearch's geospatial capabilities using geo_point fields for location-based queries: proximity search, radius filtering, distance sorting, and bounding box queries.

## Why

Geospatial search is critical for location-based services like Yelp (find nearby restaurants), Uber (match riders to drivers), real estate (find properties), and retail (store locators). Elasticsearch's native geo support makes these queries fast and straightforward.

## How

The example demonstrates restaurant discovery:
- **geo_point Field**: Store latitude/longitude coordinates
- **geo_distance Query**: Find locations within radius of a point
- **Distance Sorting**: Sort results by proximity
- **Combined Filters**: Proximity + cuisine/price/rating filters
- **Bounding Box**: Find locations within rectangular area

## Key Commands

- `geo_distance` - Find documents within radius of a point
- `_geo_distance` sort - Sort by distance from location
- `geo_bounding_box` - Find documents within rectangular bounds
- `bool` query - Combine geospatial with other filters

## Try It

Run the example and observe:
1. geo_point field stores {lat, lon} coordinates
2. geo_distance finds restaurants within 1km radius
3. Results sorted by distance (closest first)
4. Combining proximity with filters (price, rating)
5. Bounding box for map viewport searches
6. Distance calculated and returned in sort results

Check Kibana's Maps feature to visualize restaurant locations.

## Production Considerations

**Geospatial Field Types:**
- geo_point: Single lat/lon coordinate (restaurants, users, addresses)
- geo_shape: Complex geometries (delivery zones, neighborhoods, polygons)
- Store as object {lat, lon} or array [lon, lat] or string "lat,lon"
- BKD trees provide O(log n) spatial indexing

**Query Performance:**
- geo_distance queries are efficient with proper indexing
- Smaller radius = faster queries (less candidate documents)
- Distance calculation is approximate for performance (Haversine distance)
- Use geo_bounding_box for rectangular viewport searches

**Accuracy:**
- Default distance calculation is within 0.5% accuracy
- Precision setting controls geohash grid resolution
- For very high precision, use geo_shape with exact geometries
- Earth is not a perfect sphere - calculations are approximations

**Combining with Filters:**
- Use bool query to combine geo with filters
- Put filters in filter context (not scored) for better performance
- Sort by distance for "nearest first" UX
- Limit results with size parameter for pagination

**Scaling:**
- Geospatial queries don't scale differently than text queries
- Shard by region for very large datasets (e.g., global coverage)
- Consider dedicated indices per city/region
- Cache common queries (e.g., "restaurants near Times Square")

**Alternatives:**
- PostGIS (Postgres extension) for relational data with geo
- Redis geospatial for simple use cases (less feature-rich)
- Google Maps API for consumer applications (simpler, hosted)
- For very complex polygons, specialized GIS databases

**Interview Examples:**
- "Design Yelp" - Find nearby restaurants with filters
- "Design Uber" - Match riders to nearby drivers
- "Find nearby friends" - Social network proximity
- "Store locator" - Retail locations within radius
- "Real estate search" - Properties in area with filters

## Further Reading

- [Geo Queries](https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-queries.html)
- [Geo Point Field Type](https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-point.html)
- [Geo Shape Field Type](https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html)
```

- [ ] **Step 4: Update index exports**

Modify `src/technologies/elasticsearch/index.ts`:

```typescript
import { basicsExample } from './examples/01-basics/index.js';
import { fullTextSearchExample } from './examples/02-full-text-search/index.js';
import { geospatialSearchExample } from './examples/03-geospatial-search/index.js';

export const ELASTICSEARCH_EXAMPLES = [
  basicsExample,
  fullTextSearchExample,
  geospatialSearchExample,
];
```

- [ ] **Step 5: Update CLI example count**

In `src/cli.ts`:

```typescript
{
  name: '🔍 Elasticsearch (3 examples)',
  value: 'elasticsearch',
},
```

- [ ] **Step 6: Test Example 03**

Run: `npm start`
Select Elasticsearch → Example 03 - Geospatial Search
Expected: All 5 steps pass with restaurants sorted by distance

- [ ] **Step 7: Commit Example 03**

```bash
git add src/technologies/elasticsearch/examples/03-geospatial-search/ src/technologies/elasticsearch/index.ts src/cli.ts
git commit -m "feat: add Elasticsearch Example 03 - Geospatial Search

Implement geospatial search example demonstrating:
- geo_point field type for coordinates
- geo_distance queries for proximity search
- Distance-based sorting
- Combining proximity with filters
- Bounding box queries for map viewports

Interview-relevant for Yelp, Uber, real estate designs."
```

---

## Implementation Status

**Phase 1-3 Complete (Foundation + Examples 01-03):**
- ✅ Docker services and dependencies
- ✅ Client wrapper and types  
- ✅ CLI integration and health checks
- ✅ Example 01: Basics - CRUD operations
- ✅ Example 02: Full-Text Search - Text analysis and matching
- ✅ Example 03: Geospatial Search - Location-based queries

**Remaining Work:**
See continuation plan: `2026-05-11-elasticsearch-examples-part2.md` for:
- Examples 04-10 (Aggregations through Production Patterns)
- Technology README documentation
- Integration testing infrastructure
- Root README updates
- End-to-end validation

Each remaining example follows the same TDD pattern with complete code and detailed steps.

## Phase 6-10: Remaining Work

Tasks 12-22 complete Examples 04-10, testing, and documentation following the patterns established in Tasks 1-11.

### Examples 04-10 Pattern
Each follows: mkdir → write index.ts → write README.md → update exports/CLI → test → commit

- Task 12: Example 04 - Aggregations (orders index, metrics/buckets)
- Task 13: Example 05 - Complex Queries (bool, nested)  
- Task 14: Example 06 - Sorting & Pagination (multi-sort, search_after, PIT)
- Task 15: Example 07 - Document Versioning (optimistic concurrency)
- Task 16: Example 08 - Faceted Search (category/price facets)
- Task 17: Example 09 - Index Management (reindex, aliases)
- Task 18: Example 10 - Production Patterns (CDC, bulk, monitoring)

### Finalization
- Task 19: Integration tests (test/elasticsearch-examples.test.ts)
- Task 20: Technology README (src/technologies/elasticsearch/README.md)
- Task 21: Root README updates
- Task 22: End-to-end validation and success criteria check

See Tasks 1-11 for detailed step structure. Est ~7 hours total.
