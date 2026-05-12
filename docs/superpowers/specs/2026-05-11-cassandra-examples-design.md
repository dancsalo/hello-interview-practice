# Cassandra Examples Design Specification

**Date:** 2026-05-11  
**Status:** Approved  
**Scope:** Self-contained, interactive TypeScript examples demonstrating Cassandra patterns for system design education

## Overview

Create a comprehensive set of runnable Cassandra examples that illustrate all concepts from `key_technologies/cassandra/original.md`. Students should be able to run interactive examples demonstrating Cassandra's architecture, data modeling, and real-world patterns. This follows the established pattern from Redis, Kafka, and PostgreSQL implementations.

## Goals

1. **Interview preparation**: Cover all Cassandra concepts students need for system design interviews
2. **Comprehensive coverage**: 10 examples covering foundational concepts and real-world patterns
3. **Hands-on learning**: Interactive examples with detailed explanations
4. **Consistent experience**: Match existing Redis/PostgreSQL patterns
5. **Production context**: Include production considerations and interview tips

## Non-Goals

- Multi-node cluster demonstrations (single-node Docker setup)
- Production-ready Cassandra client library
- Performance benchmarking tools
- Complete coverage of every CQL command (focus on patterns)
- Real distributed system behavior (simulated on single node)

## Project Structure

```
hello-interview-practice/
├── docker-compose.yml          # Add Cassandra + Cassandra Web
├── src/
│   └── technologies/
│       └── cassandra/
│           ├── client.ts       # Cassandra connection logic
│           ├── README.md       # Cassandra overview
│           └── examples/
│               ├── 01-basics/
│               │   ├── index.ts
│               │   └── README.md
│               ├── 02-primary-key-design/
│               ├── 03-partitioning-strategy/
│               ├── 04-replication-consistency/
│               ├── 05-write-optimized-architecture/
│               ├── 06-query-driven-modeling/
│               ├── 07-discord-messages/
│               ├── 08-ticketmaster-tickets/
│               ├── 09-timeseries-iot/
│               └── 10-ecommerce-catalog/
├── scripts/
│   ├── test-cassandra-examples.ts  # Test Cassandra examples
│   └── reset-cassandra.ts          # Reset Cassandra data
└── key_technologies/
    └── cassandra/original.md       # Source material (unchanged)
```

## Architecture

### Docker Setup

**Cassandra Service:**
- Image: `cassandra:4.1`
- Port: 9042 (CQL native protocol)
- Memory limit: 2GB
- Health check: `cqlsh -e 'describe cluster'`
- Volume: `cassandra-data:/var/lib/cassandra`

**Cassandra Web UI:**
- Image: `ipushc/cassandra-web:latest`
- Port: 8003
- Connects to Cassandra service
- Provides cluster visualization and data browsing

**Environment variables:**
- `CASSANDRA_PORT` (default: 9042)
- `CASSANDRA_WEB_PORT` (default: 8003)
- `CASSANDRA_HOST` (default: localhost)

### Client Connection (`client.ts`)

```typescript
import { Client } from 'cassandra-driver';

export function createClient(): Client {
  return new Client({
    contactPoints: [process.env.CASSANDRA_HOST || 'localhost'],
    localDataCenter: 'datacenter1',
    keyspace: 'system',
    protocolOptions: {
      port: parseInt(process.env.CASSANDRA_PORT || '9042', 10)
    }
  });
}

export async function healthCheck(client: Client): Promise<boolean> {
  // Verify connection to system keyspace
}
```

### Example Interface

All examples implement the standard interface:

```typescript
interface CassandraExample {
  name: string;
  description: string;
  run: (client: Client, logger: Logger) => Promise<void>;
  cleanup?: (client: Client) => Promise<void>;
}
```

## The 10 Examples

### Example 1: Basics & CQL

**Focus:** Keyspaces, tables, CRUD operations, data types

**What it demonstrates:**
- Create keyspace with SimpleStrategy
- Create table with various data types (text, int, decimal, timestamp, UUID)
- INSERT, SELECT, UPDATE, DELETE operations
- User-defined types (UDTs)
- Collection types (list, set, map)
- Basic CQL commands

**Key operations:**
```cql
CREATE KEYSPACE demo WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};
CREATE TABLE users (id UUID PRIMARY KEY, name text, email text, created_at timestamp);
INSERT INTO users (id, name, email, created_at) VALUES (uuid(), 'Alice', 'alice@example.com', toTimestamp(now()));
SELECT * FROM users;
UPDATE users SET email = 'newemail@example.com' WHERE id = ?;
DELETE FROM users WHERE id = ?;
```

**Logger flow:**
1. Create keyspace
2. Create table with various data types
3. INSERT operations
4. SELECT queries
5. UPDATE operations
6. DELETE operations
7. Collections demo (list, set, map)
8. UDT demo
9. Assertions verifying data
10. Production considerations

**Production considerations:**
- Keyspace replication strategy choice (SimpleStrategy vs NetworkTopologyStrategy)
- UUID vs timeuuid for primary keys
- When to use collections (small, bounded data only)
- UDT usage patterns

---

### Example 2: Primary Key Design

**Focus:** The MOST critical Cassandra concept for interviews

