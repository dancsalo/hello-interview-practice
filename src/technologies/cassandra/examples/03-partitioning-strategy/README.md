# Partitioning Strategy

## What This Demonstrates

- BAD: Low cardinality partition key (hot partition problem)
- GOOD: High cardinality partition key (even distribution)
- BETTER: Bucketing pattern for unbounded growth scenarios
- Consistent hashing and token ring concept
- Virtual nodes (vnodes) for rebalancing
- Partition size calculations and guidelines
- Common bucketing patterns (time, hash, counter-based)

## Why This Matters

Partition key cardinality is the #1 factor determining Cassandra cluster performance. A poor choice creates hot partitions where a single node handles all traffic while others sit idle. In interviews, demonstrating understanding of partition distribution separates senior candidates from juniors.

## How It Works

### Consistent Hashing

Cassandra uses consistent hashing to distribute data:

1. **Hash partition key** → 64-bit token (-2^63 to 2^63-1)
2. **Token ring** divided among nodes (e.g., 3 nodes = 3 ranges)
3. **Virtual nodes** (vnodes): Each physical node owns 256 token ranges by default
4. **Data placement**: Row stored on node(s) owning that token range

### Partition Key Cardinality

**Low cardinality** (few unique values):
- Example: `app_name` with value always "myapp"
- Result: ALL data hashes to same token → same node
- Problem: Hot partition, wasted cluster capacity

**High cardinality** (many unique values):
- Example: `user_id` with millions of users
- Result: Millions of tokens evenly distributed
- Benefit: Load spreads across all nodes

### Bucketing for Unbounded Growth

Even with high cardinality, a single partition can grow unbounded:
- User generates events forever → infinite rows in partition
- Sensor generates readings forever → partition size increases daily

**Solution**: Add bucketing to partition key:
- Time-based: `PRIMARY KEY ((sensor_id, date), timestamp)`
- Counter-based: `PRIMARY KEY ((channel_id, message_bucket), message_id)`

This caps partition size while maintaining query efficiency.

## Key Concepts

### Token Ring

The token ring is divided into ranges:
```
Node A: -9223372036854775808 to -3074457345618258603
Node B: -3074457345618258602 to  3074457345618258602
Node C:  3074457345618258603 to  9223372036854775807
```

Low cardinality example:
- `hash("myapp")` → token -5000000000000000000
- Always falls in Node A's range → hot partition

High cardinality example:
- `hash(user_1)` → token -8000000000000000000 (Node A)
- `hash(user_2)` → token -2000000000000000000 (Node B)
- `hash(user_3)` → token  5000000000000000000 (Node C)
- Evenly distributed across all nodes

### Virtual Nodes (vnodes)

Instead of each physical node owning one contiguous range, it owns many small ranges (default: 256). Benefits:

- **Better distribution**: New node splits load from multiple nodes, not just neighbors
- **Faster rebalancing**: Smaller ranges stream in parallel
- **Resilience**: Node failure spreads load across more nodes

### Partition Size Guidelines

**Best practices**:
- Target: <100 MB per partition
- Max theoretical: ~2 billion cells (rows × columns)
- Warning threshold: >100,000 rows per partition

**Calculation example** (sensor readings):
- 1 reading/second, 100 bytes each
- Daily: 86,400 readings × 100 bytes = 8.4 MB (good)
- Without bucketing: 3 GB/year (bad, unbounded growth)
- With daily bucketing: 8.4 MB max per partition (good, bounded)

## Common Bucketing Patterns

### 1. Time-Based Bucketing

```cql
PRIMARY KEY ((sensor_id, bucket_date), reading_time)
```

**Use when**: Continuous data generation (logs, metrics, time-series)

**Bucket granularity**:
- High write rate (1000/sec): Bucket by hour
- Medium write rate (10/sec): Bucket by day
- Low write rate (1/min): Bucket by month

**Benefits**:
- Predictable partition size
- Easy to drop old data (DELETE partition or TTL)
- Efficient range queries ("last 7 days" = 7 partitions)

### 2. Counter-Based Bucketing

```cql
PRIMARY KEY ((channel_id, message_bucket), message_id)
```

