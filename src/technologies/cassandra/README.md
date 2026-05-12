# Cassandra Examples

Comprehensive examples demonstrating Apache Cassandra for system design interviews.

## Overview

Apache Cassandra is an open-source, distributed NoSQL database designed for high availability and linear scalability. Originally built by Facebook for inbox search, Cassandra has been adopted by companies like Discord, Netflix, Apple, and Bloomberg for handling massive data footprints and high throughput workloads.

**Key Features:**
- **Distributed Architecture**: Masterless, peer-to-peer design with no single point of failure
- **High Availability**: Tunable replication and consistency (AP in CAP theorem)
- **Write-Optimized**: LSM tree storage enables extremely fast writes
- **Linear Scalability**: Add nodes to linearly increase throughput and storage
- **Flexible Schema**: Wide-column model supports sparse, varied data
- **Multi-Datacenter**: Built-in support for geographic distribution

## When to Use Cassandra

Cassandra excels in specific scenarios:

### Best Use Cases

- **High Availability Requirements**: Systems that must stay up (AP in CAP theorem)
- **Write-Heavy Workloads**: IoT data, logging, time-series metrics, messaging
- **Linear Scalability Needs**: Systems that need to scale horizontally without limits
- **Flexible Schemas**: Wide-column model handles varying column sets per row
- **Multi-Datacenter Replication**: Geographic distribution for disaster recovery and latency
- **Time-Series Data**: Sensor readings, events, logs with time-based access patterns

### Real-World Examples

- **Discord**: Messages table (billions of messages, high write volume)
- **Netflix**: User viewing history and recommendations
- **Apple**: iCloud backend storage
- **Uber**: Trip data and real-time location tracking
- **eBay**: Shopping cart and product catalog

## When NOT to Use Cassandra

Cassandra has important limitations:

- **ACID Transactions Required**: No multi-row, multi-table transactions
- **Complex JOINs Needed**: No JOIN support (query-driven modeling required)
- **Strong Consistency Critical**: Eventual consistency by default (tunable but not like RDBMS)
- **Small Datasets**: Overhead not worth it for <1TB (use PostgreSQL or MySQL)
- **Ad-Hoc Queries**: Schema must match query patterns (not flexible like relational DBs)
- **Complex Aggregations**: No built-in GROUP BY, aggregations require denormalization

## Key Concepts

### Partitioning

Cassandra uses **consistent hashing** to distribute data across nodes:

- **Hash Ring**: Token range (e.g., 0 to 2^63-1) organized as a ring
- **Vnodes**: Virtual nodes (default 256 per physical node) for better distribution
- **Partition Key**: Hashed to determine which node(s) store the data
- **Benefits**: Minimal data movement when nodes join/leave cluster

**Critical for interviews:** Partition key design determines data distribution and query efficiency.

### Replication

Data is replicated for fault tolerance:

- **Replication Factor (RF)**: Number of replicas per partition (typically RF=3)
- **SimpleStrategy**: For single datacenter (clockwise on ring)
- **NetworkTopologyStrategy**: For production (datacenter/rack aware)
- **Coordinator Node**: Any node can coordinate queries (masterless architecture)

### Consistency Levels

Cassandra allows **tunable consistency** via consistency levels:

- **ONE**: Single replica must respond (highest availability, eventual consistency)
- **QUORUM**: Majority (RF/2 + 1) must respond (balanced)
- **ALL**: All replicas must respond (strong consistency, lowest availability)
- **LOCAL_QUORUM**: Majority in local datacenter (multi-DC deployments)

**QUORUM Math**: Write at QUORUM + Read at QUORUM = Strong consistency  
(At least one overlapping node guarantees visibility)

### LSM Trees (Storage Model)

Cassandra's **Log-Structured Merge Tree** architecture enables fast writes:

1. **Commit Log**: Write-ahead log for durability (sequential disk write)
2. **Memtable**: In-memory sorted structure (recent writes)
3. **SSTable**: Immutable on-disk sorted files (flushed memtables)
4. **Compaction**: Background merging of SSTables (consolidates updates/deletes)

**Why writes are fast**: Append-only writes to commit log + memtable (no random disk I/O)  
**Why reads can be slower**: Must check memtable + multiple SSTables + bloom filters

### Data Modeling

Cassandra requires **query-driven data modeling**:

- **Start with Access Patterns**: "What queries will the app run?"
- **One Table Per Query**: Denormalize data into multiple tables
- **No JOINs**: Duplicate data across tables instead
- **Partition Key Design**: Determines distribution and query efficiency
- **Clustering Keys**: Provide free sorting within partition

**Critical mindset shift**: Entity-relationship modeling (RDBMS) → Query-driven modeling (Cassandra)

## Examples Overview

These 10 examples progressively demonstrate Cassandra concepts:

### 1. Basics & CQL
Introduction to keyspaces, tables, CRUD operations, data types, collections, and user-defined types (UDTs).

