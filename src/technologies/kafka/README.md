# Kafka Technology Guide

Interactive examples for mastering Kafka patterns in system design interviews.

## What is Kafka?

Apache Kafka is an open-source distributed event streaming platform designed for high-throughput, fault-tolerant, real-time data pipelines. It can be used as both a message queue and a stream processing system.

### Key Characteristics

- **Distributed**: Scales horizontally across multiple brokers
- **Durable**: Messages persisted to disk with replication
- **High Throughput**: Millions of messages per second
- **Low Latency**: Sub-millisecond message delivery
- **Fault Tolerant**: Automatic failover and replication

### Why Kafka for Interviews?

Kafka demonstrates your understanding of:
- Event-driven architecture and microservices
- Distributed systems and scalability
- Message ordering and delivery guarantees
- Real-time data processing
- Decoupling producers and consumers

It's used by 80% of Fortune 100 companies and appears frequently in system design interviews.

## 10 Kafka Examples

### Phase 1: Infrastructure + Initial Examples (Available Now)

#### 1. Basics: Topics, Producers & Consumers
**What you'll learn**: Core Kafka concepts

- Creating topics with partitions
- Producing messages with keys and values
- Consuming messages and tracking offsets
- Message structure (key, value, headers, timestamp)

**Key concepts**: Topics, partitions, messages, offsets

**Interview relevance**: Foundation for all Kafka discussions. Understanding these basics is required before discussing advanced patterns.

**Example path**: `examples/01-basics/`

---

#### 2. Partitioning Strategies
**What you'll learn**: How key selection affects distribution and ordering

- Key-based partition assignment
- Hash partitioning algorithm (partition = hash(key) % numPartitions)
- Same-key ordering guarantees
- Impact of key choice on parallelism

**Key concepts**: Partition keys, ordering vs throughput trade-offs, hot partitions

**Interview relevance**: Choosing partition keys is the most important architectural decision in Kafka. Interviewers love asking about hot partition handling.

**Example path**: `examples/02-partitioning/`

---

### Phase 2: Core Patterns (Coming Soon)

#### 3. Consumer Groups
#### 4. Message Ordering Guarantees
#### 5. Pub/Sub Messaging
#### 6. Event Streaming

### Phase 3: Production Patterns (Coming Soon)

#### 7. Idempotency & Retries
#### 8. Hot Partition Handling
#### 9. Change Data Capture (CDC)
#### 10. Event Sourcing with Kafka

## Key Concepts Across Examples

### Architecture

**Brokers**: Servers that store and serve data
**Topics**: Logical grouping of messages
**Partitions**: Physical distribution mechanism
**Producers**: Send messages to topics
**Consumers**: Read messages from topics
**Consumer Groups**: Enable parallel consumption

### Message Structure

```typescript
{
  key: string | Buffer,        // Determines partition
  value: string | Buffer,      // Payload
  timestamp: number,           // Message time
  headers: Record<string, any> // Metadata
}
```

### Ordering Guarantees

- ✅ **Within partition**: Strictly ordered by offset
- ❌ **Across partitions**: No ordering guarantee
- 🔑 **Key insight**: Same key → same partition → ordering

### Delivery Guarantees

- **At-most-once**: Messages may be lost (not reprocessed)
- **At-least-once**: Messages may be duplicated (default)
- **Exactly-once**: Messages processed exactly once (requires configuration)

### Partitioning Algorithm

```
partition = hash(key) % numPartitions
```

Same key always goes to same partition, enabling:
- Ordering guarantees for related messages
- Stateful processing per key
- Parallel processing across keys

## Getting Started

### Running Examples

```bash
# Start Kafka services
docker-compose up -d

# Verify services are healthy
docker-compose ps

# Launch CLI
npm start

# Select Kafka, then choose an example
```

### Visualizing Data

Kafka UI provides a GUI for exploring Kafka:

```bash
# Open in browser
open http://localhost:8002

# You can see:
# - Topics and partitions
# - Messages with keys, values, headers
# - Consumer groups and lag
# - Broker information
```

### Resetting Data

```bash
# Reset all Kafka topics
npm run reset:kafka

# Or use CLI option after running an example
```

## Production Considerations

Each example README includes production considerations:
- Scaling strategies (partitions, consumers, brokers)
- Fault tolerance and replication
- Performance optimization
- Monitoring and observability
- When NOT to use the pattern

These are crucial for interviews where you need to discuss trade-offs.

## Interview Tips

### Do:

- Discuss partition key selection strategy
- Explain ordering guarantees (within partition only)
- Consider hot partition problem
- Know when to use Kafka vs alternatives
- Mention replication factor for durability
- Discuss consumer lag monitoring

### Don't:

