---
name: PostgreSQL Examples Design
description: Implementation plan for PostgreSQL examples mirroring Redis format and style
type: design
---

# PostgreSQL Examples Design

## Overview

Create a comprehensive set of PostgreSQL examples for the hello-interview-practice project, following the same format and style as the existing Redis examples. The PostgreSQL examples will demonstrate core database patterns essential for system design interviews, emphasizing ACID transactions, complex queries, rich indexing capabilities, and data integrity.

## Goals

1. **Educational Value**: Teach PostgreSQL patterns relevant to system design interviews
2. **Consistency**: Mirror the Redis examples' structure, code style, and documentation format
3. **Practical Focus**: Demonstrate when to use PostgreSQL vs alternatives (Redis, Cassandra, Elasticsearch)
4. **Interview Preparation**: Cover topics that commonly appear in system design discussions
5. **Hands-On Learning**: Provide runnable examples with clear output and assertions

## Architecture

### Directory Structure

```
src/technologies/postgresql/
├── README.md              # Technology overview (mirrors redis/README.md)
├── client.ts             # PostgreSQL client wrapper with connect/disconnect/health
├── examples/
│   ├── 01-basics/
│   │   ├── index.ts
│   │   └── README.md
│   ├── 02-transactions/
│   │   ├── index.ts
│   │   └── README.md
│   ├── 03-indexing/
│   │   ├── index.ts
│   │   └── README.md
│   ├── 04-advanced-indexing/
│   │   ├── index.ts
│   │   └── README.md
│   ├── 05-read-scaling/
│   │   ├── index.ts
│   │   └── README.md
│   ├── 06-write-scaling/
│   │   ├── index.ts
│   │   └── README.md
│   └── 07-optimization/
│       ├── index.ts
│       └── README.md
└── index.ts              # Exports all examples
```

### Integration Points

**Existing Infrastructure:**
- PostgreSQL service already configured in `docker-compose.yml` (port 5432, mapped to 5433 externally)
- Database: `ecommerce`, User/Password: `demo/demo`
- Health check configured and working
- Logger and types already available in `src/lib/`

**New Components:**
- PostgreSQL client wrapper (`src/technologies/postgresql/client.ts`)
- 7 example modules following Redis pattern
- Technology README documenting all examples
- Individual example READMEs
- CLI updates to include PostgreSQL option
- Reset script for PostgreSQL data

**Type System Updates:**

Make the `Example` interface generic to support multiple client types:

```typescript
// src/lib/types.ts
export interface Example<TClient = RedisClientType> {
  name: string;
  description: string;
  run: (client: TClient, logger: Logger) => Promise<void>;
  cleanup?: (client: TClient) => Promise<void>;
}

export type RedisExample = Example<RedisClientType>;
export type PostgreSQLExample = Example<Client>; // from 'pg'
```

## The 7 Examples

### Example 1: Basics - Core SQL Operations

**What it demonstrates:**
- CRUD operations (Create, Read, Update, Delete)
- Table relationships (one-to-many, many-to-many)
- Foreign keys and referential integrity
- Basic joins (INNER, LEFT)
- Simple queries with WHERE, ORDER BY, LIMIT

**Scenario:** E-commerce user profiles and orders

**Tables:**
- `users` - Basic user information
- `orders` - Orders with foreign key to users
- `order_items` - Join table connecting orders and products

**Key Concepts:**
- Demonstrates cascading deletes
- Shows constraint violations
- Foreign key enforcement

**Key Commands:** 
INSERT, SELECT, UPDATE, DELETE, JOIN

**Production Considerations:**
- Normalization vs denormalization trade-offs
- When to use foreign keys vs application-level enforcement
- N+1 query problem preview (covered more in optimization example)

**Why:** Understanding these building blocks is essential since all PostgreSQL patterns are built on top of them. Shows when PostgreSQL's referential integrity is valuable vs when it adds overhead.

---

### Example 2: Transactions & Consistency

**What it demonstrates:**
- ACID properties in action
- Transaction blocks (BEGIN, COMMIT, ROLLBACK)
- Isolation levels (Read Committed, Repeatable Read, Serializable)
- Row-level locking (SELECT...FOR UPDATE)
- Concurrent transaction handling

