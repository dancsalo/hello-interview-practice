# DynamoDB - Fully-Managed NoSQL Database

Amazon DynamoDB is a fully-managed, serverless NoSQL database service optimized for key-value and document data models. Built by Amazon for Amazon.com's massive scale, it provides single-digit millisecond latency, automatic scaling, and predictable performance.

## What is DynamoDB?

**Key Characteristics:**
- Fully-managed serverless database (no infrastructure to manage)
- Key-value and document data model
- Automatic horizontal scaling
- Single-digit millisecond latency at any scale
- Built-in replication across multiple AWS availability zones
- AWS-specific (vendor lock-in consideration)

**Differentiators:**
- True serverless (pay per request, no servers to provision)
- Predictable performance with consistent sub-10ms latency
- Built-in integration with AWS ecosystem (Lambda, S3, DynamoDB Streams)
- Automatic backups and point-in-time recovery
- Global Tables for multi-region replication

**Trade-offs:**
- Vendor lock-in to AWS
- Limited query flexibility (no JOINs, complex filters)
- Data modeling requires upfront access pattern analysis
- Can become expensive at high scale vs self-hosted alternatives

## Why DynamoDB for Interviews?

**Versatility:** DynamoDB demonstrates understanding of:
- NoSQL data modeling (partition keys, sort keys)
- CAP theorem trade-offs (eventual vs strong consistency)
- Horizontal scaling patterns
- Serverless architectures
- AWS ecosystem knowledge

**When to Discuss DynamoDB:**
- Interviewer explicitly allows AWS services
- Discussing high-scale, low-latency key-value access
- Serverless architecture contexts
- Need for predictable performance

**When to Discuss Alternatives:**
- Interviewer prefers cloud-agnostic solutions → Cassandra, MongoDB
- On-premises requirements → Cassandra, PostgreSQL
- Complex query requirements → PostgreSQL, MongoDB
- Cost-sensitive at high scale → Self-hosted Cassandra

**Interview Strategy:** Depth beats breadth. These 8 examples provide comprehensive DynamoDB knowledge from basics to production patterns. Understand when NOT to use DynamoDB as much as when to use it.

## 8 DynamoDB Examples

### Example 1: Basics - Core Operations

**What you'll learn:** CRUD operations, Query vs Scan, partition keys, schema-less design

**Key concepts:**
- Partition key required for data distribution
- Query uses keys (efficient), Scan reads all (expensive)
- Schema-less: items can have different attributes
- GetItem for single-item O(1) reads

**Interview relevance:** Foundation for all DynamoDB discussions. Must know partition key purpose, Query vs Scan trade-offs, and when to use DynamoDB over alternatives.

**Path:** `src/technologies/dynamodb/examples/01-basics/`

### Example 2: Indexing - GSIs and LSIs

**What you'll learn:** Global Secondary Indexes, Local Secondary Indexes, projection strategies, access patterns

**Key concepts:**
- GSI: Query on non-key attributes, separate partition key
- LSI: Alternative sort key, same partition key as base table
- Projections: ALL, KEYS_ONLY, INCLUDE
- Eventually consistent GSI reads

**Interview relevance:** Shows data modeling sophistication. GSIs enable additional access patterns. Understand cost implications (separate throughput) and eventual consistency.

**Path:** `src/technologies/dynamodb/examples/02-indexing/` (Coming soon)

### Example 3: Consistency Models - Eventual vs Strong

**What you'll learn:** Eventually consistent reads, strongly consistent reads, CAP theorem positioning

**Key concepts:**
- Default: eventually consistent (lower cost, higher availability)
- Strong consistency: up-to-date data (2x cost, lower availability)
- CAP theorem: DynamoDB is AP by default, CP with strong reads
- Consistency for GSI always eventual

**Interview relevance:** Demonstrates CAP theorem understanding. Discuss trade-offs: cost, availability, staleness. When strong consistency is required (financial transactions) vs acceptable eventual consistency (product catalog).

