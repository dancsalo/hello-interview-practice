# Redis Technology Guide

Interactive examples for mastering Redis patterns in system design interviews.

## What is Redis?

Redis is a high-performance, in-memory data structure store that's incredibly versatile. It's called a "data structure server" because it natively supports rich data types like sorted sets, streams, and geospatial indexes - not just simple key-value pairs.

### Key Characteristics

- **In-Memory**: All data stored in RAM for microsecond latency
- **Single-Threaded**: Simple mental model, easy to reason about
- **Persistent**: Optional durability with AOF (Append-Only File)
- **Fast**: 100k+ writes/sec, microsecond read latency
- **Versatile**: One tool for many use cases

### Why Redis for Interviews?

Redis is arguably the most versatile technology in system design. Instead of learning dozens of specialized tools, you can learn Redis deeply and apply it to:

- Caching
- Distributed coordination
- Real-time leaderboards
- Rate limiting
- Pub/sub messaging
- Proximity search
- Event streaming
- Time series data
- Session storage
- And much more...

This depth is valuable in interviews because you can discuss tradeoffs and edge cases confidently.

## 10 Redis Examples

### 1. Basics: Core Data Structures

**What you'll learn**: The five fundamental Redis data types

- Strings: Simple values and counters
- Hashes: Objects with fields
- Lists: Ordered sequences
- Sets: Unique collections
- Sorted Sets: Ranked data

**Key concepts**: 
- Time complexity (O(1) vs O(N))
- Atomic operations
- Memory efficiency

**Interview relevance**: Understanding these building blocks is essential since all Redis patterns are built on top of them.

**Example path**: `examples/01-basics/`

---

### 2. Cache: Write Strategies

**What you'll learn**: Using Redis as a distributed cache

- Write-through: Update cache and DB together
- Write-behind: Async DB updates
- Cache-aside: Read-through pattern
- TTL management

**Key concepts**:
- Cache eviction policies
- Consistency vs performance tradeoffs
- Hot key problem

**Interview relevance**: Caching is the most common Redis use case. You'll need to explain when to invalidate, how to handle consistency, and cache eviction strategies.

**Example path**: `examples/02-cache/`

---

### 3. Distributed Lock: Coordination

**What you'll learn**: Coordinating access across multiple servers

- Simple INCR-based lock
- TTL for safety
- Retry with exponential backoff
- When NOT to use locks

**Key concepts**:
- Redlock algorithm
- Fencing tokens
- Failure modes (clock drift, network partition)

**Interview relevance**: Common in "Design Ticketmaster" or "Design Uber" questions where you need to prevent double-booking or ensure only one worker processes a task.

**Example path**: `examples/03-distributed-lock/`

---

### 4. Leaderboards: Sorted Sets

**What you'll learn**: Maintaining ranked data at scale

- Adding scores
- Range queries (top N, rank of user)
- Updating scores efficiently
- Removing low-ranked entries

**Key concepts**:
- Log-time operations
- Score ties and lexicographic ordering
- Memory management with pruning

**Interview relevance**: Appears in gaming leaderboards, trending posts, top products, search ranking - any scenario needing efficient ranking.

**Example path**: `examples/04-leaderboards/`

---

### 5. Rate Limiting: Throttling

**What you'll learn**: Controlling request rates per user/IP/key

- Fixed window counter
- Sliding window log
- Multi-tier limits
- Atomic Lua scripts

**Key concepts**:
- Burst problem at window boundaries
- Memory vs accuracy tradeoffs
- Token bucket algorithm
- Race conditions

**Interview relevance**: Every API needs rate limiting. You'll discuss different algorithms, their tradeoffs, and how to handle distributed challenges.

**Example path**: `examples/05-rate-limiting/`

---

### 6. Proximity Search: Geospatial

**What you'll learn**: Location-based queries

- Adding locations to index
- Radius search
- Bounding box queries
- Understanding geohashes