**Learn**: Core CQL syntax and Cassandra data structures

### 2. Primary Key Design
The MOST critical concept for interviews. Demonstrates simple keys, compound partition keys, clustering keys, and composite designs.

**Learn**: How primary keys determine query patterns and data distribution

### 3. Partitioning Strategy
Consistent hashing, token ranges, partition size limits, hot partitions, and bucketing strategies.

**Learn**: How data distributes across nodes and partition size management

### 4. Replication & Consistency
Replication factors, consistency levels (ONE, QUORUM, ALL), CAP theorem tradeoffs, and availability vs consistency.

**Learn**: Tunable consistency and how to balance availability with consistency

### 5. Write-Optimized Architecture
LSM trees, commit logs, memtables, SSTables, compaction, tombstones, and the read/write path.

**Learn**: Why Cassandra excels at writes and how storage works internally

### 6. Query-Driven Data Modeling
Denormalization strategies, multiple tables for same entity, application-level writes, and anti-patterns.

**Learn**: How to model data for Cassandra's query constraints

### 7. Discord Messages
Real-world messaging pattern from Discord's engineering blog. Demonstrates bucketing to prevent unbounded partition growth.

**Learn**: Time-based bucketing and production data modeling for chat systems

### 8. Ticketmaster Tickets
Event ticketing pattern with section-based partitioning and denormalized aggregates for high-level stats.

**Learn**: UX-driven data modeling and hierarchical data partitioning

### 9. Time-Series IoT Data
Sensor data with time-based bucketing, clustering by timestamp, and TTL for automatic expiration.

**Learn**: Time-series patterns and high-volume write handling

### 10. E-Commerce Product Catalog
Multiple access patterns using denormalized tables vs Storage Attached Indexes (SAIs) for different query frequencies.

**Learn**: When to denormalize vs use SAIs, and performance tradeoffs

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js and npm
- Run `npm install` to install dependencies

### Start Cassandra

```bash
# Start Cassandra and Cassandra Web UI
docker-compose up -d cassandra cassandra-web

# Wait for Cassandra to be ready (takes ~30-60 seconds)
docker-compose logs -f cassandra

# Verify health
docker-compose exec cassandra cqlsh -e "describe cluster"
```

### Access Cassandra Web UI

Open http://localhost:8003 to:
- Browse keyspaces and tables
- Execute CQL queries
- View cluster status
- Inspect data

### Run Examples

```bash
# Run the CLI
npm start

# Select "Cassandra" from the technology menu
# Choose an example to run
```

### Run All Tests

```bash
# Test all Cassandra examples
npm run test:cassandra

# Test all technologies
npm test
```

### Reset Cassandra Data

```bash
# Drop all non-system keyspaces
npm run reset:cassandra
```

## Common Patterns

### Bucketing for Time-Series

Prevent unbounded partition growth by adding time buckets to partition key:

```cql
-- Bad: Unbounded growth
CREATE TABLE messages (
  channel_id bigint PRIMARY KEY,
  message_id bigint,
  content text
);

-- Good: Time-bucketed
CREATE TABLE messages (
  channel_id bigint,
  bucket int,  -- YYYY-MM or day number
  message_id bigint,
  content text,
  PRIMARY KEY ((channel_id, bucket), message_id)
);
```

**Bucket size**: Based on write volume (Discord uses 10-day buckets for messages)

### Denormalization for Multiple Access Patterns

Create separate tables for each query pattern:

```cql
-- Table 1: Query posts by author
CREATE TABLE posts_by_author (
  author_id uuid,
  post_id uuid,
  title text,
  content text,
  PRIMARY KEY (author_id, post_id)
);

-- Table 2: Query posts by date
CREATE TABLE posts_by_date (
  date text,
  post_id uuid,
  author_id uuid,
  title text,
  PRIMARY KEY (date, post_id)
);
```

**Application writes to both tables** (or use Materialized Views for automatic denormalization)

### Composite Partition Keys for Distribution

Distribute large datasets across multiple partitions:

```cql
-- Bad: All tickets in one partition
CREATE TABLE tickets (
  event_id bigint,
  seat_id bigint,
  price decimal,
  PRIMARY KEY (event_id, seat_id)
);

-- Good: Distributed by section
CREATE TABLE tickets (
  event_id bigint,
  section_id bigint,
  seat_id bigint,
  price decimal,
  PRIMARY KEY ((event_id, section_id), seat_id)
);
```

**Benefits**: Load distribution, smaller partitions, better performance

### TTL for Automatic Expiration

Set time-to-live for automatic data deletion:

```cql
CREATE TABLE sensor_data (
  sensor_id text,
  timestamp timestamp,
  temperature decimal,
  PRIMARY KEY (sensor_id, timestamp)
) WITH default_time_to_live = 2592000;  -- 30 days
```

**Benefits**: No manual cleanup, compaction removes expired data

## Interview Tips

### Primary Key Design is Critical

