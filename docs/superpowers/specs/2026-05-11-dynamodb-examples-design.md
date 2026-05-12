# DynamoDB Examples Design

**Date:** 2026-05-11  
**Status:** Approved  
**Approach:** Progressive Learning (8 Examples)

## Overview

Create a comprehensive DynamoDB technology section for the hello-interview-practice learning platform, following the same structure and quality as Redis, PostgreSQL, and Kafka sections. The section will include 8 progressive examples that build from fundamentals to production patterns, with a focus on system design interview preparation.

## Goals

1. **Systematic Learning** - Build DynamoDB knowledge progressively from basics to advanced patterns
2. **Interview Preparation** - Cover all concepts commonly asked in system design interviews
3. **Vendor Lock-in Awareness** - Always discuss open-source alternatives (Cassandra, ScyllaDB, MongoDB)
4. **Hands-on Practice** - Runnable examples against DynamoDB Local via Docker
5. **Production Readiness** - Include real-world considerations, costs, and trade-offs

## Design Decisions

### Approach: Progressive Learning

We chose **Approach A (Progressive Learning)** over use-case driven or hybrid approaches because:

- Consistent with existing Redis and PostgreSQL structure
- Systematic coverage of all interview-critical concepts
- Natural learning curve from simple to complex
- Each example builds on previous knowledge
- Manageable scope (8 examples, similar to PostgreSQL's 7)

### Coverage Philosophy

**Balance AWS-specific and vendor-neutral:**
- Teach DynamoDB patterns and concepts thoroughly
- Always include "DynamoDB vs Alternatives" section in each example
- Discuss when Cassandra/ScyllaDB/MongoDB would be better choices
- Address vendor lock-in concerns explicitly
- Show how concepts translate to other systems

### Docker-Based Development

Use DynamoDB Local for hands-on examples:
- No AWS account or credentials required
- Fast iteration and testing
- Easy data reset between examples
- GUI admin interface (dynamodb-admin)

## Architecture

### Directory Structure

```
src/technologies/dynamodb/
├── README.md                          # Main technology guide (~400 lines)
└── examples/
    ├── 01-basics/
    │   ├── README.md                  # Example-specific guide
    │   └── index.ts                   # Runnable TypeScript example
    ├── 02-indexing/
    │   ├── README.md
    │   └── index.ts
    ├── 03-consistency-models/
    │   ├── README.md
    │   └── index.ts
    ├── 04-transactions/
    │   ├── README.md
    │   └── index.ts
    ├── 05-single-table-design/
    │   ├── README.md
    │   └── index.ts
    ├── 06-streams/
    │   ├── README.md
    │   └── index.ts
    ├── 07-performance/
    │   ├── README.md
    │   └── index.ts
    └── 08-production-patterns/
        ├── README.md
        └── index.ts
```

### Technology README Structure

Main `README.md` follows Redis/PostgreSQL pattern:

1. **What is DynamoDB?**
   - Key characteristics (fully-managed, highly scalable, key-value/document)
   - Differentiators vs traditional databases
   - AWS-specific nature and vendor lock-in

2. **Why DynamoDB for Interviews?**
   - Versatility (transactions, strong consistency, scalability)
   - When interviewers allow AWS services
   - How to discuss alternatives when required

3. **8 DynamoDB Examples**
   - Detailed breakdown of each example
   - What you'll learn
   - Key concepts
   - Interview relevance
   - Path to example

4. **Key Concepts Across Examples**
   - Data model (tables, items, attributes)
   - Partition and sort keys
   - CAP theorem positioning
   - Consistency models
   - Pricing model basics (RCU/WCU)

5. **Getting Started**
   - Running examples with Docker
   - Using dynamodb-admin GUI
   - Resetting data

6. **Production Considerations**
   - Capacity planning
   - Cost estimation
   - Monitoring and metrics
   - Common pitfalls

7. **Interview Tips**
   - Do's and Don'ts
   - Common questions and answers
   - When to use vs alternatives

8. **DynamoDB vs Alternatives**
   - Cassandra/ScyllaDB (open-source distributed)
   - MongoDB (document database)
   - PostgreSQL (relational, ACID)
   - Redis (in-memory, simple)

9. **Further Reading**
   - AWS documentation
   - DynamoDB paper
   - Open-source alternatives
   - Comparison articles

10. **Common Use Cases Summary**
    - Table with use case → feature → example

## The 8 Examples

### Example 1: Basics - Core Operations

**What you'll learn:**
- Creating tables with partition keys and sort keys
- CRUD operations (PutItem, GetItem, UpdateItem, DeleteItem)
- Query vs Scan operations
- Understanding item structure and 400KB limit
- Basic FilterExpressions and ProjectionExpressions

**Key concepts:**
- Partition key hashing determines physical location
- Sort key enables B-tree ordering within partitions
- Query is efficient (uses key), Scan is expensive (reads all items)
- Schema-less design (items can have different attributes)
- Item size limits and implications

**Interview relevance:**
Foundation for all DynamoDB discussions. Shows understanding of NoSQL key-value model vs relational databases. Demonstrates knowledge of when Query vs Scan is appropriate.

**Code example:**
- Create a `users` table with `user_id` (partition key)
- Perform CRUD operations
- Demonstrate Query vs Scan performance difference
- Show FilterExpression usage

**DynamoDB vs Alternatives:**
- **Cassandra**: Similar partition key concept, CQL instead of AWS SDK
- **MongoDB**: More flexible queries without partition key requirement, no sort key concept
- **ScyllaDB**: Cassandra-compatible but written in C++ (faster)
- **PostgreSQL**: JOINs and complex queries easier, but doesn't scale horizontally as easily

---

### Example 2: Indexing - GSIs and LSIs

**What you'll learn:**
- Creating Global Secondary Indexes (GSI) for different partition keys
- Creating Local Secondary Indexes (LSI) for alternate sort keys
- Choosing between GSI and LSI
- Index projection strategies (ALL, KEYS_ONLY, INCLUDE)
- Understanding index capacity and costs

**Key concepts:**
- GSI is essentially a separate table with independent partitioning
- LSI is co-located with base table (same partition key)
- Eventual consistency for GSI, optional strong consistency for LSI
- LSI must be defined at table creation time
- GSI can be added/removed anytime
- Capacity considerations (GSI has separate capacity, LSI shares with table)

**Interview relevance:**
Access pattern design is critical for DynamoDB success. Interviewers want to see you plan for multiple query patterns upfront. Shows understanding of when to denormalize vs create indexes.

**Code example:**
- Create `chat_messages` table with `chat_id` (partition key) and `message_id` (sort key)
- Add GSI with `user_id` (partition key) to query "all messages by user"
- Add LSI with `num_attachments` (sort key) to query "messages with most attachments in a chat"
- Compare query performance with and without indexes

**DynamoDB vs Alternatives:**
- **Cassandra**: Secondary indexes are local by default, materialized views for GSI-like functionality
- **MongoDB**: More flexible compound indexes, no partition key restriction
- **PostgreSQL**: B-tree indexes without data duplication, covering indexes similar to projections
- **When to use alternatives**: Complex ad-hoc queries favor MongoDB/PostgreSQL

---

### Example 3: Consistency Models

**What you'll learn:**
- Eventual consistency (default) vs strong consistency
- Per-request consistency control (ConsistentRead parameter)
- Read capacity cost differences (0.5 RCU vs 1 RCU per 4KB)
- GSI consistency limitations (eventual only)
- When each consistency model is appropriate

**Key concepts:**
- DynamoDB uses Multi-Paxos with leader + 2 followers (3 replicas total)
- Writes require quorum (2 of 3) acknowledgment
- Eventual reads can hit any replica (stale data possible)
- Strong reads always hit leader (latest data guaranteed)
- CAP theorem: AP by default, CP with strong reads
- Trade-offs: consistency vs latency vs cost

**Interview relevance:**
Critical for distributed systems discussions. Shows understanding of CAP theorem trade-offs. Essential for "design a booking system" or "design a banking system" questions where consistency matters.

**Code example:**
- Create `inventory` table for e-commerce
- Demonstrate eventual consistency (read may not see recent write)
- Demonstrate strong consistency (read always sees recent write)
- Show cost implications (measure RCUs consumed)
- Discuss race condition handling

**DynamoDB vs Alternatives:**
- **Cassandra**: Tunable consistency per request (ONE, QUORUM, ALL)
- **MongoDB**: Read concerns (local, majority, linearizable)
- **PostgreSQL**: Always strong consistency (single-leader architecture)
- **When to use alternatives**: Need for custom consistency levels favors Cassandra

---

### Example 4: Transactions

**What you'll learn:**
- TransactWriteItems for ACID multi-item writes
- TransactGetItems for consistent multi-item reads
- Condition expressions for optimistic locking
- Transaction limits (25 items, 4MB total size)
- When transactions are worth the cost (2x WCU)

**Key concepts:**
- ACID guarantees within DynamoDB (addresses "NoSQL can't do transactions")
- Serializable isolation level (strongest guarantee)
- All-or-nothing semantics across multiple items
- Can span multiple tables
- Transactions cost double (2 WCU per 1KB instead of 1 WCU)
- Condition checks prevent race conditions

**Interview relevance:**
Addresses "NoSQL can't do transactions" misconception. Critical for e-commerce (orders + inventory), banking (transfers), or any multi-step operations requiring atomicity.

**Code example:**
- Implement bank account transfers (debit one account, credit another)
- Demonstrate transaction rollback on insufficient funds
- Show optimistic locking with condition expressions
- E-commerce: reserve inventory and create order atomically
- Measure cost impact (2x WCU)

**DynamoDB vs Alternatives:**
- **Cassandra**: Lightweight transactions (Paxos-based, limited to single partition, slower)
- **MongoDB**: Multi-document ACID transactions across collections
- **PostgreSQL**: Full SQL transactions with multiple isolation levels (Read Committed, Repeatable Read, Serializable)
- **When to use alternatives**: Frequent cross-partition transactions favor PostgreSQL/MongoDB

---

### Example 5: Single-Table Design

**What you'll learn:**
- Modeling multiple entity types in one table
- Composite partition keys (e.g., "USER#123", "ORDER#456")
- Composite sort keys for hierarchical data
- Overloaded GSIs for different access patterns
- Adjacency list pattern for relationships

**Key concepts:**
- Why single-table design: fewer round trips, transaction support across entities, cost savings
- Access pattern analysis (list all access patterns before designing schema)
- Generic attribute names (PK, SK, GSI1PK, GSI1SK)
- Trade-offs: complexity vs performance vs flexibility
- When NOT to use single-table design (rapidly evolving schema, ad-hoc queries)

**Interview relevance:**
Shows advanced DynamoDB knowledge. Separates candidates who've only read docs from those who've used DynamoDB in production. Demonstrates deep understanding of NoSQL access pattern modeling.

**Code example:**
- Model e-commerce system: Users, Products, Orders, Reviews in one table
- PK patterns: "USER#123", "PRODUCT#456", "ORDER#789"
- SK patterns: metadata or relationships (e.g., "ORDER#789" has SK="PRODUCT#456")
- GSI for "all orders by user", "all reviews for product"
- Query multiple entity types efficiently

**DynamoDB vs Alternatives:**
- **Cassandra**: Wide-row pattern similar, but more intuitive with separate column families
- **MongoDB**: Embedded documents make relationships more natural
- **PostgreSQL**: JOIN operations make multi-table design simpler and more flexible
- **When to use alternatives**: Complex relationships and frequent schema changes favor PostgreSQL/MongoDB

---

### Example 6: Streams (CDC)

**What you'll learn:**
- Enabling DynamoDB Streams
- Stream record types (INSERT, MODIFY, REMOVE)
- Stream view types (KEYS_ONLY, NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES)
- Consuming streams with AWS Lambda
- Practical use case: keeping Elasticsearch in sync with DynamoDB

**Key concepts:**
- Change Data Capture (CDC) pattern
- At-least-once delivery (consumers must be idempotent)
- 24-hour stream retention
- Kinesis Data Streams vs DynamoDB Streams (when to use each)
- Practical applications: cache invalidation, notifications, cross-store sync

**Interview relevance:**
Essential for "design a search system" (DynamoDB + Elasticsearch via streams). Shows understanding of CDC and event-driven architectures. Common in discussions about maintaining consistency across services.

**Code example:**
- Create `products` table with streams enabled
- Simulate Lambda function consuming stream records
- Demonstrate INSERT, MODIFY, REMOVE events
- Show how to keep Elasticsearch index in sync
- Discuss idempotency requirements

**DynamoDB vs Alternatives:**
- **Cassandra**: CDC via commit log tailing (more complex)
- **MongoDB**: Change Streams (similar concept, more flexible filtering)
- **PostgreSQL**: Logical replication, pglogical, Debezium for CDC
- **When to use alternatives**: Complex CDC filtering and transformations favor MongoDB/PostgreSQL

---

### Example 7: Performance Optimization

**What you'll learn:**
- DAX (DynamoDB Accelerator) for microsecond reads
- Batch operations (BatchGetItem, BatchWriteItem - up to 25 items)
- Hot partition identification and mitigation strategies
- Write sharding techniques (key salting, distributing keys)
- Pagination and parallel scans

**Key concepts:**
- DAX as read-through/write-through cache (item cache + query cache)
- DAX doesn't cache strongly consistent reads
- Partition throughput limits (3000 RCU, 1000 WCU per partition)
- Hot key patterns: celebrity users, viral posts, popular products
- Solutions: key salting, client-side caching, replication, accepting overprovisioning
- Batch operations reduce round trips (16x items in single request)

**Interview relevance:**
Shows production experience. Hot partitions are a classic DynamoDB interview question ("what if one user goes viral?"). Demonstrates understanding of distributed system bottlenecks.

**Code example:**
- Create `social_posts` table and simulate viral post (hot partition)
- Demonstrate DAX caching (microsecond latency)
- Show batch operations vs individual operations
- Implement write sharding for high-volume writes
- Measure and discuss cost/performance trade-offs

**DynamoDB vs Alternatives:**
- **Cassandra**: No built-in cache, use Redis/Memcached separately
- **MongoDB**: No DAX equivalent, external caching required
- **PostgreSQL**: pg_bouncer for connection pooling, Redis for caching
- **When to use alternatives**: Fine-grained cache control favors Redis, complex caching policies favor application-level caching

---

### Example 8: Production Patterns

**What you'll learn:**
- Capacity mode: On-Demand vs Provisioned
- RCU/WCU calculations and cost estimation
- Auto-scaling for provisioned capacity
- Global Tables for multi-region replication
- Monitoring with CloudWatch metrics
- Time-To-Live (TTL) for automatic data expiration

**Key concepts:**
- Cost implications of design choices
- Back-of-envelope calculations (1 RCU = 4KB, 1 WCU = 1KB)
- Single partition limits: 3000 RCU, 1000 WCU
- Global Tables: last-writer-wins conflict resolution
- Key metrics: throttled requests, consumed capacity, replication lag, user errors
- TTL for automatic cleanup (sessions, temporary data, compliance)

**Interview relevance:**
Shows awareness of operational concerns. Interviewers often ask about cost and scaling ("how much would this cost at scale?"). Demonstrates production readiness.

**Code example:**
- Calculate RCU/WCU for hypothetical workload (e.g., "YouTube views")
- Demonstrate TTL for session expiration
- Show CloudWatch metrics integration (simulate monitoring)
- Discuss Global Tables setup (conceptual, no actual multi-region)
- Cost comparison: on-demand vs provisioned
- Auto-scaling configuration example

**DynamoDB vs Alternatives:**
- **Cassandra**: Multi-datacenter replication built-in (free, no AWS costs)
- **MongoDB**: Atlas global clusters, similar pricing model
- **PostgreSQL**: Async replication, manual failover, lower costs for small-medium scale
- **When to use alternatives**: Cost-sensitive applications or on-prem requirements favor Cassandra/PostgreSQL

## Docker Infrastructure

### docker-compose.yml Additions

```yaml
dynamodb-local:
  image: amazon/dynamodb-local:latest
  container_name: dynamodb-local
  ports:
    - "8000:8000"
  command: "-jar DynamoDBLocal.jar -sharedDb -inMemory"
  healthcheck:
    test: ["CMD-SHELL", "curl -f http://localhost:8000 || exit 1"]
    interval: 5s
    timeout: 3s
    retries: 5
  networks:
    - app-network

dynamodb-admin:
  image: aaronshaf/dynamodb-admin:latest
  container_name: dynamodb-admin
  ports:
    - "8003:8001"
  environment:
    - DYNAMO_ENDPOINT=http://dynamodb-local:8000
    - AWS_REGION=us-east-1
    - AWS_ACCESS_KEY_ID=local
    - AWS_SECRET_ACCESS_KEY=local
  depends_on:
    dynamodb-local:
      condition: service_healthy
  networks:
    - app-network
```

**Port Assignments:**
- DynamoDB Local: 8000
- dynamodb-admin GUI: 8003 (8001 and 8002 already used by RedisInsight and Kafka UI)

**Configuration:**
- `-sharedDb`: All tables in shared database file
- `-inMemory`: Data doesn't persist between restarts (easy resets)
- Healthcheck ensures service is ready before examples run

### Environment Variables (.env)

```bash
# DynamoDB Local
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

## Implementation Details

### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:dynamodb": "vitest run src/technologies/dynamodb",
    "reset:dynamodb": "ts-node scripts/reset-dynamodb.ts"
  }
}
```

### Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0"
  }
}
```

**Why these packages:**
- `@aws-sdk/client-dynamodb`: Low-level DynamoDB client
- `@aws-sdk/lib-dynamodb`: High-level Document Client (easier API, automatically marshals/unmarshals)

### CLI Integration

Update `src/cli.ts`:

1. Add DynamoDB to technology menu (after PostgreSQL, before Kafka)
2. Health check DynamoDB Local before running examples
3. Post-example actions: run another example, reset data, return to menu

### Reset Script

Create `scripts/reset-dynamodb.ts`:

```typescript
import { DynamoDBClient, ListTablesCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  },
});