**Path:** `src/technologies/dynamodb/examples/03-consistency-models/` (Coming soon)

### Example 4: Transactions - ACID Guarantees

**What you'll learn:** Multi-item ACID transactions, optimistic locking, conditional writes

**Key concepts:**
- TransactWriteItems: up to 100 items, all-or-nothing
- TransactGetItems: snapshot isolation for reads
- Optimistic locking with version numbers
- Conditional writes (attribute_exists, attribute_not_exists)

**Interview relevance:** Shows ACID support in NoSQL. Discuss when transactions needed (order + payment) vs when single-item operations sufficient. Compare to PostgreSQL transactions (more flexible) and Cassandra (lightweight transactions only).

**Path:** `src/technologies/dynamodb/examples/04-transactions/` (Coming soon)

### Example 5: Single-Table Design - Advanced Modeling

**What you'll learn:** Single-table design pattern, composite keys, overloaded GSIs, adjacency lists

**Key concepts:**
- Store multiple entity types in one table
- Composite keys: partition key = "USER#123", sort key = "ORDER#456"
- Overloaded GSIs: reuse GSI for multiple access patterns
- Adjacency list pattern for many-to-many relationships

**Interview relevance:** Separates junior from senior DynamoDB knowledge. Single-table design minimizes cost and latency (fewer network calls). Discuss trade-offs: upfront planning required, less intuitive than relational model.

**Path:** `src/technologies/dynamodb/examples/05-single-table-design/` (Coming soon)

### Example 6: Streams - Change Data Capture

**What you'll learn:** DynamoDB Streams, CDC patterns, event-driven architecture, Lambda triggers

**Key concepts:**
- Streams capture item-level changes (insert, update, delete)
- 24-hour retention window
- Trigger Lambda functions for real-time processing
- Use cases: auditing, replication, search indexing

**Interview relevance:** Demonstrates event-driven architecture. Discuss CDC for syncing to Elasticsearch, maintaining aggregates, audit logs. Compare to Kafka (more flexible, longer retention) and PostgreSQL logical replication.

**Path:** `src/technologies/dynamodb/examples/06-streams/` (Coming soon)

### Example 7: Performance - DAX and Optimization

**What you'll learn:** DynamoDB Accelerator (DAX), batch operations, hot partition handling, request coalescing

**Key concepts:**
- DAX: in-memory cache (microsecond latency)
- BatchGetItem/BatchWriteItem: up to 100 items
- Hot partitions: avoid uneven key distribution
- Request coalescing: combine similar queries

**Interview relevance:** Shows performance optimization sophistication. Discuss when DAX needed (read-heavy, sub-ms latency) vs sufficient without (cost). Hot partition handling demonstrates understanding of partition key importance.

**Path:** `src/technologies/dynamodb/examples/07-performance/` (Coming soon)

### Example 8: Production Patterns - At Scale

**What you'll learn:** Capacity planning, Global Tables, TTL, monitoring, backup strategies

**Key concepts:**
- Capacity modes: on-demand vs provisioned
- Global Tables: multi-region replication
- TTL: automatic expiration of items
- CloudWatch metrics: throttles, latency, consumed capacity
- Point-in-time recovery and on-demand backups

**Interview relevance:** Demonstrates production readiness. Discuss capacity planning (RCU/WCU calculations), when to use Global Tables (multi-region availability), TTL for ephemeral data (sessions, cache). Monitoring for throttling detection.

**Path:** `src/technologies/dynamodb/examples/08-production-patterns/` (Coming soon)

## Key Concepts Across Examples

### Data Model: Tables, Items, Attributes

**Tables:** Containers for data (like SQL tables, but schema-less)

**Items:** Individual records (like SQL rows)
- Primary key required: partition key (required) + sort key (optional)
- Attributes: key-value pairs (like SQL columns, but flexible)

**Attributes:** 
- Scalar types: String, Number, Binary, Boolean, Null
- Document types: List, Map
- Set types: String Set, Number Set, Binary Set

### Partition Key and Sort Key

