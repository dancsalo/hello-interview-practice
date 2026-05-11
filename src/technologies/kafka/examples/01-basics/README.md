# Kafka Basics: Topics, Producers & Consumers

## What

Demonstrates the fundamental Kafka concepts: topics, partitions, producers, consumers, messages, and offsets.

## Why

Understanding these building blocks is essential because all Kafka patterns are built on top of them. These concepts form the foundation for discussing Kafka in system design interviews.

## How

The example shows an e-commerce order creation scenario:
- **Topics**: Logical grouping of related messages (orders)
- **Partitions**: Physical distribution for parallelism (3 partitions)
- **Producers**: Send order events with customer ID as key
- **Consumers**: Read order events from beginning
- **Messages**: Contain key, value, headers, timestamp
- **Offsets**: Track position in partition

## Key Commands

- `admin.createTopics()` - Create topic with partitions
- `producer.send()` - Produce messages with keys
- `consumer.subscribe()` - Subscribe to topic
- `consumer.run()` - Consume messages

## Try It

Run the example and observe:
1. How keys affect partition assignment (same customer → same partition)
2. Messages include offset, partition, key, value, headers
3. Consumer reads from beginning using offsets

Check Kafka UI (http://localhost:8002) to visualize topics, partitions, and messages.

## Production Considerations

**Topics**:
- Logical grouping for organization
- Cannot change partition count down (only up)
- Plan partition count based on expected parallelism

**Partitions**:
- Enable horizontal scaling (more partitions = more parallelism)
- Max consumers in group = number of partitions
- Each partition is ordered sequence

**Messages**:
- Keep under 1MB (default max is configurable)
- Keys determine partition (use keys for ordering requirements)
- Headers for metadata (event type, trace IDs, etc.)

**Offsets**:
- Consumer tracks position in each partition
- Committed offset enables resume after failure
- At-least-once delivery by default (message may be reprocessed)

**Producers**:
- Idempotent producer prevents duplicates on retry
- Batching improves throughput
- Acks setting controls durability (acks=all for strongest guarantee)

**Consumers**:
- Consumer group enables parallel consumption
- Each partition assigned to one consumer in group
- Rebalancing occurs when consumers join/leave

## Further Reading

- [Kafka Topics](https://kafka.apache.org/documentation/#intro_topics)
- [Producers](https://kafka.apache.org/documentation/#theproducer)
- [Consumers](https://kafka.apache.org/documentation/#theconsumer)