**Scenario:** Bank account transfers and auction bidding

**Use Cases:**
- Account balance transfers demonstrating atomicity
- Auction bidding system with race conditions
- Show problem with default isolation level
- Fix with row-locking or higher isolation level

**Key Commands:** 
BEGIN, COMMIT, ROLLBACK, SELECT...FOR UPDATE, SET TRANSACTION ISOLATION LEVEL

**Production Considerations:**
- When to use row-locking vs higher isolation levels
- Deadlock detection and retry logic
- Performance impact of different isolation levels
- Optimistic vs pessimistic locking trade-offs

**Why:** Transactions are the core differentiator between PostgreSQL and NoSQL databases. This is one of the most common interview topics - candidates need to explain not just what transactions are, but when to use different isolation levels and locking strategies.

---

### Example 3: Indexing Strategies

**What it demonstrates:**
- B-tree indexes (default) for exact matches and ranges
- Covering indexes (INCLUDE clause)
- Partial indexes (WHERE clause)
- Multi-column indexes
- Index performance comparison (with/without indexes)

**Scenario:** Product catalog with filtering and sorting

**Demonstrations:**
- Query performance before/after indexing (timing comparison)
- When indexes help vs hurt (small tables, high write volume)
- Index selection by query planner
- Multi-column index column ordering

**Key Commands:** 
CREATE INDEX, EXPLAIN ANALYZE, DROP INDEX

**Production Considerations:**
- Index overhead on writes
- Disk space usage
- When NOT to create indexes
- Index maintenance (REINDEX, VACUUM)

**Why:** Indexing is fundamental to PostgreSQL performance and comes up in virtually every system design interview. Candidates need to know not just how to create indexes, but when to use specialized index types and understand the trade-offs.

---

### Example 4: Advanced Indexing

**What it demonstrates:**
- GIN indexes for full-text search (tsvector)
- GIN indexes for JSONB queries
- GiST indexes for PostGIS geospatial queries
- When to use specialized indexes vs separate databases

**Scenario:** Social media posts with search, metadata, and location

**Use Cases:**
- Posts with full-text search on content (word stemming, relevance ranking)
- JSONB metadata (tags, mentions, flexible attributes)
- Location-based queries (nearby posts within radius)

**Key Commands:** 
CREATE EXTENSION (pg_trgm, postgis), CREATE INDEX USING GIN, CREATE INDEX USING GIST, to_tsvector, to_tsquery, JSONB operators (@>, ?), ST_DWithin, ST_MakePoint

**Production Considerations:**
- PostgreSQL full-text search vs Elasticsearch
- JSONB vs separate columns trade-offs
- PostGIS vs specialized geospatial databases
- Index size and maintenance for GIN/GiST
- When PostgreSQL's built-in capabilities are sufficient vs when to use specialized tools

**Why:** Shows PostgreSQL's versatility - often eliminating the need for Elasticsearch or specialized databases. Strong candidates will discuss when PostgreSQL's built-in search is sufficient vs when to introduce additional systems.

---

### Example 5: Read Scaling - Replication

**What it demonstrates:**
- Read replicas concept
- Synchronous vs asynchronous replication trade-offs
- Replication lag and read-your-writes consistency
- Connection routing (primary for writes, replicas for reads)
- Failover concepts

**Scenario:** Social media feed with high read volume

**Demonstrations:**
- Primary handles writes (new posts)
- Replicas handle reads (feed queries)
- Consistency challenges with replication lag
- Simulated lag scenarios

**Implementation Note:** 
Since we can't easily spin up actual replicas in Docker for this example, we'll:
- Explain the architecture with clear descriptions
- Simulate lag with controlled delays in code
- Focus on application-level patterns (connection routing, consistency strategies)

**Key Concepts:**
Read-after-write consistency, eventual consistency, failover, promotion

**Production Considerations:**
- Read-after-write consistency patterns
- Replica lag monitoring
- Failover strategies and promotion
- Load balancing across replicas
- When replication isn't enough (need sharding)

**Why:** Replication is the most common scaling strategy and comes up in every "design a read-heavy system" interview. Understanding replication lag and consistency trade-offs is crucial.

---

### Example 6: Write Scaling Strategies