**Partition Key (Hash Key):**
- Required for every table
- Determines physical storage location (via consistent hashing)
- Enables efficient queries (O(1) lookup)
- Must distribute data evenly (avoid hot partitions)

**Sort Key (Range Key):**
- Optional second part of composite primary key
- Enables range queries within a partition
- Items with same partition key stored together, sorted by sort key
- Example: partition key = "USER#123", sort key = "ORDER#2024-05-11"

### CAP Theorem Positioning

**CAP Theorem:** In a distributed system, you can only have 2 of 3:
- Consistency: all nodes see same data
- Availability: system always responds
- Partition tolerance: works despite network failures

**DynamoDB Default (Eventually Consistent):**
- AP system: Availability + Partition tolerance
- Accepts stale reads (eventual consistency)
- Higher availability, lower cost

**DynamoDB Strong Consistency:**
- CP system: Consistency + Partition tolerance
- Up-to-date reads guaranteed
- Lower availability (more failures), 2x cost

### Consistency Models

**Eventually Consistent Reads (default):**
- Might return stale data (recently written data not yet replicated)
- 1 RCU per 8KB
- Higher throughput, lower cost
- Acceptable for most use cases (product catalog, user profiles)

**Strongly Consistent Reads:**
- Always returns most recent data
- 1 RCU per 4KB (2x cost vs eventual)
- Lower availability (more failure scenarios)
- Required for critical data (financial balances, inventory counts)

### Pricing Basics

**Capacity Units:**
- RCU (Read Capacity Unit): 1 strongly consistent read of 4KB/s (or 2 eventually consistent)
- WCU (Write Capacity Unit): 1 write of 1KB/s

**Pricing Models:**
- On-demand: Pay per request (no capacity planning, higher per-request cost)
- Provisioned: Reserve RCU/WCU (lower per-request cost, risk of throttling)

**Cost Drivers:**
- Storage: $0.25/GB/month
- RCU/WCU consumed
- Secondary indexes (separate capacity)
- Global Tables (replication cost)
- Backups and restores

## Getting Started

### Running Examples

```bash
# Start DynamoDB Local and dynamodb-admin
docker-compose up -d dynamodb-local dynamodb-admin

# Run interactive CLI
npm start
# Select: DynamoDB → Choose example

# Or run all tests
npm run test:dynamodb
```

### Using dynamodb-admin GUI

```bash
# Open dynamodb-admin in browser
open http://localhost:8004

# Features:
# - View all tables
# - Browse items in each table
# - See partition/sort keys
# - Inspect item attributes
# - Useful for visualizing single-table design
```

### Resetting Data

```bash
# Delete all tables (clean slate)
npm run reset:dynamodb

# Or reset all technologies
npm run reset
```

## Production Considerations

### Capacity Planning

**Calculating RCU:**
- Strongly consistent: ceiling(item_size_KB / 4) RCU per read
- Eventually consistent: ceiling(item_size_KB / 8) RCU per read
- Example: 10KB item, eventually consistent = ceiling(10/8) = 2 RCU

**Calculating WCU:**
- ceiling(item_size_KB / 1) WCU per write
- Example: 3.5KB item = ceiling(3.5/1) = 4 WCU

**Back-of-envelope estimation:**
- Expected reads/writes per second
- Average item size
- Consistency requirements
- Add 20% buffer for spikes

### Cost Estimation

**Scenario:** 1 million users, 10 reads/user/day, 1 write/user/day, 2KB items

**Calculations:**
- Reads: 1M * 10 / 86400 = 116 reads/s
- RCU needed (eventual): ceiling(2/8) * 116 = 116 RCU
- Writes: 1M * 1 / 86400 = 12 writes/s
- WCU needed: ceiling(2/1) * 12 = 24 WCU
- Provisioned cost: (116 RCU * $0.00013 + 24 WCU * $0.00065) * 730 hours = ~$22/month

**Compare to on-demand:**
- 10M reads * $0.25/million = $2.50
- 1M writes * $1.25/million = $1.25
- Total: ~$4/month (better for unpredictable traffic)