- **Always ask**: "What are the access patterns?"
- **Partition key**: Determines which node(s) store the data
- **Clustering keys**: Provide free sorting within partition
- **Wrong design**: Full table scans (ALLOW FILTERING) = very slow

### CAP Theorem Tradeoffs

- **Cassandra**: AP system (Availability + Partition Tolerance)
- **Tunable**: Can achieve strong consistency with QUORUM
- **Explain tradeoff**: Higher consistency = lower availability (more nodes must respond)

### When to Choose Cassandra

Mention in interviews:
- **High availability** more important than strong consistency
- **Write-heavy** workloads (IoT, logs, time-series, messaging)
- **Linear scalability** required (horizontal scaling)
- **Multi-datacenter** replication needed

When NOT to choose:
- **ACID transactions** required
- **Complex JOINs** or ad-hoc queries needed
- **Strong consistency** critical (use PostgreSQL or MySQL instead)

### Query-Driven Data Modeling

- **One table per query pattern** (not one table per entity)
- **Denormalization is expected** (disk is cheap, query time is expensive)
- **No JOINs**: Duplicate data instead
- **Application complexity**: Writes to multiple tables (tradeoff for read efficiency)

### Real-World Examples

Reference production use cases:
- **Discord**: Messages with bucketing (unbounded growth solution)
- **Netflix**: Viewing history and recommendations
- **Uber**: Trip data and real-time locations
- **Ticketmaster**: Event ticketing with section-based partitioning

## Production Considerations

### Partition Size Monitoring

- **Aim for**: <100MB per partition, <100k rows
- **Monitor**: `nodetool cfstats` or `nodetool tablestats`
- **Problem**: Large partitions = slow reads, increased compaction time
- **Solution**: Add bucketing to partition key or refactor schema

### Compaction Strategy Selection

- **Size-Tiered (STCS)**: Default, good for writes, okay for reads
- **Leveled (LCS)**: Better read performance, more I/O overhead
- **Time-Window (TWCS)**: Best for time-series with TTL

### Consistency Level Tuning

- **QUORUM + QUORUM**: Strong consistency, medium availability (most common)
- **LOCAL_QUORUM**: For multi-DC (don't cross DC for every request)
- **ONE**: Maximum availability, eventual consistency
- **ALL**: Rarely used (single node failure = downtime)

### Replication Factor Choice

- **RF=3**: Standard for production (tolerates 1 node failure with QUORUM)
- **RF=5**: For critical data (tolerates 2 node failures)
- **Multi-DC**: Separate RF per datacenter (e.g., RF=3 in DC1, RF=2 in DC2)

### Data Center Strategy

- **Production**: Always use **NetworkTopologyStrategy**
- **SimpleStrategy**: Testing only (not datacenter aware)
- **Rack awareness**: Place replicas on different racks (avoid single rack failure)

### Monitoring and Operations

- **Partition sizes**: Track with `nodetool tablestats`
- **Read latency**: Watch for increased latency (too many SSTables)
- **Write latency**: Usually stable (commit log + memtable)
- **Compaction pending**: Monitor pending compaction tasks
- **Tombstone warnings**: Too many tombstones degrade read performance

## Further Reading

### Official Documentation

- [Apache Cassandra Documentation](https://cassandra.apache.org/doc/latest/)
- [DataStax Cassandra Documentation](https://docs.datastax.com/en/cassandra-oss/3.x/)
- [CQL Reference](https://cassandra.apache.org/doc/latest/cassandra/cql/)

### Real-World Use Cases

- [Discord: How Discord Stores Billions of Messages](https://discord.com/blog/how-discord-stores-billions-of-messages)
- [Netflix: Benchmarking Cassandra Scalability on AWS](https://netflixtechblog.com/benchmarking-cassandra-scalability-on-aws-over-a-million-writes-per-second-39f45f066c9e)
- [Uber: How Uber Optimized Database Orchestration for Large-Scale Operations](https://eng.uber.com/cassandra/)

### Technical Deep Dives

- [The Log-Structured Merge-Tree (LSM-Tree)](https://dl.acm.org/doi/10.1007/s002360050048)
- [Cassandra: A Structured Storage System on a P2P Network](https://www.cs.cornell.edu/projects/ladis2009/papers/lakshman-ladis2009.pdf)
- [CAP Theorem: Revisited](https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/)

### Data Modeling Resources

- [Cassandra Data Modeling Best Practices](https://cassandra.apache.org/doc/latest/cassandra/data_modeling/intro.html)
- [DataStax Academy: Data Modeling Course](https://academy.datastax.com/)
- [Cassandra Anti-Patterns](https://blog.pythian.com/cassandra-anti-patterns/)

---

**Learning Path Recommendation**:
1. Start with examples 1-2 (basics and primary keys)
2. Learn partitioning and consistency (examples 3-4)
3. Understand internals (example 5)
4. Master data modeling (examples 6-10)
5. Practice explaining tradeoffs in mock interviews