**What it demonstrates:**
- Batching writes for throughput
- Table partitioning (PARTITION BY RANGE)
- Partition pruning for query performance
- Write performance before/after partitioning
- Sharding concepts (explained, not implemented)

**Scenario:** Analytics events with time-series partitioning

**Demonstrations:**
- Events table partitioned by month/week
- Write throughput improvements
- Query performance on recent vs old data
- Partition maintenance (creating new partitions, dropping old ones)

**Key Commands:** 
CREATE TABLE...PARTITION BY RANGE, CREATE TABLE...PARTITION OF, EXPLAIN (showing partition pruning)

**Production Considerations:**
- When to partition (table size, access patterns)
- Partition key selection
- Maintenance overhead
- Sharding strategy overview (by user_id, by tenant, etc.)
- Connection pooling (PgBouncer)
- Write throughput limits (~5k writes/sec per core)

**Why:** Write scaling is less common than read scaling but critical for certain use cases. Candidates should know when partitioning helps, when to consider sharding, and how to batch writes effectively.

---

### Example 7: Query Optimization

**What it demonstrates:**
- EXPLAIN and EXPLAIN ANALYZE
- Query planning and execution
- Common query patterns and anti-patterns
- CTEs (Common Table Expressions) vs subqueries
- Window functions
- N+1 query problem and solutions

**Scenario:** User dashboard with multiple aggregations

**Demonstrations:**
- Complex queries joining multiple tables
- Slow queries and how to optimize them
- EXPLAIN output interpretation
- Fixing N+1 problem with proper joins
- Using window functions for rankings/aggregations

**Key Commands:** 
EXPLAIN, EXPLAIN ANALYZE, WITH (CTEs), window functions (ROW_NUMBER, RANK, LAG, LEAD)

**Production Considerations:**
- Reading query plans (seq scan vs index scan)
- Index usage verification
- Query result caching strategies
- Application-level optimization (eager loading, query batching)
- When to denormalize for query performance

**Why:** Query optimization is a skill that separates junior from senior engineers. Understanding EXPLAIN, recognizing anti-patterns, and knowing when to denormalize are all critical interview topics.

## Data Flow

### Example Execution Flow

1. **CLI Selection:** User selects PostgreSQL technology → sees list of 7 examples
2. **Connection:** PostgreSQL client connects to Docker container (localhost:5432)
3. **Health Check:** Verify PostgreSQL is ready before running example
4. **Schema Setup:** Each example creates its own tables/extensions at start
5. **Example Execution:** Run through steps with logger output
6. **Assertions:** Verify expected results throughout
7. **Cleanup:** Drop tables/data at end (optional, user can inspect in psql)
8. **Post-Actions:** User can run another example, reset data, or exit

### Connection Pattern

```typescript
// src/technologies/postgresql/client.ts
import { Client } from 'pg';

export class PostgreSQLClient {
  private client: Client;
  
  async connect() {
    this.client = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      user: process.env.POSTGRES_USER || 'demo',
      password: process.env.POSTGRES_PASSWORD || 'demo',
      database: process.env.POSTGRES_DB || 'ecommerce',
    });
    await this.client.connect();
  }
  
  async disconnect() {
    await this.client.end();
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }
  
  async reset() {
    // Drop all tables in public schema
    await this.client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
    `);
  }
  
  getClient(): Client {
    return this.client;
  }
}
```

### Example Pattern

```typescript
import type { Client } from 'pg';
import type { Logger } from '../../../../lib/types.js';