**What it demonstrates:**
- Simple primary key: `PRIMARY KEY (user_id)`
- Compound partition key: `PRIMARY KEY ((tenant_id, user_id))`
- Partition + clustering keys: `PRIMARY KEY (user_id, created_at)`
- Composite partition + clustering: `PRIMARY KEY ((channel_id, bucket), message_id)`
- CLUSTERING ORDER BY (ASC/DESC)
- Query patterns enabled by each design

**Sample tables:**
```cql
-- Simple primary key
CREATE TABLE users_simple (user_id uuid PRIMARY KEY, name text);

-- Compound partition key
CREATE TABLE users_compound (
  tenant_id uuid,
  user_id uuid,
  name text,
  PRIMARY KEY ((tenant_id, user_id))
);

-- Partition + clustering
CREATE TABLE user_events (
  user_id uuid,
  created_at timestamp,
  event_type text,
  PRIMARY KEY (user_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Composite partition + clustering
CREATE TABLE messages (
  channel_id bigint,
  bucket int,
  message_id bigint,
  content text,
  PRIMARY KEY ((channel_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);
```

**Logger flow:**
1. Create each table type with examples
2. Insert sample data
3. Show queries that work efficiently
4. Show queries that DON'T work (explain why)
5. Demonstrate clustering order
6. Explain partition key cardinality importance
7. Common mistakes and how to avoid them
8. Assertions

**Production considerations:**
- Partition key determines data distribution
- High cardinality partition keys = better distribution
- Clustering keys determine sort order within partition
- Wrong primary key = full table scans = very slow
- Query patterns MUST align with primary key design

**Interview tips:**
- Always ask "What are the access patterns?" before designing primary key
- Partition key determines which node holds the data
- Clustering keys provide free sorting within partition
- Can't query on non-key columns without index (avoid indexes for frequent queries)

---

### Example 3: Partitioning Strategy

**Focus:** Consistent hashing, token ranges, partition size

**What it demonstrates:**
- How consistent hashing distributes data (conceptual)
- Token ranges and vnodes
- Partition size considerations (aim for <100MB, <100k rows)
- Partition key cardinality and distribution
- Hot partition problem and solutions
- Bucketing strategies (time-based, hash-based)

**Practical demonstration:**
```cql
-- BAD: All data in one partition
CREATE TABLE user_sessions_bad (
  app_id text,  -- Always 'myapp' = one partition!
  session_id uuid,
  user_id uuid,
  created_at timestamp,
  PRIMARY KEY (app_id, session_id)
);

-- GOOD: Distributed by user_id
CREATE TABLE user_sessions_good (
  user_id uuid,
  session_id uuid,
  created_at timestamp,
  PRIMARY KEY (user_id, session_id)
);

-- BETTER: Bucketing for unbounded growth
CREATE TABLE user_sessions_bucketed (
  user_id uuid,
  date text,  -- YYYY-MM-DD bucket
  session_id uuid,
  created_at timestamp,
  PRIMARY KEY ((user_id, date), session_id)
);
```

**Logger flow:**
1. Explain consistent hashing concept
2. Show token value calculation for partition keys
3. Create bad partition key example (low cardinality)
4. Insert data and show it goes to one partition
5. Create good partition key example (high cardinality)
6. Insert data and show distribution
7. Demonstrate bucketing strategy
8. Explain partition size monitoring
9. Assertions

**Production considerations:**
- Monitor partition sizes (nodetool cfstats)
- Unbounded partitions will eventually cause performance problems
- Hot partitions can overwhelm single nodes
- Bucketing prevents unbounded growth
- Choose bucket size based on write rate and query patterns

**Interview tips:**
- Consistent hashing minimizes data movement when nodes join/leave
- Vnodes (256 per node by default) improve distribution
- Hot partition = one node handling too much load
- Solution: compound partition key with high-cardinality component
- Time-based bucketing common for time-series data

---

### Example 4: Replication & Consistency

**Focus:** CAP theorem in practice, consistency levels

**What it demonstrates:**
- Replication factor configuration (RF=1, RF=3)
- Consistency levels: ONE, QUORUM, ALL, LOCAL_QUORUM
- Read + Write consistency combinations
- QUORUM math: R + W > RF guarantees strong consistency
- Eventual consistency behavior
- Availability vs consistency tradeoffs

**Keyspace configurations:**
```cql
-- Single replica (no fault tolerance)
CREATE KEYSPACE demo_rf1 WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};

-- Three replicas (fault tolerant)
CREATE KEYSPACE demo_rf3 WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 3
};

-- Multi-datacenter (production)
CREATE KEYSPACE demo_multi_dc WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3,
  'dc2': 2
};
```

**Consistency level demonstration:**
```typescript
// Write with QUORUM consistency
await client.execute(query, params, { consistency: types.consistencies.quorum });

// Read with ONE consistency (eventual)
await client.execute(query, params, { consistency: types.consistencies.one });

// Read with QUORUM consistency (strong with QUORUM writes)
await client.execute(query, params, { consistency: types.consistencies.quorum });
```