async function resetDynamoDB() {
  // List all tables
  const { TableNames } = await client.send(new ListTablesCommand({}));
  
  if (!TableNames || TableNames.length === 0) {
    console.log('No tables to delete');
    return;
  }

  // Delete each table
  for (const tableName of TableNames) {
    await client.send(new DeleteTableCommand({ TableName: tableName }));
    console.log(`Deleted table: ${tableName}`);
  }

  console.log('DynamoDB reset complete');
}

resetDynamoDB().catch(console.error);
```

### Test Suite

Create `scripts/test-dynamodb-examples.ts` (following Redis/PostgreSQL pattern):

- Run all 8 examples in sequence
- Verify each example completes without errors
- Check expected tables/data are created
- Integration tests with Vitest

## Example README Structure

Each example's `README.md` follows this structure:

1. **Title and Overview** (what this example demonstrates)
2. **What You'll Learn** (bullet points)
3. **Key Concepts** (deeper explanations)
4. **How It Works** (step-by-step walkthrough)
5. **Running the Example** (commands)
6. **Expected Output** (what to look for)
7. **Visualizing in dynamodb-admin** (how to explore data)
8. **Interview Relevance** (when to mention this pattern)
9. **Production Considerations**
   - Scaling challenges
   - Failure modes
   - Cost implications
   - Monitoring
10. **DynamoDB vs Alternatives**
    - Cassandra/ScyllaDB
    - MongoDB
    - PostgreSQL
    - When to use each
11. **Further Reading** (links to AWS docs, blog posts, DynamoDB paper)

## Alternative Technologies Coverage

Each example will compare DynamoDB to:

### 1. Cassandra/ScyllaDB
- **When to use**: Open-source requirement, on-prem deployment, multi-DC built-in, cost-sensitive
- **Trade-offs**: More operational complexity, no managed service (except DataStax Astra, ScyllaDB Cloud)
- **Similarities**: Partition key concept, wide-column model, eventually consistent by default
- **Differences**: CQL vs SDK, tunable consistency, no GSI concept

### 2. MongoDB
- **When to use**: Flexible schema evolution, complex nested documents, ad-hoc queries
- **Trade-offs**: Different data model (documents vs items), less optimized for key-value patterns
- **Similarities**: Schema-less, horizontal scaling, secondary indexes
- **Differences**: No partition key requirement, richer query language, BSON format

### 3. PostgreSQL
- **When to use**: Strong consistency required everywhere, complex JOINs, moderate scale
- **Trade-offs**: Harder to scale writes, vertical scaling limits, replication lag
- **Similarities**: ACID transactions, indexes
- **Differences**: Relational model, SQL, single-leader architecture

### 4. Redis
- **When to use**: Pure caching, microsecond latency, simple data structures
- **Trade-offs**: In-memory only, no complex queries, limited persistence
- **Similarities**: Key-value access, fast reads
- **Differences**: In-memory vs disk-based, simpler data model, no secondary indexes

## Success Criteria

The DynamoDB section is complete when:

1. ✅ All 8 examples implemented and tested
2. ✅ Main README.md written (~400 lines, matching Redis/PostgreSQL quality)
3. ✅ Each example has detailed README (~100-150 lines)
4. ✅ Docker setup working (dynamodb-local + dynamodb-admin)
5. ✅ CLI integration complete (menu, health checks, reset)
6. ✅ NPM scripts functional (test:dynamodb, reset:dynamodb)
7. ✅ All examples include "DynamoDB vs Alternatives" section
8. ✅ Integration tests passing (Vitest)
9. ✅ Root README.md updated to show DynamoDB section
10. ✅ Documentation references key_technologies/dynamodb/original.md

## Timeline Estimation

Based on Redis (10 examples) and PostgreSQL (7 examples) implementation:

- **Example implementation**: ~2-3 hours per example (8 examples = 16-24 hours)
- **Main README.md**: ~2-3 hours
- **Docker setup**: ~1 hour
- **CLI integration**: ~1-2 hours
- **Testing**: ~2-3 hours
- **Documentation polish**: ~1-2 hours

**Total estimate: 23-35 hours** for complete implementation

## References

- **Source document**: `/Users/dsalo/Repos/hello-interview-practice/key_technologies/dynamodb/original.md`
- **Pattern reference**: `src/technologies/redis/README.md`, `src/technologies/postgresql/README.md`
- **AWS documentation**: https://docs.aws.amazon.com/dynamodb/
- **DynamoDB paper**: Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service (2022)
- **DynamoDB Local**: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html

## Notes

- This design maintains consistency with existing Redis and PostgreSQL sections
- Progressive learning approach proven successful with other technologies
- Docker-based development enables hands-on learning without AWS account
- Alternative technology discussions address vendor lock-in concerns
- 8 examples provide comprehensive coverage without being overwhelming
- Each example builds on previous concepts naturally
- Interview relevance explicitly called out in every example
- Production considerations show real-world experience