export const basicsExample = {
  name: 'Basics: Core SQL Operations',
  description: 'CRUD, joins, relationships, foreign keys',
  
  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('📦 PostgreSQL Basics: Core SQL Operations');
    logger.info('E-commerce user profiles and orders\n');
    
    // 1. Schema setup
    logger.step('Step 1: Create users table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE users (...)');
    
    // 2. Demonstrate concepts with logged steps
    logger.step('Step 2: Insert users');
    await client.query(`
      INSERT INTO users (username, email) 
      VALUES ('alice', 'alice@example.com'), ('bob', 'bob@example.com')
    `);
    logger.command('INSERT INTO users ...');
    
    // 3. Assertions
    const result = await client.query('SELECT * FROM users');
    logger.command('SELECT * FROM users', JSON.stringify(result.rows, null, 2));
    logger.assert(result.rows.length === 2, 'Users inserted successfully');
    
    logger.production('Use foreign keys to maintain referential integrity');
    logger.production('Consider denormalization for read-heavy workloads\n');
    
    logger.success('\n✓ Basic SQL operations demonstrated!');
    
    // 4. Cleanup
    await client.query('DROP TABLE IF EXISTS users CASCADE');
  }
};
```

## Error Handling

### Connection Errors
- Health check before running examples
- Clear error messages if PostgreSQL isn't running
- Suggest `docker-compose up -d` if connection fails

### Transaction Errors
- Demonstrate rollback on constraint violations
- Show serialization failures in Serializable isolation
- Retry logic examples for deadlocks

### Schema Errors
- Use `IF NOT EXISTS` / `IF EXISTS` to avoid errors
- CASCADE drops to handle foreign key dependencies
- Clear error messages for constraint violations

### Query Errors
- Wrap queries in try-catch with meaningful messages
- Show failed assertions with actual vs expected values
- Demonstrate error handling patterns (e.g., unique constraint violations)

### Example-Specific Errors
- Transaction example: Intentionally trigger errors to show rollback
- Consistency example: Show race conditions, then fix them
- Each error is educational, not a failure

## Testing Strategy

### Integration Tests

Mirror the existing Redis testing approach:

```typescript
// tests/postgresql/basics.test.ts
describe('PostgreSQL Basics Example', () => {
  let client: Client;
  
  beforeAll(async () => {
    client = new Client({
      host: 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: 'demo',
      password: 'demo',
      database: 'ecommerce',
    });
    await client.connect();
  });
  
  afterAll(async () => {
    await client.end();
  });
  
  it('should run basics example without errors', async () => {
    const logger = new TestLogger();
    await basicsExample.run(client, logger);
    expect(logger.errors).toHaveLength(0);
  });
  
  it('should create and populate tables', async () => {
    const logger = new TestLogger();
    await basicsExample.run(client, logger);
    // Assertions about table state
  });
});
```

### Manual Testing
- Interactive CLI testing for user experience
- Verify output formatting and readability
- Test post-example actions (run another, reset, exit)
- Verify examples work with default Docker setup

### Data Verification
- Users can connect with `psql` to inspect data:
  ```bash
  psql -h localhost -p 5432 -U demo -d ecommerce
  ```
- Each example's README shows manual verification steps
- Optional: pgAdmin could be added (like RedisInsight for Redis)

## Documentation

### Technology README (`src/technologies/postgresql/README.md`)

Structure mirrors `redis/README.md`:

1. **What is PostgreSQL?**
   - Core characteristics (ACID, SQL, relational)
   - Key features (transactions, rich querying, extensions)

2. **Why PostgreSQL for Interviews?**
   - Most commonly discussed relational database
   - Rich feature set eliminates need for specialized tools
   - Strong consistency guarantees

3. **7 PostgreSQL Examples**
   - Detailed description of each example
   - What you'll learn
   - Key concepts
   - Interview relevance

4. **Key Concepts Across Examples**
   - ACID properties
   - Indexing strategies
   - Consistency and isolation
   - Scaling (replication, partitioning, sharding)

5. **Getting Started**
   - Running examples
   - Connecting with psql
   - Resetting data

6. **Production Considerations**
   - Connection pooling
   - Monitoring
   - Backup & recovery
   - High availability

7. **Interview Tips**
   - Do/Don't lists
   - Common questions and answers
   - When to use PostgreSQL vs alternatives

8. **Further Reading**
   - Official documentation links
   - Reference to `key_technologies/postgresql/original.md`

9. **Use Cases Summary Table**
   - Pattern → PostgreSQL Feature → Example

### Example READMEs

Each example follows the Redis format:

```markdown
# PostgreSQL [Example Name]

## What
Brief description of what this example demonstrates

## Why
Why this pattern matters for system design interviews

## How
How the implementation works (architecture, flow)

## Key Commands
SQL commands used in this example

## Try It
Steps to run and verify the example

