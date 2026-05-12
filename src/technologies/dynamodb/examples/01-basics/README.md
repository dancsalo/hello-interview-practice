# Example 1: DynamoDB Basics - Core Operations

Learn DynamoDB fundamentals: tables, partition keys, CRUD operations, and Query vs Scan.

## What You'll Learn

- Creating tables with partition keys
- CRUD operations (PutItem, GetItem, UpdateItem, DeleteItem)
- Query vs Scan operations and performance implications
- Understanding item structure and schema-less design
- FilterExpressions and when they're (in)efficient

## Key Concepts

### Partition Key

- **Required** for every table
- Determines physical storage location (via hashing)
- Enables efficient queries
- Must be unique (or unique when combined with sort key)

### Query vs Scan

**Query:**
- Uses partition key (and optionally sort key)
- Only reads matching items
- Efficient and fast
- Recommended for production

**Scan:**
- Reads **every item** in the table
- Slow and expensive for large tables
- Can filter after reading (still reads all)
- Avoid in production except for small tables

### Schema-less Design

- No predefined schema required
- Each item can have different attributes
- Flexibility comes at cost (application validation needed)
- Attribute types: String (S), Number (N), Binary (B), Boolean (BOOL), Null (NULL), List (L), Map (M), String Set (SS), Number Set (NS), Binary Set (BS)

## How It Works

1. **Create table** with `user_id` partition key
2. **PutItem** to create user records
3. **GetItem** to retrieve by partition key
4. **UpdateItem** to modify attributes
5. **Query** to efficiently find specific user
6. **Scan** to read all users (demonstrates inefficiency)
7. **FilterExpression** shows scan + filter still reads all items
8. **DeleteItem** to remove a user
9. **DeleteTable** to clean up

## Running the Example

```bash
# Ensure DynamoDB Local is running
docker-compose up -d dynamodb-local

# Run the example
npm start
# Select: DynamoDB → Basics
```

## Expected Output

- Table created with partition key
- User created and retrieved
- Query returns 1 item quickly
- Scan reads all 5 items (slower)
- FilterExpression still scans entire table
- User deleted successfully

## Visualizing in dynamodb-admin

```bash
# Open dynamodb-admin
open http://localhost:8003

# You'll see:
# - "users" table
# - Items with user_id, name, email, age, city
# - Click table to browse items
```

## Interview Relevance

**Foundation for all DynamoDB discussions.** Interviewers expect you to:

1. **Know partition key is required** - Explains distribution and query patterns
2. **Explain Query vs Scan** - Shows understanding of performance implications
3. **Describe schema-less model** - Contrast with PostgreSQL's strict schema
4. **Discuss when to use DynamoDB** - Key-value access patterns, high scale

**Common questions:**
- "How does DynamoDB distribute data?" → Partition key hashing
- "Why is Scan slow?" → Reads every item regardless of filter
- "How do you query efficiently?" → Use Query with partition key (+ sort key)

## Production Considerations

### Performance

- **Always use Query over Scan** when possible
- GetItem is fastest for single-item retrieval (O(1))
- Scan reads entire table - costly at scale
- FilterExpression doesn't improve Scan performance (still reads all)

### Capacity Planning

- Each Query/GetItem consumes RCUs (Read Capacity Units)
- Scan consumes RCUs for every item read
- 1 RCU = 4KB strongly consistent or 8KB eventually consistent
- Large scans can exhaust capacity and throttle

### Data Modeling

- Choose partition key that distributes data evenly (avoid hot keys)
- Consider access patterns upfront (can't easily change partition key)
- Normalize data if only reading subset of attributes frequently
- Item size limit: 400KB (including attribute names)

### Cost Implications

- Pay per RCU consumed
- Scan operations expensive for large tables
- Consider on-demand vs provisioned capacity
- Secondary indexes add cost (separate RCU/WCU)

## DynamoDB vs Alternatives

### vs Cassandra

**Similarities:**
- Partition key concept (Cassandra calls it "partition key")
- Wide-column NoSQL model
- Eventually consistent by default

**Differences:**
- Cassandra uses CQL (SQL-like), DynamoDB uses SDK
- Cassandra has tunable consistency per request (ONE, QUORUM, ALL)
- Cassandra is open-source, self-hosted (or DataStax Astra managed)

**When to use Cassandra:**
- Need open-source solution (no vendor lock-in)
- On-premises deployment
- Multi-datacenter replication built-in (free)
- Cost-sensitive (no per-request charges)

### vs MongoDB

**Similarities:**
- Schema-less (flexible attributes)
- Document/item storage
- Secondary indexes supported

**Differences:**
- MongoDB: richer query language, no partition key requirement
- MongoDB: BSON format with nested documents
- MongoDB: better for ad-hoc queries

**When to use MongoDB:**
- Need flexible, complex queries without partition keys
- Rapidly evolving schema
- Nested document structures
- ACID transactions across documents

### vs PostgreSQL

**Similarities:**
- ACID transactions (DynamoDB supports since 2018)
- Indexes for faster queries
- Primary key concept

**Differences:**
- PostgreSQL: relational model with JOINs
- PostgreSQL: SQL query language
- PostgreSQL: always strongly consistent
- PostgreSQL: harder to scale writes horizontally

**When to use PostgreSQL:**
- Need complex JOINs across tables
- Relational data with foreign keys
- Strong consistency required everywhere
- Moderate scale (vertical scaling sufficient)

### vs Redis

**Similarities:**
- Key-value access pattern
- Fast reads (DynamoDB: single-digit ms, Redis: sub-ms)
- Simple data structures

**Differences:**
- Redis: in-memory (DynamoDB: disk-based)
- Redis: microsecond latency (DynamoDB: milliseconds)
- Redis: limited persistence (DynamoDB: durable)
- Redis: simpler data types (no complex queries)

**When to use Redis:**
- Pure caching layer
- Microsecond latency required
- Simple data structures (strings, hashes, lists)
- Temporary data (sessions, rate limiting)

## Summary Decision Table

| Requirement | DynamoDB | Cassandra | MongoDB | PostgreSQL | Redis |
|-------------|----------|-----------|---------|------------|-------|
| Key-value access | ✅ Excellent | ✅ Excellent | ✅ Good | ⚠️ Possible | ✅ Excellent |
| Complex queries | ❌ Limited | ❌ Limited | ✅ Excellent | ✅ Excellent | ❌ None |
| Horizontal scale | ✅ Automatic | ✅ Built-in | ✅ Sharding | ⚠️ Manual | ⚠️ Cluster |
| Strong consistency | ✅ Optional | ⚠️ Tunable | ✅ Default | ✅ Always | ✅ Single-leader |
| Vendor lock-in | ❌ AWS-only | ✅ Open-source | ✅ Open-source | ✅ Open-source | ✅ Open-source |
| Operational overhead | ✅ None | ❌ High | ⚠️ Medium | ⚠️ Medium | ⚠️ Medium |

## Further Reading

- [DynamoDB Core Components](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html)
- [Query vs Scan](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html)
- [DynamoDB Data Types](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html)
- [DynamoDB Paper (2022)](https://www.amazon.science/publications/amazon-dynamodb-a-scalable-predictably-performant-and-fully-managed-nosql-database-service)
- [Cassandra vs DynamoDB](https://www.datastax.com/blog/cassandra-vs-dynamodb)
- [MongoDB vs DynamoDB](https://www.mongodb.com/compare/mongodb-dynamodb)