### Monitoring

**CloudWatch Metrics:**
- UserErrors: client-side errors (validation, conditional check failures)
- SystemErrors: server-side errors (throttling, service unavailable)
- ConsumedReadCapacityUnits / ConsumedWriteCapacityUnits
- ReadThrottleEvents / WriteThrottleEvents (capacity exceeded)
- SuccessfulRequestLatency (P50, P99)

**Alarms:**
- Throttling rate > 1% (increase capacity or optimize queries)
- P99 latency > 50ms (investigate hot partitions or indexing issues)
- SystemErrors > 0.1% (AWS issue, check service health dashboard)

### Common Pitfalls

**Hot Partitions:**
- Problem: Uneven key distribution (e.g., celebrity user gets all traffic)
- Solution: Add randomness to partition key, use write sharding

**Over-scanning:**
- Problem: Using Scan instead of Query
- Solution: Design access patterns with Query, add GSIs for new patterns

**Over-indexing:**
- Problem: Too many GSIs increase cost and write latency
- Solution: Use single-table design, overload GSIs for multiple patterns

**Large Items:**
- Problem: 400KB item size limit, high RCU/WCU consumption
- Solution: Store large attributes in S3, keep DynamoDB items small

## Interview Tips

### Do's
- **Discuss partition key strategy:** "I'd choose user_id as partition key to distribute load evenly"
- **Explain consistency trade-offs:** "Eventual consistency is fine for product catalog, but I'd use strong consistency for order totals"
- **Mention alternatives:** "DynamoDB works here, but Cassandra would be more cost-effective at this scale without vendor lock-in"
- **Show cost awareness:** "At 100M requests/day, on-demand mode costs X vs provisioned costs Y"
- **Discuss access patterns upfront:** "We need to query by user_id and by order_date, so I'd add a GSI on order_date"

### Don'ts
- **Assume DynamoDB for everything:** "Not every system needs DynamoDB. PostgreSQL works fine for 90% of use cases."
- **Ignore costs:** "At this scale, DynamoDB would cost $50k/month vs $5k for self-hosted Cassandra"
- **Forget item size limits:** "Each item can be up to 400KB. For larger documents, I'd use S3."
- **Overlook query limitations:** "DynamoDB can't do JOINs. If we need relational queries, PostgreSQL is better."

### Common Questions

**Q: How does DynamoDB distribute data?**
A: Uses consistent hashing on partition key. Each partition stores ~10GB or ~3000 RCU/1000 WCU. Partitions automatically split when limits reached.

**Q: When would you choose DynamoDB over PostgreSQL?**
A: DynamoDB when: key-value access, horizontal scaling needed, serverless architecture, predictable sub-10ms latency. PostgreSQL when: complex queries, JOINs, strong consistency everywhere, moderate scale.

**Q: How do you handle hot partitions?**
A: (1) Choose better partition key (add randomness), (2) Use write sharding (append random suffix), (3) Use DAX for read-heavy hotspots, (4) Increase provisioned capacity temporarily.

**Q: What's the difference between GSI and LSI?**
A: GSI has separate partition key, eventually consistent, can be added anytime. LSI shares base table partition key, alternate sort key, strongly consistent, must be created at table creation.

## DynamoDB vs Alternatives

### vs Cassandra/ScyllaDB

**When to use Cassandra:**
- Open-source (no vendor lock-in)
- On-premises or multi-cloud deployment
- Cost-sensitive at high scale (no per-request charges)
- Multi-datacenter replication built-in

**When to use DynamoDB:**
- AWS ecosystem (Lambda, S3, EventBridge)
- Zero operational overhead (serverless)
- Predictable single-digit millisecond latency
- Don't want to manage infrastructure

**Technical differences:**
- Cassandra: CQL (SQL-like), tunable consistency per query
- DynamoDB: SDK-based, consistency at read-level
- Cassandra: eventually consistent by default, configurable (ONE, QUORUM, ALL)
- DynamoDB: eventually consistent by default, strong consistency optional