## Production Considerations
- Scaling challenges
- Failure modes
- Trade-offs
- When NOT to use this pattern
- Monitoring and observability

## Further Reading
Links to PostgreSQL docs and resources
```

### Root README Updates

Update main `README.md`:

```markdown
### Technologies

- ✅ **Redis** (10 examples) - Cache, distributed locks, leaderboards, rate limiting, pub/sub, and more
- ✅ **PostgreSQL** (7 examples) - Transactions, indexing, full-text search, replication, optimization
- 🔜 **Kafka** - Coming soon
- 🔜 **Cassandra** - Coming soon
- 🔜 **Elasticsearch** - Coming soon
```

Add PostgreSQL commands:

```bash
npm run reset:postgres  # Reset only PostgreSQL data
```

### Code Comments

- Minimal inline comments (following existing pattern)
- Logger messages serve as documentation
- Production notes called out via `logger.production()`
- Complex SQL queries get brief explanatory comments when needed

## Production Considerations

### Highlighted in Each Example

1. **Basics:** When to denormalize, foreign key trade-offs, N+1 preview
2. **Transactions:** Isolation level performance, deadlock handling, retry logic
3. **Indexing:** Write overhead, disk space, maintenance (VACUUM, REINDEX)
4. **Advanced Indexing:** PostgreSQL vs specialized databases (Elasticsearch, geo services)
5. **Read Scaling:** Replication lag, read-your-writes consistency, failover strategies
6. **Write Scaling:** Partition maintenance, connection pooling, sharding complexity
7. **Optimization:** Query plan interpretation, caching strategies, monitoring

### Cross-Cutting Concerns

**Connection Pooling:**
- Mention PgBouncer for production workloads
- Connection limits and process overhead

**Monitoring:**
- pg_stat_statements for query analysis
- Slow query logs
- Connection count monitoring
- Replication lag monitoring

**Backup & Recovery:**
- WAL archiving
- Point-in-time recovery
- Backup strategies

**Security:**
- Least privilege principles
- SSL connections
- Connection limits
- SQL injection prevention

**High Availability:**
- Failover mechanisms
- Managed services (RDS, Cloud SQL)
- Multi-region considerations

### Interview Focus: Trade-Offs

Emphasize comparisons throughout:
- **PostgreSQL vs Redis:** Durability vs speed, rich queries vs simple operations
- **PostgreSQL vs Cassandra:** Consistency vs write scaling, ACID vs eventual consistency
- **PostgreSQL vs Elasticsearch:** Full-text search capabilities, when each is appropriate
- **Vertical scaling vs sharding:** When to scale up vs scale out
- **Synchronous vs asynchronous replication:** Consistency vs performance

## Implementation Plan

### Phase 1: Core Structure

1. Create `src/technologies/postgresql/` directory structure
2. Implement PostgreSQL client wrapper (`client.ts`)
3. Update type definitions to support generic client types
4. Create base example export file (`index.ts`)
5. Update CLI to include PostgreSQL option in technology menu
6. Create reset script (`scripts/reset-postgres.ts`)

**Deliverable:** PostgreSQL infrastructure ready for examples

---

### Phase 2: Examples (Priority Order)

**Priority 1 - Foundation:**
1. **Example 01: Basics** - Foundation for all other examples
2. **Example 02: Transactions** - Critical for interviews, most distinctive feature

**Priority 2 - Core Interview Topics:**
3. **Example 03: Indexing** - Most commonly discussed performance topic
4. **Example 07: Optimization** - Ties concepts together, shows practical application

**Priority 3 - Advanced Features:**
5. **Example 04: Advanced Indexing** - Shows PostgreSQL's versatility
6. **Example 05: Read Scaling** - Architectural scaling patterns
7. **Example 06: Write Scaling** - Advanced scaling concepts

**Rationale:** Build from fundamentals (basics, transactions) → common topics (indexing) → practical application (optimization) → advanced features (specialized indexes, scaling)

**Deliverable:** All 7 examples implemented with TypeScript code and individual READMEs

---

### Phase 3: Documentation & Testing

1. Write technology README (`src/technologies/postgresql/README.md`)
2. Ensure all example READMEs are complete
3. Update root README with PostgreSQL section
4. Add integration tests for all examples
5. Manual testing via CLI
6. Refinement based on testing

**Deliverable:** Complete documentation and passing tests

---

### Phase 4: Polish & Review

1. Ensure consistent code style across all examples
2. Verify logger output formatting
3. Check production considerations coverage
4. Validate educational value
5. Test user flow through CLI
6. Final review against Redis examples for consistency

**Deliverable:** Production-ready PostgreSQL examples

## Dependencies

### NPM Packages

```json
{
  "pg": "^8.11.0",
  "@types/pg": "^8.11.0"
}
```

### Docker Configuration

No changes needed - PostgreSQL service already configured in `docker-compose.yml`:

```yaml
postgres:
  image: postgres:16-alpine
  container_name: system-design-postgres
  ports:
    - "${POSTGRES_PORT:-5432}:5432"
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-demo}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-demo}
    POSTGRES_DB: ${POSTGRES_DB:-ecommerce}
  volumes:
    - postgres-data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-demo}"]
    interval: 5s
    timeout: 3s
    retries: 5
  restart: unless-stopped
