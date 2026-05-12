# Discord Messages

## What This Demonstrates

- Real-world messaging pattern from Discord engineering blog
- Original schema problem: unbounded partition growth
- Bucketing solution: 10-day time buckets
- Snowflake IDs for message_id (chronologically sortable)
- Composite partition key: `(channel_id, bucket)`
- Partition size management and bounds

## Why This Matters

Discord's message storage is one of the most-cited real-world Cassandra case studies. It demonstrates the critical concept of bucketing to prevent unbounded partition growth - a pattern applicable to any time-series or append-only data. Understanding this pattern is essential for system design interviews involving chat systems, feeds, or event logs.

## How It Works

### The Problem

With `PRIMARY KEY (channel_id, message_id)`:
- All messages for a channel live in ONE partition
- Busy channels grow indefinitely
- After years: partition exceeds 100 MB limit
- Performance degrades as partition grows

### The Solution: Time-Based Bucketing

With `PRIMARY KEY ((channel_id, bucket), message_id)`:
- Each partition holds 10 days of messages for one channel
- Partition size is bounded regardless of channel age
- New bucket created automatically as time passes

### Snowflake IDs

Discord uses Snowflake IDs (64-bit integers) instead of UUIDs:

```
[41 bits: ms since DISCORD_EPOCH] [5: worker] [5: process] [12: sequence]
```

Benefits:
- **Chronologically sortable**: Higher ID = newer message
- **Distributed-unique**: No coordination needed between nodes
- **Timestamp extractable**: Can derive bucket from message_id alone
- **Compact**: 64-bit integer vs 128-bit UUID

### Bucket Calculation

```typescript
const DISCORD_EPOCH = 1420070400000; // Jan 1, 2015

function getBucket(messageId: bigint): number {
  const timestamp = Number(messageId >> 22n) + DISCORD_EPOCH;
  const daysSinceEpoch = Math.floor((timestamp - DISCORD_EPOCH) / (1000 * 60 * 60 * 24));
  return Math.floor(daysSinceEpoch / 10); // 10-day buckets
}
```

## Key Concepts

### Partition Size Comparison

| Schema | Partition Key | Size (1 year, busy channel) | Bounded |
|--------|--------------|---------------------------|---------|
| messages_v1 | (channel_id) | 365K msgs, ~180 MB | No |
| messages | (channel_id, bucket) | 10K msgs, ~5 MB | Yes |

### Query Patterns

**Most common (90%+): "Show last 50 messages"**
- Query current bucket only
- Single partition read = fast

**Less common: "Scroll back in history"**
- Query current bucket, if insufficient, query previous bucket
- Application merges results from 2 partitions
- Still fast (2 partition reads)

**Rare: "Search old messages"**
- May span many buckets
- Consider external search index (Elasticsearch) for this use case

### Bucket Size Tradeoffs

| Bucket Size | Partition Size | Partitions to Query | Best For |
|------------|---------------|-------------------|----------|
| 1 day | Very small | Many for history | Extremely busy channels |
| 10 days | Medium (Discord's choice) | Few for history | Most channels |
| 30 days | Large | Fewer for history | Quiet channels |

## Production Considerations

- **Bucket size selection**: Based on busiest channel's write rate
- **Boundary queries**: Application logic to query across bucket boundaries
- **Quiet channels**: Small partitions are fine (no wasted space)
- **Hot channels**: If exceeding limit, consider smaller buckets or sub-sharding
- **Message deletion**: Creates tombstone in specific bucket's partition
- **Old data**: Old buckets rarely accessed, can be on slower storage

## Interview Tips

### Common Questions

**Q: "How would you design a chat message storage system?"**
A: Partition by (channel_id, time_bucket) with Snowflake message IDs as clustering key. Bucketing prevents unbounded growth. Most queries hit current bucket only. This is Discord's actual approach.

**Q: "Why not just use channel_id as partition key?"**
A: Unbounded growth. A busy channel with years of history creates a massive partition (100s of MB). This exceeds Cassandra's optimal partition size, causing performance degradation and hot spots.

**Q: "How do you handle pagination across bucket boundaries?"**
A: Application logic: query current bucket first. If fewer results than needed, query previous bucket. Merge and return. 90%+ of queries are satisfied by current bucket alone.

**Q: "What are Snowflake IDs and why use them?"**
A: 64-bit IDs encoding timestamp + worker + sequence. Chronologically sortable (no separate timestamp column), distributed-unique (no coordination), and compact. Can extract timestamp for bucket calculation.

### Key Takeaways

1. Bucketing prevents unbounded partition growth
2. Composite partition key: (entity_id, time_bucket)
3. Bucket size based on write volume (target <100 MB per partition)
4. 90%+ of queries hit current bucket only
5. Snowflake IDs enable sorted, distributed-unique identifiers
6. Real-world proven pattern (Discord serves billions of messages)

## Further Reading

- [How Discord Stores Billions of Messages](https://discord.com/blog/how-discord-stores-billions-of-messages)
- [Snowflake ID Format](https://en.wikipedia.org/wiki/Snowflake_ID)
- [Partition Size Best Practices](https://docs.datastax.com/en/dse/6.8/cql/cql/cql_using/whereClustering.html)