- Assume Kafka solves everything
- Ignore ordering limitations
- Forget about message size limits
- Overlook at-least-once default semantics
- Use Kafka for small-scale systems (overhead)

### Common Questions

**Q: When would you use Kafka instead of Redis pub/sub?**  
A: Kafka when you need durability (messages persisted to disk), replay capability, exactly-once processing, or handling millions of messages/sec. Redis pub/sub for ephemeral messages, lower latency, simpler setup.

**Q: How do you handle hot partitions?**  
A: Several approaches: (1) Salt the key with random suffix to distribute load (loses ordering), (2) Use compound key (e.g., product_id + user_id) to maintain some ordering, (3) Over-partition initially, (4) Accept it if temporary (flash sale).

**Q: What are Kafka's delivery guarantees?**  
A: Default is at-least-once (messages may be reprocessed). Can configure exactly-once with idempotent producer + transactions, but adds complexity. At-most-once also possible but risks message loss.

**Q: How does consumer group work?**  
A: Partitions are distributed among consumers in a group. Each partition assigned to exactly one consumer. When consumers join/leave, rebalancing occurs. Enables parallel consumption while ensuring each message processed by one consumer.

**Q: When should you NOT use Kafka?**  
A: Small scale (Kafka has operational overhead), need for request-response pattern (Kafka is async), complex routing logic (use message broker like RabbitMQ), temporary messages (use Redis pub/sub).

## Kafka vs Alternatives

### Kafka vs Redis Streams

| Feature | Kafka | Redis Streams |
|---------|-------|---------------|
| Scale | Millions msg/sec | Hundreds of thousands |
| Durability | Disk-based, replicated | In-memory, optional persistence |
| Retention | Days/weeks/infinite | Hours/days typically |
| Complexity | Higher (ZK, brokers) | Lower (single Redis instance) |
| Use case | Enterprise event streaming | Moderate-scale streams |

### Kafka vs RabbitMQ

| Feature | Kafka | RabbitMQ |
|---------|-------|----------|
| Model | Log-based append | Queue-based |
| Routing | Simple (topic-based) | Complex (exchanges, bindings) |
| Ordering | Per-partition | Per-queue |
| Replay | Yes (offset-based) | No (consumed = deleted) |
| Use case | Event streaming, replay | Task queues, routing |

### Kafka vs AWS SQS/SNS

| Feature | Kafka | SQS/SNS |
|---------|-------|---------|
| Managed | Self-hosted (or MSK) | Fully managed |
| Ordering | Per-partition | Per-group (SQS FIFO) |
| Replay | Yes | No |
| Operations | More complex | Zero ops |
| Use case | On-prem, fine control | AWS-native, simplicity |

## Common Use Cases Summary

| Use Case | Kafka Feature | Example |
|----------|---------------|---------|
| Event sourcing | Infinite retention | Order lifecycle events |
| Log aggregation | High throughput | Application logs |
| Stream processing | Real-time consumers | Click analytics |
| CDC | Log compaction | Database changes |
| Microservices messaging | Decoupling | Order → Payment → Fulfillment |
| Activity tracking | Fan-out to multiple consumers | User actions |
| Metrics collection | Time-series friendly | System metrics |

## Further Reading

### Official Documentation

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Kafka Introduction](https://kafka.apache.org/intro)
- [kafkajs Client](https://kafka.js.org/)

### Deep Dives

- **Original guide**: `../../../key_technologies/kafka/original.md` - Comprehensive Kafka concepts
- [Kafka Design](https://kafka.apache.org/documentation/#design)
- [Kafka Architecture](https://kafka.apache.org/documentation/#implementation)

### Architecture

- [Replication](https://kafka.apache.org/documentation/#replication)
- [Kafka Controller](https://kafka.apache.org/documentation/#design_replicatedlog)
- [Consumer Groups](https://kafka.apache.org/documentation/#intro_consumers)

### Alternatives & Comparisons

- When to use RabbitMQ (complex routing, task queues)
- When to use Redis Streams (smaller scale, lower complexity)
- When to use AWS SQS/SNS (fully managed, AWS-native)
- When to use PostgreSQL (ACID, relational data, simple queues)

## What's Next?

After mastering Phase 1 examples:

1. **Experiment**: Modify examples to test edge cases
2. **Visualize**: Use Kafka UI to see partitions and messages
3. **Practice**: Explain patterns out loud for interview prep
4. **Wait for Phase 2**: Consumer groups, ordering, pub/sub patterns
5. **Compare**: Think about when Kafka vs Redis/RabbitMQ/SQS

---

**Ready to dive in?** Run `npm start` and select Kafka to explore these patterns hands-on.

For detailed Kafka concepts and design, refer to the comprehensive guide: `../../../key_technologies/kafka/original.md`