```

**Note:** External port is mapped to 5433 to avoid conflicts, but internal port is 5432.

## Naming Conventions

### Code
- TypeScript: camelCase (existing pattern)
- SQL keywords: UPPERCASE (SELECT, INSERT, CREATE)
- Table names: lowercase with underscores (users, order_items)
- Column names: lowercase with underscores (user_id, created_at)

### Files
- Directory names: kebab-case with numbers (01-basics/, 02-transactions/)
- File names: kebab-case (index.ts, client.ts)
- README files: UPPERCASE (README.md)

### Git
- Commit messages: Imperative mood ("Add PostgreSQL basics example")
- Branch naming: feature/postgres-examples

## Success Criteria

### Functional Requirements
✓ 7 PostgreSQL examples implemented and runnable
✓ Examples integrated into CLI menu system
✓ All examples have comprehensive READMEs
✓ Health checks working
✓ Reset functionality working
✓ Integration tests passing

### Educational Requirements
✓ Examples cover interview-relevant PostgreSQL topics
✓ Clear explanations of when to use PostgreSQL vs alternatives
✓ Production considerations documented for each pattern
✓ Trade-offs clearly articulated
✓ Examples build progressively from basics to advanced

### Quality Requirements
✓ Consistent with Redis examples in structure and style
✓ Clear, readable logger output
✓ Proper error handling
✓ Code comments where needed
✓ No unnecessary complexity

### User Experience Requirements
✓ Examples run successfully with default Docker setup
✓ Clear instructions for getting started
✓ Easy navigation through CLI
✓ Helpful error messages
✓ Post-example actions work correctly

## Future Enhancements

### Potential Additions (Out of Scope for Initial Implementation)

1. **Additional Examples:**
   - Materialized views for analytics
   - Triggers and stored procedures
   - Advanced partitioning strategies
   - Foreign Data Wrappers (FDW)

2. **Tooling:**
   - pgAdmin integration (like RedisInsight for Redis)
   - Query performance benchmarking
   - Visual query plan analyzer

3. **Advanced Topics:**
   - Connection pooling demonstration (PgBouncer)
   - Multi-database transactions
   - Logical replication
   - Event-driven architectures with LISTEN/NOTIFY

4. **Comparison Examples:**
   - Side-by-side PostgreSQL vs Redis for same use case
   - Migration examples (adding PostgreSQL where Redis exists)

These enhancements can be added after the initial 7 examples are complete and validated.

## References

- **PostgreSQL Documentation:** https://www.postgresql.org/docs/
- **Key Technologies Guide:** `/key_technologies/postgresql/original.md`
- **Redis Examples:** `src/technologies/redis/` (pattern to follow)
- **Project README:** Root README.md for context

## Conclusion

This design provides a comprehensive plan for implementing PostgreSQL examples that mirror the successful Redis implementation. The 7-example structure focuses on interview-relevant topics while maintaining educational value and practical applicability. By following the established patterns in the codebase and emphasizing trade-offs and production considerations, these examples will provide valuable hands-on learning for system design interview preparation.

The phased implementation approach ensures a solid foundation before building advanced features, with clear success criteria and testing strategies throughout.