### vs MongoDB

**When to use MongoDB:**
- Flexible, ad-hoc queries (no partition key required)
- Rapidly evolving schema
- Rich query language (aggregations, nested documents)
- ACID transactions across documents

**When to use DynamoDB:**
- Predictable access patterns known upfront
- Need AWS integration
- Serverless / zero ops
- Simple key-value queries

**Technical differences:**
- MongoDB: rich query language, indexes on any field
- DynamoDB: limited queries (partition key required), indexes planned upfront
- MongoDB: BSON documents, nested structures
- DynamoDB: attribute-value model, flatter structure

### vs PostgreSQL

**When to use PostgreSQL:**
- Complex JOINs across tables
- Relational data with foreign keys
- Strong consistency everywhere
- SQL query language
- Moderate scale (single-master writes)

**When to use DynamoDB:**
- Key-value access patterns
- Horizontal scaling (distributed writes)
- Eventual consistency acceptable
- Serverless architecture

**Technical differences:**
- PostgreSQL: relational model, ACID everywhere, single-master writes
- DynamoDB: key-value model, eventual consistency default, distributed writes
- PostgreSQL: rich SQL, JOINs, aggregations
- DynamoDB: limited queries, no JOINs

### vs Redis

**When to use Redis:**
- Pure caching layer
- Microsecond latency required
- Simple data structures (strings, hashes, lists)
- Temporary data (sessions, rate limiting)

**When to use DynamoDB:**
- Persistent storage (not just cache)
- Millisecond latency acceptable
- Larger data sets (not memory-bound)
- Serverless architecture

**Technical differences:**
- Redis: in-memory, microsecond latency, limited persistence
- DynamoDB: disk-based, millisecond latency, fully durable
- Redis: simple data types (string, hash, list, set, zset)
- DynamoDB: attributes (string, number, boolean, list, map)

## Further Reading

### Official AWS Documentation
- [DynamoDB Core Components](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html)
- [Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Query and Scan Operations](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html)
- [Global Secondary Indexes](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html)
- [DynamoDB Transactions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html)

### Research Papers
- [Amazon DynamoDB: A Scalable, Predictably Performant, and Fully Managed NoSQL Database Service (2022)](https://www.amazon.science/publications/amazon-dynamodb-a-scalable-predictably-performant-and-fully-managed-nosql-database-service)
- [Dynamo: Amazon's Highly Available Key-value Store (2007)](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf)

### Comparisons
- [Cassandra vs DynamoDB](https://www.datastax.com/blog/cassandra-vs-dynamodb)
- [MongoDB vs DynamoDB](https://www.mongodb.com/compare/mongodb-dynamodb)
- [DynamoDB vs PostgreSQL](https://aws.amazon.com/compare/the-difference-between-dynamodb-and-postgresql/)

### Learning Resources
- [AWS re:Invent - Advanced Design Patterns for DynamoDB](https://www.youtube.com/watch?v=HaEPXoXVf2k)
- [The DynamoDB Book by Alex DeBrie](https://www.dynamodbbook.com/)

## Common Use Cases Summary

| Use Case | DynamoDB Feature | Example |
|----------|------------------|---------|
| User profiles | Key-value access | Example 1: Basics |
| Multiple access patterns | GSIs | Example 2: Indexing |
| Financial transactions | Transactions | Example 4: Transactions |
| E-commerce catalog | Multiple entity types | Example 5: Single-Table Design |
| Audit logs | DynamoDB Streams | Example 6: Streams |
| Session store | TTL | Example 8: Production Patterns |
| Gaming leaderboards | Sort key queries | Example 1: Basics |
| IoT time-series | Partition by device_id, sort by timestamp | Example 1: Basics |

---

Ready to explore? Start with Example 1 (Basics) to understand core operations, then progress through indexing, consistency, transactions, and advanced patterns. Each example builds on previous concepts to give you comprehensive DynamoDB interview readiness.