**Logger flow:**
1. Create keyspaces with different replication factors
2. Explain what each consistency level means
3. Show consistency level configuration in code
4. Explain QUORUM math (RF=3: need 2 nodes for QUORUM)
5. Demonstrate R + W > RF rule for strong consistency
6. Create tradeoff matrix (consistency vs availability)
7. Production scenarios and recommendations
8. Assertions

**Consistency/Availability Matrix:**
```
Write CL | Read CL  | Consistency     | Availability
---------|----------|-----------------|-------------
ONE      | ONE      | Eventual        | Highest
ONE      | QUORUM   | Eventual        | High
QUORUM   | ONE      | Eventual        | High
QUORUM   | QUORUM   | Strong          | Medium
ALL      | ONE      | Strong          | Low
```

**Production considerations:**
- QUORUM for both reads/writes = strong consistency with good availability
- LOCAL_QUORUM in multi-DC setups (don't cross DC for every request)
- ONE for maximum availability, eventual consistency
- ALL rarely used (single node failure = downtime)
- Tune per-query based on requirements

**Interview tips:**
- Cassandra prioritizes availability (AP in CAP theorem)
- Can tune toward consistency with QUORUM
- Read repair and hinted handoff provide eventual consistency
- Multi-DC replication for disaster recovery
- Explain tradeoffs: consistency = more nodes must respond = higher latency

---

### Example 5: Write-Optimized Architecture

**Focus:** LSM trees, why Cassandra excels at writes

**What it demonstrates:**
- Commit log (write-ahead log for durability)
- Memtable (in-memory sorted structure)
- SSTable flush (immutable disk files)
- Compaction (merging SSTables)
- Tombstones (how deletes work)
- Read path: memtable → bloom filter → SSTables
- Why writes are fast, reads can be slower

**Write path explanation:**
```
1. Write arrives
2. Append to commit log (sequential disk write, fast)
3. Write to memtable (in-memory, fastest)
4. Acknowledge to client
5. When memtable full: flush to SSTable on disk
6. SSTables are immutable (no random disk writes)
7. Compaction merges SSTables in background
```

**Practical demonstration:**
```cql
CREATE TABLE write_demo (
  id uuid PRIMARY KEY,
  value text,
  counter int
);

-- Insert (creates new entry in memtable/SSTable)
INSERT INTO write_demo (id, value, counter) VALUES (uuid(), 'v1', 1);

-- Update (creates NEW entry with same id, newer timestamp)
UPDATE write_demo SET value = 'v2', counter = 2 WHERE id = ?;

-- Delete (creates TOMBSTONE entry)
DELETE FROM write_demo WHERE id = ?;
```

**Logger flow:**
1. Explain write path components (commit log, memtable, SSTable)
2. Perform bulk inserts and explain flow
3. Show updates create new entries (not in-place)
4. Explain timestamps and "last write wins"
5. Demonstrate deletes create tombstones
6. Show tombstone in data
7. Explain compaction process
8. Read path walkthrough (memtable → bloom filters → SSTables)
9. Why reads can hit multiple SSTables
10. Assertions

**Production considerations:**
- Writes are O(1) - always fast (commit log + memtable)
- Reads are O(log n) - must check multiple SSTables
- Compaction strategy choice:
  - Size-Tiered (default): good for writes, okay for reads
  - Leveled: better read performance, more I/O
  - Time-Window: best for time-series with TTL
- Monitor SSTable count per table
- Too many SSTables = slow reads, trigger compaction
- Tombstones affect read performance until compacted

**Interview tips:**
- Cassandra write-optimized via LSM trees
- No B-tree random disk writes like traditional DBs
- Updates/deletes are writes (new entries)
- Immutable SSTables enable simplified concurrency
- Compaction is critical for maintaining performance
- Trade-off: write speed vs eventual read complexity

---

### Example 6: Query-Driven Data Modeling

**Focus:** Denormalization strategies, anti-patterns

**What it demonstrates:**
- Entity-relationship modeling vs query-driven modeling
- Same entity in multiple tables for different queries
- Denormalization patterns (duplicating data across tables)
- Application-level writes to multiple tables
- When to denormalize vs when to use SAIs
- Why JOINs don't exist in Cassandra

**Practical demonstration - Blog System:**

**Normalized approach (DOESN'T WORK):**
```cql
-- This is how you'd model in a relational DB
CREATE TABLE posts (
  post_id uuid PRIMARY KEY,
  author_id uuid,
  title text,
  content text,
  created_at timestamp
);

-- Can't query "posts by author" efficiently!
-- Can't query "recent posts" efficiently!
-- Would need secondary indexes or full table scans
```

**Denormalized approach (CORRECT):**
```cql
-- Table 1: Query posts by author
CREATE TABLE posts_by_author (
  author_id uuid,
  post_id uuid,
  title text,
  content text,
  created_at timestamp,
  PRIMARY KEY (author_id, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Table 2: Query recent posts
CREATE TABLE posts_by_date (
  date text,  -- YYYY-MM-DD bucket
  post_id uuid,
  author_id uuid,
  title text,
  content text,
  created_at timestamp,
  PRIMARY KEY (date, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);

-- Table 3: Query posts by tag
CREATE TABLE posts_by_tag (
  tag text,
  post_id uuid,
  author_id uuid,
  title text,
  created_at timestamp,
  PRIMARY KEY (tag, created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

**Application writes to multiple tables:**
```typescript
// When creating a post, write to all tables
async function createPost(authorId, title, content, tags) {
  const postId = uuid();
  const createdAt = new Date();
  const date = createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Write to posts_by_author
  await client.execute(
    'INSERT INTO posts_by_author (author_id, post_id, title, content, created_at) VALUES (?, ?, ?, ?, ?)',
    [authorId, postId, title, content, createdAt]
  );
  
  // Write to posts_by_date
  await client.execute(
    'INSERT INTO posts_by_date (date, post_id, author_id, title, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [date, postId, authorId, title, content, createdAt]
  );
  
  // Write to posts_by_tag for each tag
  for (const tag of tags) {
    await client.execute(
      'INSERT INTO posts_by_tag (tag, post_id, author_id, title, created_at) VALUES (?, ?, ?, ?, ?)',
      [tag, postId, authorId, title, createdAt]
    );
  }
}
```

**Logger flow:**
1. Introduce blog system requirements
2. Show normalized approach
3. Explain why it doesn't work in Cassandra
4. Show denormalized tables
5. Insert post data into all tables
6. Execute queries: by author, by date, by tag
7. Show each query hits single partition (fast)
8. Explain write complexity tradeoff
9. When to use SAIs vs denormalization
10. Assertions

**Production considerations:**
- Denormalization is mandatory for efficient queries
- Application handles consistency across tables
- Write to all tables in logged batch for atomicity (within partition)
- Use Materialized Views for automatic denormalization (Cassandra manages it)
- SAIs for infrequent queries (flexibility over performance)
- Denormalized tables for frequent queries (performance over flexibility)
- Disk space is cheap, query time is expensive

**Interview tips:**
- "What are the access patterns?" is the first question
- One table per query pattern
- Cassandra doesn't do JOINs - denormalize instead
- Write amplification is expected (3 queries vs 1)
- Eventual consistency across tables (unless using logged batch)
- Explain tradeoff: write complexity for read efficiency

---

### Example 7: Discord Messages

**Focus:** Chat/messaging systems, bucketing strategy

**What it demonstrates:**
- Real-world messaging pattern from Discord engineering blog
- Original schema problem: unbounded partition growth
- Bucketing solution: 10-day time buckets
- Snowflake IDs for message_id (chronologically sortable)
- Composite partition key: `(channel_id, bucket)`
- CLUSTERING ORDER BY message_id DESC (most recent first)
- Partition size management

**Original schema (PROBLEM):**
```cql
CREATE TABLE messages_v1 (
  channel_id bigint,
  message_id bigint,
  author_id bigint,
  content text,
  PRIMARY KEY (channel_id, message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- Problem: Busy channels grow unbounded
-- Eventually partition becomes too large (>100MB)
-- Performance degrades over time
```

**Fixed schema (SOLUTION):**
```cql
CREATE TABLE messages (
  channel_id bigint,
  bucket int,          -- 10-day bucket since DISCORD_EPOCH
  message_id bigint,   -- Snowflake ID (chronologically sortable)
  author_id bigint,
  content text,
  PRIMARY KEY ((channel_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);

-- Solution: Partition per channel per 10-day bucket
-- Even busiest channels stay under partition size limit
-- New bucket created automatically over time
```

**Bucket calculation:**
```typescript
const DISCORD_EPOCH = new Date('2015-01-01').getTime();

function getBucket(messageId: bigint): number {
  // Extract timestamp from Snowflake ID
  const timestamp = Number((messageId >> 22n) + BigInt(DISCORD_EPOCH));
  const daysSinceEpoch = Math.floor((timestamp - DISCORD_EPOCH) / (1000 * 60 * 60 * 24));
  return Math.floor(daysSinceEpoch / 10); // 10-day buckets
}
```

**Logger flow:**
1. Explain Discord's messaging requirements
2. Show original schema
3. Insert many messages, explain partition growth problem
4. Show fixed schema with bucketing
5. Insert messages across multiple buckets
6. Query most recent messages (single partition, bucket N)
7. Query older messages (different partition, bucket N-1)
8. Explain bucket size calculation
9. Show partition size stays bounded
10. Assertions

**Production considerations:**
- Bucket size based on write volume and query patterns
- Discord chose 10 days (busy channels stay under 100MB/bucket)
- Most queries hit current bucket only
- Historical queries may span 2 buckets (bucket boundary)
- Monitor partition sizes to validate bucket size choice
- Snowflake IDs prevent collisions (UUID + timestamp)

**Interview tips:**
- Bucketing prevents unbounded partition growth
- Common for time-series data (messages, events, logs)
- Bucket size is a tuning parameter
- Explains query pattern: "show last 50 messages" = current bucket only
- Trade-off: query simplicity (older data spans partitions)
- Real-world example from Discord blog post

---

### Example 8: Ticketmaster Tickets

**Focus:** Event ticketing, section-based partitioning, denormalization

**What it demonstrates:**
- Real-world event ticketing pattern
- Original schema problem: large partitions for big events
- Section-based partitioning distributes load
- Denormalized `event_sections` table for aggregates
- Composite partition key: `(event_id, section_id)`
- UX-driven data modeling

**Original schema (PROBLEM):**
```cql
CREATE TABLE tickets_v1 (
  event_id bigint,
  seat_id bigint,
  section_id bigint,
  price decimal,
  PRIMARY KEY (event_id, seat_id)
);

-- Problem: Large events (10k+ seats) = large partition
-- Aggregations (tickets available, price stats) = table scan
-- High query volume on popular events = hot partition
```

**Fixed schemas (SOLUTION):**
```cql
-- Table 1: Individual tickets by section
CREATE TABLE tickets (
  event_id bigint,
  section_id bigint,
  seat_id bigint,
  price decimal,
  available boolean,
  PRIMARY KEY ((event_id, section_id), seat_id)
);

-- Table 2: Section aggregates (denormalized)
CREATE TABLE event_sections (
  event_id bigint,
  section_id bigint,
  section_name text,
  num_tickets bigint,
  num_available bigint,
  price_floor decimal,
  PRIMARY KEY (event_id, section_id)
);
```

**UX flow and queries:**
```typescript
// Step 1: User views event map with sections
// Query: Get all sections for event (shows availability, price range)
const sections = await client.execute(
  'SELECT * FROM event_sections WHERE event_id = ?',
  [eventId]
);
// Returns: [{section_id: 'A', num_available: 120, price_floor: 50.00}, ...]

// Step 2: User clicks section A
// Query: Get all seats in section A
const seats = await client.execute(
  'SELECT * FROM tickets WHERE event_id = ? AND section_id = ?',
  [eventId, 'A']
);
// Returns individual seats in section A
```

**Logger flow:**
1. Explain Ticketmaster UX and requirements
2. Show original schema
3. Insert large event (10k tickets), explain problems
4. Show fixed schemas (tickets + event_sections)
5. Insert event data across sections
6. Query event sections (aggregate view)
7. Query specific section tickets (individual seats)
8. Explain how UX drives data model
9. Show denormalization strategy
10. Assertions

**Production considerations:**
- Section-based partitioning distributes load across nodes
- Smaller partitions = better performance
- Denormalized aggregates avoid table scans
- Application updates both tables (or use Materialized View)
- Eventual consistency acceptable (slight staleness in availability counts)
- Real-world constraint: venue sections are fixed (bounded partition growth)

**Interview tips:**
- UX requirements inform partition key design
- Multi-level data (event → section → seat) = opportunity for partitioning
- Denormalization for aggregates (totals, averages, min/max)
- Explain tradeoff: write to multiple tables for read efficiency
- Section-based partitioning distributes hot events across cluster
- Real-world pattern for hierarchical data

---

### Example 9: Time-Series IoT Data

**Focus:** Sensor/metrics data, time-windowed queries, TTL

**What it demonstrates:**
- Time-series pattern for sensor data
- Time-based partition keys (day, hour, month buckets)
- Clustering by timestamp (chronological order)
- TTL for automatic data expiration
- High write volume handling
- Time-windowed queries

**Schema:**
```cql
CREATE TABLE sensor_data (
  sensor_id text,
  date text,  -- YYYY-MM-DD for daily buckets
  timestamp timestamp,
  temperature decimal,
  humidity decimal,
  battery_level int,
  PRIMARY KEY ((sensor_id, date), timestamp)
) WITH CLUSTERING ORDER BY (timestamp DESC)
AND default_time_to_live = 2592000;  -- 30 days TTL
```

**Alternative bucket sizes:**
```cql
-- Hourly buckets (high-frequency sensors)
CREATE TABLE sensor_data_hourly (
  sensor_id text,
  hour text,  -- YYYY-MM-DD-HH
  timestamp timestamp,
  temperature decimal,
  PRIMARY KEY ((sensor_id, hour), timestamp)
);

-- Monthly buckets (low-frequency sensors)
CREATE TABLE sensor_data_monthly (
  sensor_id text,
  month text,  -- YYYY-MM
  timestamp timestamp,
  temperature decimal,
  PRIMARY KEY ((sensor_id, month), timestamp)
);
```

**Typical queries:**
```typescript
// Query today's data (single partition)
const today = '2026-05-11';
const todayData = await client.execute(
  'SELECT * FROM sensor_data WHERE sensor_id = ? AND date = ?',
  [sensorId, today]
);

// Query date range (multiple partitions)
const dates = ['2026-05-09', '2026-05-10', '2026-05-11'];
for (const date of dates) {
  const data = await client.execute(
    'SELECT * FROM sensor_data WHERE sensor_id = ? AND date = ?',
    [sensorId, date]
  );
  // Merge results
}

// Query time window within a day
const startTime = '2026-05-11 08:00:00';
const endTime = '2026-05-11 12:00:00';
const windowData = await client.execute(
  'SELECT * FROM sensor_data WHERE sensor_id = ? AND date = ? AND timestamp >= ? AND timestamp <= ?',
  [sensorId, '2026-05-11', startTime, endTime]
);
```

**Logger flow:**
1. Explain IoT time-series use case
2. Show schema with time-based bucketing
3. Insert sensor readings over multiple days
4. Query single day (single partition, fast)
5. Query date range (multiple partitions)
6. Query time window within day (clustering key range)
7. Demonstrate TTL expiration (show data older than TTL)
8. Explain bucket size tradeoffs
9. Write volume considerations
10. Assertions

**Production considerations:**
- Bucket size based on write frequency and query patterns
  - Daily buckets: 1 reading/second = 86,400 rows/day/sensor
  - Hourly buckets: 10 readings/second = 36,000 rows/hour/sensor
- TTL automatically deletes old data (no manual cleanup)
- Compaction removes TTL'd data on schedule
- High write throughput: Cassandra excels at this (LSM trees)
- Time-windowed queries span few partitions
- Historical queries may be slower (many partitions)

**Interview tips:**
- Time-series is classic Cassandra use case
- Time-based bucketing prevents unbounded growth
- TTL eliminates operational burden of data deletion
- Write-optimized architecture handles high ingestion rates
- Partition per sensor per time bucket = good distribution
- Real-world use: IoT, metrics, logs, monitoring
- Explain tradeoff: current data queries (fast) vs historical range queries (slower)

---

### Example 10: E-Commerce Product Catalog

**Focus:** Multi-access patterns, SAIs vs denormalization tradeoffs

**What it demonstrates:**
- Multiple access patterns for same entity (product)
- Primary table with partition key `product_id`
- Denormalized table for frequent queries (by category)
- Storage Attached Index (SAI) for infrequent queries (by price range)
- When to use SAIs vs denormalization
- Performance characteristics of each approach

**Schemas:**
```cql
-- Primary table: lookup by product_id
CREATE TABLE products (
  product_id uuid PRIMARY KEY,
  name text,
  description text,
  category text,
  price decimal,
  inventory int,
  created_at timestamp
);

-- SAI for price range queries (infrequent)
CREATE INDEX ON products(price) USING 'sai';

-- Denormalized table for category queries (frequent)
CREATE TABLE products_by_category (
  category text,
  product_id uuid,
  name text,
  price decimal,
  inventory int,
  PRIMARY KEY (category, price)
) WITH CLUSTERING ORDER BY (price ASC);

-- Denormalized table for search (if needed)
CREATE TABLE products_by_name (
  name_prefix text,  -- First 3 chars for partitioning
  name text,
  product_id uuid,
  category text,
  price decimal,
  PRIMARY KEY (name_prefix, name)
);
```

**Access patterns and queries:**
```typescript
// Pattern 1: Lookup by product_id (primary key, fastest)
const product = await client.execute(
  'SELECT * FROM products WHERE product_id = ?',
  [productId]
);

// Pattern 2: Browse by category (denormalized, fast)
const electronicsProducts = await client.execute(
  'SELECT * FROM products_by_category WHERE category = ?',
  ['electronics']
);

// Pattern 3: Filter by price range (SAI, flexible but slower)
const productsInRange = await client.execute(
  'SELECT * FROM products WHERE price >= ? AND price <= ?',
  [50, 100]
);

// Pattern 4: Category + price range (denormalized with clustering key)
const affordableElectronics = await client.execute(
  'SELECT * FROM products_by_category WHERE category = ? AND price >= ? AND price <= ?',
  ['electronics', 50, 100]
);
```

**Performance comparison:**
```
Access Pattern              | Approach           | Partitions | Performance
----------------------------|--------------------|-----------|--------------
By product_id               | Primary key        | 1         | Fastest
By category                 | Denormalized table | 1         | Fast
By price range              | SAI                | Many      | Slower
By category + price range   | Denormalized table | 1         | Fast
```

**Logger flow:**
1. Explain e-commerce catalog requirements (multiple access patterns)
2. Create all schemas (products, products_by_category, SAI)
3. Insert products into products table
4. Application writes to products_by_category (denormalization)
5. Query by product_id (primary key lookup, show speed)
6. Query by category (denormalized table, show speed)
7. Query by price range (SAI, show speed - slower)
8. Query by category + price (denormalized, show speed)
9. Explain when to use each approach
10. Assertions

**Decision matrix:**
```
Query Pattern               | Frequency | Approach
----------------------------|-----------|-------------------
Lookup by ID                | High      | Primary key
Filter by category          | High      | Denormalized table
Filter by price             | Low       | SAI
Category + price filter     | Medium    | Denormalized table
Search by name              | Low       | SAI or external search (Elasticsearch)
```

**Production considerations:**
- Denormalize for frequent queries (read-heavy)
- SAIs for infrequent, flexible queries (acceptable latency)
- SAIs scan multiple partitions (slower than partition key queries)
- Application manages writes to denormalized tables
- Alternative: Materialized Views (Cassandra manages denormalization)
- Consider external search engine (Elasticsearch) for complex search

**Interview tips:**
- Multi-access patterns are common in real systems
- Denormalization = fast reads, complex writes
- SAIs = flexible queries, slower performance
- Explain tradeoff: performance vs flexibility vs write complexity
- "How many tables do you need?" → One per frequent access pattern
- SAIs introduced in Cassandra 4.0 (relatively new feature)
- Real-world: most systems combine approaches based on query frequency

---

## CLI Integration

### Add to Technology Menu

Update `src/cli.ts`:

```typescript
const technologies = [
  { name: 'Redis', examples: redisExamples },
  { name: 'Kafka', examples: kafkaExamples },
  { name: 'PostgreSQL', examples: postgresExamples },
  { name: 'Cassandra', examples: cassandraExamples },  // NEW
];
```

### Health Check

Before showing Cassandra in the menu:
1. Connect to Cassandra on port 9042
2. Query system keyspace to verify accessibility
3. Check Cassandra Web UI availability (port 8003)
4. Display warning if Cassandra unavailable

### Example Execution

Match existing pattern:
1. Create Cassandra client
2. Run example with logger
3. Handle errors gracefully
4. Run cleanup function if defined
5. Close connection

---

## Testing Strategy

### Test Script (`scripts/test-cassandra-examples.ts`)

Match existing Redis/PostgreSQL test patterns:

```typescript
async function testExample(example: CassandraExample): Promise<TestResult> {
  const client = createClient();
  const logger = createTestLogger();
  
  try {
    await client.connect();
    await example.run(client, logger);
    
    // Verify all assertions passed
    if (logger.assertionsFailed > 0) {
      return { success: false, errors: logger.errors };
    }
    
    // Run cleanup
    if (example.cleanup) {
      await example.cleanup(client);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, errors: [error] };
  } finally {
    await client.shutdown();
  }
}
```

**Test coverage:**
- All 10 examples run without errors
- All assertions pass
- Schema creation succeeds
- Queries return expected results
- Cleanup removes test data
- Report pass/fail for each example

### Integration into npm scripts

```json
{
  "test:cassandra": "tsx scripts/test-cassandra-examples.ts",
  "test": "npm run test:redis && npm run test:postgres && npm run test:cassandra"
}
```

---

## Reset Script

### `scripts/reset-cassandra.ts`

Match existing reset pattern:

```typescript
async function resetCassandra(): Promise<void> {
  const client = createClient();
  
  try {
    await client.connect();
    
    // Get all keyspaces
    const result = await client.execute(
      "SELECT keyspace_name FROM system_schema.keyspaces"
    );
    
    // Drop non-system keyspaces
    for (const row of result.rows) {
      const keyspace = row.keyspace_name;
      if (!keyspace.startsWith('system')) {
        await client.execute(`DROP KEYSPACE IF EXISTS ${keyspace}`);
        console.log(`Dropped keyspace: ${keyspace}`);
      }
    }
    
    console.log('Cassandra reset complete');
  } finally {
    await client.shutdown();
  }
}
```

### Integration into npm scripts

```json
{
  "reset:cassandra": "tsx scripts/reset-cassandra.ts",
  "reset": "npm run reset:redis && npm run reset:postgres && npm run reset:cassandra"
}
```

---

## Documentation

### Main README Updates

**Add to Technologies section:**

```markdown
### Technologies

- ✅ **Redis** (10 examples) - Cache, distributed locks, leaderboards, rate limiting, pub/sub, and more
- ✅ **Kafka** (2 examples, 8 more coming) - Event streaming, partitioning, consumer groups, and more
- ✅ **PostgreSQL** (7 examples) - Transactions, indexing, full-text search, replication, optimization
- ✅ **Cassandra** (10 examples) - Wide-column NoSQL, partitioning, replication, data modeling, real-world patterns
- 🔜 **Elasticsearch** - Coming soon
```

**Add Cassandra Examples section:**

```markdown
## Cassandra Examples

The Cassandra technology includes 10 comprehensive examples:

**Phase 1: Core Interview Topics**

1. **Basics & CQL** - Keyspaces, tables, CRUD operations, data types, collections
2. **Primary Key Design** - Partition keys, clustering keys, compound keys, query patterns
3. **Partitioning Strategy** - Consistent hashing, token ranges, hot partition avoidance
4. **Replication & Consistency** - Replication factors, consistency levels, CAP theorem tradeoffs
5. **Write-Optimized Architecture** - LSM trees, commit log, memtables, SSTables, compaction
6. **Query-Driven Data Modeling** - Denormalization strategies, multiple tables per entity

**Phase 2: Real-World Interview Scenarios**

7. **Discord Messages** - Chat/messaging systems with partition bucketing
8. **Ticketmaster Tickets** - Event ticketing with section-based partitioning
9. **Time-Series IoT** - Sensor/metrics data with time-windowed queries and TTL
10. **E-Commerce Catalog** - Multi-access patterns with SAIs vs denormalization

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key CQL commands
- Production considerations
- Interview tips
- Further reading

See `src/technologies/cassandra/README.md` for more details.
```

**Update Services section:**

```markdown
### Cassandra
- **Port**: 9042 (CQL native protocol)
- **UI**: Cassandra Web at http://localhost:8003
- **Image**: cassandra:4.1
- **Use**: Wide-column NoSQL, high availability, write-heavy workloads, flexible schemas
```

**Update commands:**

```bash
npm run test:cassandra    # Test Cassandra examples only
npm run reset:cassandra   # Reset only Cassandra data
```

### Cassandra README (`src/technologies/cassandra/README.md`)

**Structure:**

1. **Overview**
   - What is Cassandra
   - Why it matters for system design
   - Key features (distributed, highly available, write-optimized)

2. **When to Use Cassandra**
   - High availability requirements (AP in CAP theorem)
   - Write-heavy workloads (IoT, logs, time-series)
   - Linear scalability needs
   - Flexible/wide column schemas
   - Multi-datacenter replication

3. **When NOT to Use Cassandra**
   - ACID transactions required
   - Complex JOINs or ad-hoc queries
   - Strong consistency critical
   - Small datasets (<1TB)

4. **Key Concepts**
   - Partitioning (consistent hashing, vnodes)
   - Replication (RF, NetworkTopologyStrategy)
   - Consistency levels (QUORUM, ONE, ALL)
   - LSM trees (commit log, memtable, SSTable)
   - Data modeling (query-driven, denormalization)

5. **Examples Overview**
   - Brief description of all 10 examples
   - Learning path recommendations

6. **Getting Started**
   - Docker setup
   - Running examples
   - Accessing Cassandra Web

7. **Common Patterns**
   - Bucketing for time-series
   - Denormalization for multiple access patterns
   - Composite partition keys for distribution
   - TTL for automatic expiration

8. **Interview Tips**
   - Primary key design is critical
   - Query-driven data modeling
   - CAP theorem tradeoffs
   - When to choose Cassandra vs other DBs

9. **Production Considerations**
   - Partition size monitoring (<100MB)
   - Compaction strategy selection
   - Consistency level tuning
   - Replication factor choice

10. **Further Reading**
    - Apache Cassandra documentation
    - Discord engineering blog (messages use case)
    - DataStax resources
    - CAP theorem papers

### Individual Example READMEs

Each example directory includes a `README.md`:

**Structure:**
1. **What This Demonstrates**
2. **Why This Matters**
3. **How It Works** (with CQL snippets)
4. **Key Concepts**
5. **Production Considerations**
6. **Interview Tips**
7. **Further Reading**

---

## Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "cassandra-driver": "^4.7.2"
  },
  "devDependencies": {
    "@types/cassandra-driver": "^3.6.0"
  }
}
```

---

## Implementation Standards

### Code Quality

- TypeScript with strict typing
- Async/await for all Cassandra operations
- Proper error handling (try/catch)
- Logger methods: `section()`, `step()`, `command()`, `info()`, `success()`, `warning()`, `assert()`, `production()`
- Comments explain "why" not "what"
- CQL queries formatted for readability

### Example Execution Flow

Every example follows this pattern:

```typescript
1. logger.section('Example Title')
2. logger.info('Brief description')
3. Setup phase (create keyspace, tables)
4. Step-by-step demonstration with logger.step()
5. Show CQL commands with logger.command()
6. Execute queries and show results
7. Assertions with logger.assert()
8. Production considerations with logger.production()
9. Interview tips with logger.production()
10. Cleanup in cleanup() function
```

### Consistent Naming

- Keyspaces: `demo`, `discord_demo`, `ticketmaster_demo`, etc.
- Tables: descriptive names matching use case
- Variables: camelCase in TypeScript, snake_case in CQL
- Files: kebab-case (e.g., `01-basics`, `07-discord-messages`)

---

## Success Criteria

**Functional:**
- ✅ All 10 examples run without errors
- ✅ All assertions pass in test suite
- ✅ Docker setup works on first try (`docker-compose up -d`)
- ✅ CLI shows Cassandra in technology menu
- ✅ Cassandra Web UI accessible at http://localhost:8003
- ✅ Reset script clears all non-system keyspaces
- ✅ Examples match Redis/PostgreSQL quality and style

**Educational:**
- ✅ Examples cover all major Cassandra concepts from original.md
- ✅ Real-world patterns (Discord, Ticketmaster, IoT, e-commerce) included
- ✅ Production considerations explained in each example
- ✅ Interview tips provided for key concepts
- ✅ Progression from foundational to advanced topics

**Documentation:**
- ✅ Cassandra README comprehensive and helpful
- ✅ Individual example READMEs provide context
- ✅ Main README updated with Cassandra section
- ✅ Clear getting started instructions

---

## Timeline Estimate

**Phase 1: Infrastructure (1-2 days)**
- Docker compose configuration
- Client connection setup
- CLI integration
- Test/reset scripts scaffolding

**Phase 2: Foundational Examples (3-4 days)**
- Examples 1-6 (basics through query-driven modeling)
- Documentation for each
- Test coverage

**Phase 3: Real-World Examples (2-3 days)**
- Examples 7-10 (Discord, Ticketmaster, IoT, e-commerce)
- Documentation for each
- Test coverage

**Phase 4: Documentation & Polish (1-2 days)**
- Cassandra README
- Main README updates
- Individual example READMs
- Final testing

**Total: 7-11 days**

---

## Open Questions

None - design is complete and ready for implementation.

---

## References

- Original document: `key_technologies/cassandra/original.md`
- Discord engineering blog: [How Discord Stores Billions of Messages](https://discord.com/blog/how-discord-stores-billions-of-messages)
- Apache Cassandra documentation: https://cassandra.apache.org/doc/
- Existing implementations: Redis, Kafka, PostgreSQL examples in this repo