**Key concepts**:
- O(N+log(M)) complexity
- Grid-based indexing
- Filtering candidates

**Interview relevance**: "Design Yelp", "Design Uber", "Find nearby friends" - common location-based questions.

**Example path**: `examples/06-proximity-search/`

---

### 7. Event Sourcing: Streams

**What you'll learn**: Using Redis Streams for event logs

- Appending events
- Consumer groups
- Claiming messages on failure
- Processing guarantees

**Key concepts**:
- At-least-once delivery
- Pending entries list
- Difference from Pub/Sub
- When to use Kafka instead

**Interview relevance**: Demonstrates understanding of event-driven architecture, message processing, and when Redis is sufficient vs needing Kafka.

**Example path**: `examples/07-event-sourcing/`

---

### 8. Pub/Sub: Real-Time Messaging

**What you'll learn**: Broadcasting messages to subscribers

- Publishing to channels
- Subscribing to topics
- Sharded pub/sub for scalability
- At-most-once delivery

**Key concepts**:
- Messages not persisted
- Connection-based subscriptions
- When to use Streams instead
- Scaling considerations

**Interview relevance**: "Design a chat system", "Real-time notifications", "Live updates" - understanding pub/sub is essential for real-time systems.

**Example path**: `examples/08-pubsub/`

---

### 9. Bloom Filters: Probabilistic Sets

**What you'll learn**: Space-efficient set membership testing

- Adding elements
- Checking membership
- False positive rate
- No false negatives

**Key concepts**:
- Probabilistic data structures
- Space vs accuracy tradeoff
- Use cases (spam detection, cache filtering)

**Interview relevance**: Shows advanced knowledge. Useful for "Design a web crawler" (avoid revisiting URLs) or "Design a spam filter".

**Example path**: `examples/09-bloom-filters/`

---

### 10. Time Series: Temporal Data

**What you'll learn**: Recording and querying time-based data

- Adding timestamped values
- Range queries
- Aggregations
- Retention policies

**Key concepts**:
- Downsampling
- Compaction
- When to use specialized TSDB

**Interview relevance**: "Design a metrics system", "Design a monitoring dashboard" - understanding time series is valuable for observability questions.

**Example path**: `examples/10-time-series/`

---

## Key Concepts Across Examples

### Performance

- Redis is **really fast**: 100k+ writes/sec, microsecond reads
- Single-threaded means **predictable performance**
- In-memory means **not suitable for all data** (limited by RAM)
- Anti-patterns in other DBs can be OK in Redis (e.g., many small requests)

### Scalability

Redis clusters are **surprisingly basic**:
- Clients cache hash slot mappings
- Data must be on single node (with few exceptions)
- **Key design is how you scale** Redis
- Gossip protocol for node awareness

### Infrastructure

Three deployment modes:
1. **Single node**: Simple, no HA
2. **Primary + Replica**: High availability
3. **Cluster**: Horizontal scaling with sharding

### Durability

Redis is **not ACID-compliant** by default:
- In-memory = data loss risk
- AOF provides reasonable durability
- AWS MemoryDB offers disk-backed durability
- **Tradeoff**: Speed vs durability

### Common Patterns

- **TTL**: Set expiration on keys for automatic cleanup
- **Atomic operations**: INCR, HINCRBY, ZADD are inherently atomic
- **Lua scripts**: Run multiple commands atomically
- **Pipelining**: Batch commands to reduce round trips

### Common Pitfalls

- **Hot key problem**: Uneven load distribution
- **Memory limits**: Can't cache everything
- **Network latency**: Even microsecond ops add up over network
- **Consistency**: No multi-key transactions across cluster

## Getting Started

### Running Examples

```bash
# Start Redis service
docker-compose up -d

# Launch CLI
npm start

# Select Redis, then choose an example
```

### Visualizing Data

RedisInsight provides a GUI for exploring data:

```bash
# Open in browser
open http://localhost:8001

# Connect to: localhost:6379
```