**Use when**: Sequential IDs with unbounded growth (chat messages, orders)

**Formula**: `bucket = message_id / 10000` (10k messages per partition)

**Benefits**:
- Fixed partition size (10k rows)
- Recent messages in same partition (hot partition is small)
- Old partitions rarely accessed (cold data)

**Example (Discord)**:
- Channel with 10M messages
- Without bucketing: 1 partition with 10M rows (BAD)
- With bucketing: 1000 partitions with 10k rows each (GOOD)
- Query "last 50 messages": Read from 1 partition (fast)

### 3. Hash-Based Bucketing

```cql
PRIMARY KEY ((user_id, hash_bucket), event_time)
```

**Use when**: Need to shard a single entity across partitions

**Formula**: `hash_bucket = hash(user_id) % 10` (10 buckets)

**Benefits**:
- Splits large user's data across 10 partitions
- Reduces hot partition for power users
- Trades off: Must query all 10 buckets to get user's full data

## Production Considerations

### Monitoring Partition Size

Use `nodetool cfstats` to monitor:
```bash
nodetool cfstats keyspace.table
```

Look for:
- **Maximum partition size**: Should be <100 MB
- **Average partition size**: Should be <10 MB
- **SSTable count**: High count suggests write amplification

### Hot Partition Detection

Signs of hot partitions:
- One node has high CPU/disk while others are idle
- Latency spikes on specific queries
- `nodetool tablehistograms` shows outlier partition sizes

### Fixing Hot Partitions

If discovered in production:
1. **Add bucketing**: Requires schema change and data migration
2. **Increase RF**: Spreads reads across more replicas (doesn't help writes)
3. **Scale up**: Increase node capacity (temporary fix, doesn't address root cause)

Best approach: Design with bucketing from the start.

### Choosing Bucket Granularity

Too fine (hourly when daily suffices):
- More partitions to query for range scans
- Increased metadata overhead

Too coarse (monthly when daily needed):
- Partitions still too large
- Doesn't solve unbounded growth

**Rule of thumb**: Aim for 1k-100k rows per partition, or 1-100 MB.

## Interview Tips

### Common Questions

**Q: "How does Cassandra distribute data across nodes?"**
A: Consistent hashing. Partition key is hashed to a token, which maps to a node on the token ring. Virtual nodes (256 per physical node) ensure even distribution.

**Q: "What's wrong with using a constant value as partition key?"**
A: Low cardinality means all data hashes to the same token, creating a hot partition on one node while others sit idle. This wastes cluster capacity and creates a bottleneck.

**Q: "When do you need bucketing?"**
A: When a single partition key value can generate unbounded rows over time. Examples: user events (user generates events forever), sensor readings (sensor runs indefinitely), chat messages (channels accumulate messages).

**Q: "How do you choose bucket granularity?"**
A: Calculate expected partition size. Aim for <100 MB or <100k rows. If sensor generates 1 reading/second (100 bytes), daily bucketing yields 8.4 MB/day (good). If it generated 100 readings/second, you'd need hourly bucketing.

### Key Takeaways for Interviews

1. **Cardinality matters**: High cardinality partition keys (user_id, order_id) distribute load evenly
2. **Unbounded growth needs bucketing**: Add date/counter to partition key
3. **Know the math**: Be able to calculate partition size given write rate and row size
4. **Trade-offs**: Bucketing means querying multiple partitions for ranges
5. **Real-world example**: Discord uses `(channel_id, bucket)` where bucket = message_id / 10000

### Red Flags in Partition Design

- Using low cardinality column (status, category, country) as partition key
- No bucketing for time-series or event data
- Not considering write rate and row size in design phase
- Relying on secondary indexes instead of fixing partition key

## Further Reading

- [Data Modeling](https://cassandra.apache.org/doc/latest/data_modeling/)
- [Consistent Hashing](https://en.wikipedia.org/wiki/Consistent_hashing)
- [Virtual Nodes](https://cassandra.apache.org/doc/latest/architecture/vnodes.html)
- [Partition Size](https://docs.datastax.com/en/dse/6.8/cql/cql/cql_using/whereClustering.html)
