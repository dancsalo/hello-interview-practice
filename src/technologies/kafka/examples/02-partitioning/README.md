# Kafka Partitioning Strategies

## What

Demonstrates how different message keys affect partition assignment and message distribution across Kafka partitions.

## Why

Partitioning is one of the most important decisions in Kafka system design. The choice of partition key determines:
- **Ordering guarantees** (messages with same key are always in same partition)
- **Load distribution** (how evenly work spreads across consumers)
- **Scalability** (hot partitions limit throughput)

This is a common interview topic: "How would you ensure ordering for a specific entity while maintaining parallelism?"

## How

The example creates 3 topics with 4 partitions each, then sends the same 8 orders using different keying strategies:

### Strategy 1: Key by Customer ID
- Same customer always lands in same partition
- Guarantees per-customer ordering
- Risk: popular customers create hot partitions

### Strategy 2: Key by Order ID
- Each order distributed independently
- Better load distribution
- No per-customer ordering guarantee

### Strategy 3: No Key (Round-Robin)
- Messages distributed evenly across all partitions
- Best throughput and distribution
- No ordering guarantees at all

## Key Commands

- `producer.send({ key: customerId })` - Partition by customer
- `producer.send({ key: orderId })` - Partition by order
- `producer.send({ key: null })` - Round-robin
- `admin.fetchTopicOffsets(topic)` - Check partition distribution

## Try It

Run the example and observe:
1. How customer-keyed messages cluster in fewer partitions
2. How order-keyed messages spread more evenly
3. How no-key messages distribute round-robin
4. The visual partition distribution at the end

Check Kafka UI (http://localhost:8002) to see message placement in each partition.

## Production Considerations

**Choosing a Partition Key**:
- Use entity ID that needs ordering (customer ID, account ID, session ID)
- Avoid keys with extreme cardinality skew (one key getting 90% of traffic)
- Consider composite keys (e.g., `region:customerId`) for better distribution

**Hot Partitions**:
- Monitor partition lag across consumers
- If one partition has significantly more messages, consider:
  - Adding a random suffix to spread hot keys
  - Using a custom partitioner
  - Redesigning the key strategy

**Partition Count**:
- Cannot decrease partition count after creation
- More partitions = more parallelism but more overhead
- Rule of thumb: partitions >= expected max consumer count
- Consider future growth when setting initial count

**Ordering vs. Throughput Trade-off**:
- Strict ordering (single partition) = lowest throughput
- Per-key ordering (keyed messages) = good balance
- No ordering (round-robin) = highest throughput
- Choose based on business requirements

**Custom Partitioners**:
- KafkaJS supports custom partitioner functions
- Useful for: geographic routing, priority lanes, weighted distribution
- Default: murmur2 hash of key bytes

## Interview Tips

When discussing partitioning in interviews:
1. Start with the ordering requirement ("Do we need ordering? For what entity?")
2. Choose key based on ordering needs
3. Discuss hot partition risk and mitigation
4. Mention partition count planning for scalability
5. Know the trade-off: ordering ↔ parallelism ↔ even distribution

## Further Reading

- [Kafka Partitioning](https://kafka.apache.org/documentation/#intro_concepts_and_terms)
- [Producer Partitioning](https://kafka.apache.org/documentation/#theproducer)
- [KafkaJS Custom Partitioner](https://kafka.js.org/docs/producing#custom-partitioner)