You can see data structures, run commands, and monitor performance.

### Resetting Data

```bash
# Reset all Redis data
npm run reset:redis

# Or use CLI option after running an example
```

## Production Considerations

Each example README includes a "Production Considerations" section discussing:
- Scaling challenges
- Failure modes
- Alternative approaches
- When NOT to use the pattern
- Monitoring and observability

These are crucial for interviews where you need to discuss tradeoffs.

## Interview Tips

### Do:
- Explain your key naming strategy (affects sharding)
- Discuss TTL for memory management
- Mention hot key problem when relevant
- Consider failure modes (what if Redis is down?)
- Know when to use alternatives (PostgreSQL, Kafka, etc.)

### Don't:
- Assume Redis solves everything
- Ignore durability requirements
- Forget about memory limits
- Overlook consistency needs
- Use distributed locks unnecessarily

### Common Questions:

**Q: Why Redis instead of Memcached?**  
A: Redis has richer data structures (sorted sets, streams, etc.) while Memcached is just key-value. Redis also supports persistence and pub/sub.

**Q: How do you handle hot keys?**  
A: Client-side caching, replicating data across multiple keys, read replicas, or accepting overprovisioning.

**Q: Is Redis durable?**  
A: By default, no. AOF provides reasonable durability with some data loss risk. For critical data, use a database and Redis as a cache.

**Q: When would you use Streams vs Pub/Sub?**  
A: Streams for durable messages, at-least-once delivery, consumer groups, and replay. Pub/Sub for ephemeral, at-most-once, real-time messaging.

**Q: How does Redis cluster work?**  
A: 16,384 hash slots distributed across nodes. Clients cache slot→node mappings. Keys hash to slots. Data must be on one node (design keys accordingly).

## Further Reading

### Official Documentation
- [Redis Documentation](https://redis.io/docs)
- [Redis Commands](https://redis.io/commands)
- [Redis Data Types](https://redis.io/docs/data-types/)

### Deep Dives
- **Original guide**: `../../../key_technologies/redis/original.md` - Comprehensive overview of Redis concepts
- [Redis Patterns](https://redis.io/docs/manual/patterns/) - Official pattern documentation
- [Redis University](https://university.redis.com) - Free courses

### Architecture
- [Redis Cluster Specification](https://redis.io/docs/reference/cluster-spec/)
- [Redlock Algorithm](https://redis.io/docs/manual/patterns/distributed-locks/)
- [Redis Persistence](https://redis.io/docs/management/persistence/)

### Alternatives & Comparisons
- When to use PostgreSQL instead (ACID, complex queries, relational data)
- When to use Kafka instead (event streaming, replay, strong ordering)
- When to use Memcached instead (pure cache, no data structures needed)
- When to use DynamoDB instead (AWS-native, no ops, global tables)

## What's Next?

After mastering these Redis examples:

1. **Experiment**: Modify examples to test edge cases
2. **Visualize**: Use RedisInsight to see data structures
3. **Practice**: Explain patterns out loud for interview prep
4. **Combine**: Think about how patterns work together
5. **Compare**: Try PostgreSQL examples when available

## Common Use Cases Summary

| Use Case | Redis Feature | Example |
|----------|---------------|---------|
| Session store | String/Hash + TTL | User sessions |
| Leaderboard | Sorted Set | Gaming ranks |
| Cache | String/Hash + TTL | Product catalog |
| Rate limiting | String + TTL | API throttling |
| Real-time chat | Pub/Sub | Messaging app |
| Location search | Geospatial | Find nearby |
| Event log | Streams | Audit trail |
| Coordination | Distributed Lock | Prevent double-booking |
| Deduplication | Bloom Filter | Spam detection |
| Metrics | Time Series | Monitoring |

---

**Ready to dive in?** Run `npm start` and select Redis to explore these patterns hands-on.

For questions about Redis concepts and design, refer to the comprehensive guide: `../../../key_technologies/redis/original.md`
