# Kafka Examples Implementation Design

**Date:** 2026-05-11  
**Status:** Approved  
**Phase:** Infrastructure-First with Starter Examples

## Overview

Add comprehensive Kafka examples to the system design learning platform, mirroring the successful Redis examples structure. This will give students hands-on experience with Apache Kafka for interview preparation, covering core concepts through advanced production patterns.

## Goals

1. **Educational Value**: Provide 10 interactive Kafka examples demonstrating patterns commonly discussed in system design interviews
2. **Consistency**: Mirror the Redis examples structure for easy navigation and familiar learning experience
3. **Visual Learning**: Include Kafka UI for visualizing topics, partitions, messages, and consumer groups
4. **Production Focus**: Emphasize production considerations, trade-offs, and when to use Kafka vs alternatives
5. **Interview Preparation**: Cover key topics from the Kafka documentation: partitioning strategy, ordering guarantees, fault tolerance, and performance

## Architecture

### Directory Structure

```
src/technologies/kafka/
├── README.md                          # Kafka technology guide
├── client.ts                          # KafkaClient wrapper class
└── examples/
    ├── 01-basics/
    │   ├── README.md                  # Example documentation
    │   └── index.ts                   # Example implementation
    ├── 02-partitioning/
    │   ├── README.md
    │   └── index.ts
    ├── 03-consumer-groups/
    ├── 04-message-ordering/
    ├── 05-pubsub/
    ├── 06-event-streaming/
    ├── 07-idempotency-retries/
    ├── 08-hot-partitions/
    ├── 09-change-data-capture/
    └── 10-event-sourcing/
```

### Integration Points

**Docker Services** (`docker-compose.yml`):
- Zookeeper (port 2181)
- Kafka broker (port 9092)
- Kafka UI (port 8002)

**CLI Integration** (`src/cli.ts`):
- Add Kafka to technology selection menu
- Import and register all Kafka examples
- Handle Kafka client lifecycle

**Scripts**:
- `scripts/reset-kafka.ts` - Reset Kafka topics and data
- `scripts/test-kafka-examples.ts` - Automated testing
- Add `npm run reset:kafka` and `npm run test:kafka` commands

**Dependencies**:
- Add `kafkajs` to package.json

## Docker Configuration

### Services

**Zookeeper**:
```yaml
zookeeper:
  image: confluentinc/cp-zookeeper:7.5.0
  container_name: system-design-zookeeper
  environment:
    ZOOKEEPER_CLIENT_PORT: 2181
    ZOOKEEPER_TICK_TIME: 2000
  ports:
    - "${ZOOKEEPER_PORT:-2181}:2181"
  healthcheck:
    test: ["CMD", "nc", "-z", "localhost", "2181"]
    interval: 5s
    timeout: 3s
    retries: 5
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 256M
```

**Kafka Broker**:
```yaml
kafka:
  image: confluentinc/cp-kafka:7.5.0
  container_name: system-design-kafka
  depends_on:
    zookeeper:
      condition: service_healthy
  ports:
    - "${KAFKA_PORT:-9092}:9092"
  environment:
    KAFKA_BROKER_ID: 1
    KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
    KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
    KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
    KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
  healthcheck:
    test: ["CMD", "kafka-broker-api-versions", "--bootstrap-server", "localhost:9092"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 512M
```

**Kafka UI**:
```yaml
kafka-ui:
  image: provectuslabs/kafka-ui:latest
  container_name: system-design-kafka-ui
  depends_on:
    kafka:
      condition: service_healthy
  ports:
    - "${KAFKA_UI_PORT:-8002}:8080"
  environment:
    KAFKA_CLUSTERS_0_NAME: local
    KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:9092
    KAFKA_CLUSTERS_0_ZOOKEEPER: zookeeper:2181
  restart: unless-stopped
  deploy:
    resources:
      limits:
        memory: 256M
```

### Environment Variables

Add to `.env.example`:
```bash
# Kafka
KAFKA_BROKER=localhost:9092
KAFKA_PORT=9092
ZOOKEEPER_PORT=2181
KAFKA_UI_PORT=8002
```

## The 10 Examples

### Phase 1: Infrastructure + Initial Examples (2 examples)

#### 1. Basics - Topics, Producers, Consumers
**Scenario**: Order creation events in e-commerce system

**Demonstrates**:
- Creating topics with multiple partitions
- Producing messages with keys and values
- Consuming messages from beginning
- Understanding offsets and message structure

**Key Concepts**:
- Topics as logical grouping
- Partitions as physical distribution
- Messages (key, value, timestamp, headers)
- Offset tracking

**Production Considerations**:
- Message size limits (keep under 1MB)
- Broker capacity estimation
- Retention policy defaults (7 days)

---

#### 2. Partitioning Strategies
**Scenario**: Order events partitioned different ways (customer ID vs order ID vs product ID)

**Demonstrates**:
- Key-based partition assignment
- Hash partitioning algorithm
- Same-key ordering guarantees
- Impact of key choice on distribution and parallelism

**Key Concepts**:
- `partition = hash(key) % num_partitions`
- Partition-level ordering
- Even distribution importance
- Choosing the right partition key

**Production Considerations**:
- Hot partition preview
- Key cardinality impact
- Repartitioning challenges

---

### Phase 2: Core Patterns (4 examples)

#### 3. Consumer Groups
**Scenario**: Multiple order processing workers scaling horizontally

**Demonstrates**:
- Creating consumer group with multiple consumers
- Partition assignment across group members
- Rebalancing when consumers join/leave
- Each message processed by exactly one consumer in group

**Key Concepts**:
- Consumer group coordination
- Partition ownership
- Automatic rebalancing
- Parallel consumption

**Production Considerations**:
- Consumer lag monitoring
- Max consumers = number of partitions
- Rebalance storms with many consumers

---

#### 4. Message Ordering Guarantees
**Scenario**: Order state transitions must happen in sequence (created → paid → shipped → delivered)

**Demonstrates**:
- Within-partition ordering is guaranteed
- Cross-partition ordering is not guaranteed
- Key selection for ordering requirements
- Trade-offs between ordering and throughput

**Key Concepts**:
- Partition-level ordering only
- Single partition = single consumer at a time
- Ordering vs parallelism trade-off

**Production Considerations**:
- When to sacrifice ordering for scale
- Out-of-order detection strategies
- Timestamp vs offset for ordering

---

#### 5. Pub/Sub Messaging
**Scenario**: Order events consumed by analytics service, notification service, and inventory service independently

**Demonstrates**:
- Multiple consumer groups reading same topic
- Independent offset management per group
- Fan-out pattern for event distribution
- Compare to Redis pub/sub (durability vs ephemerality)

**Key Concepts**:
- Consumer group independence
- Message retention enables replay
- Persistent vs ephemeral messaging

**Production Considerations**:
- Topic retention must accommodate slowest consumer
- Storage costs for long retention
- When Redis pub/sub is sufficient

---

#### 6. Event Streaming
**Scenario**: Real-time inventory tracking as orders are placed and fulfilled

**Demonstrates**:
- Continuous consumption pattern
- Offset commit strategies (auto vs manual)
- Replaying from specific offset or timestamp
- At-least-once delivery semantics by default

**Key Concepts**:
- Stream as infinite log
- Offset commits and checkpointing
- Replay capability
- Processing guarantees

**Production Considerations**:
- Commit frequency vs reprocessing risk
- Consumer failure scenarios
- Idempotent processing design

---

### Phase 3: Production Patterns (4 examples)

#### 7. Idempotency & Retries
**Scenario**: Payment processing that must not double-charge customers

**Demonstrates**:
- Idempotent producer configuration
- Producer automatic retries on transient failures
- Consumer retry logic with separate retry topic
- Dead letter queue (DLQ) for permanently failed messages

**Key Concepts**:
- Idempotent producer prevents duplicates
- Transactional guarantees (exactly-once)
- Retry topic pattern
- DLQ for poison pills

**Production Considerations**:
- Retry limit configuration
- Exponential backoff strategies
- DLQ monitoring and alerts
- When to use transactions

---

#### 8. Hot Partition Handling
**Scenario**: Black Friday sale where a popular product receives disproportionate order volume

**Demonstrates**:
- Identifying hot partition problem
- Key salting technique (add random suffix)
- Compound key strategy (product_id + user_id)
- Back pressure and producer throttling
- Trade-offs of each approach

**Key Concepts**:
- Partition skew causes bottlenecks
- Salting distributes load but breaks ordering
- Compound keys maintain some ordering
- Monitoring partition lag

**Production Considerations**:
- When hot partitions are acceptable
- Dynamic key strategies
- Over-partitioning as prevention
- Alert thresholds for partition lag

---

#### 9. Change Data Capture (CDC)
**Scenario**: Product catalog updates from PostgreSQL database to Elasticsearch search index

**Demonstrates**:
- CDC pattern concept (database changes → Kafka events)
- Log compaction for retaining latest state
- Keyed messages for updates and tombstones for deletes
- Rebuilding downstream state from compacted log

**Key Concepts**:
- Log compaction vs time-based retention
- Tombstone records (null value)
- Kafka as state synchronization layer
- CDC vs full snapshots

**Production Considerations**:
- When to use Kafka Connect vs custom CDC
- Schema evolution challenges
- Compaction lag and delays
- Storage implications of compaction

---

#### 10. Event Sourcing with Kafka
**Scenario**: Order lifecycle as immutable sequence of events (OrderCreated, PaymentReceived, OrderShipped, OrderDelivered)

**Demonstrates**:
- Event sourcing pattern
- Rebuilding current state from event history
- Long retention policies for audit trail
- Compare to Redis Streams (scale, durability, replay window)

**Key Concepts**:
- Events as source of truth
- State reconstruction from events
- Event replay for debugging/recovery
- Kafka vs Redis Streams trade-offs

**Production Considerations**:
- Infinite retention vs snapshots
- Compaction for optimization
- Performance of full replay
- When Redis Streams is sufficient (smaller scale, shorter retention)

## Implementation Details

### KafkaClient Wrapper

```typescript
export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private admin: Admin | null = null;
  private consumers: Consumer[] = [];

  constructor() {
    const broker = process.env.KAFKA_BROKER || 'localhost:9092';
    this.kafka = new Kafka({
      clientId: 'system-design-examples',
      brokers: [broker],
      retry: {
        retries: 5,
        initialRetryTime: 300,
      },
    });
  }

  async connect(): Promise<void> {
    this.producer = this.kafka.producer({
      idempotent: true, // Enable idempotence by default
    });
    this.admin = this.kafka.admin();
    
    await this.producer.connect();
    await this.admin.connect();
  }

  async disconnect(): Promise<void> {
    if (this.producer) await this.producer.disconnect();
    if (this.admin) await this.admin.disconnect();
    
    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
    this.consumers = [];
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.admin) return false;
      await this.admin.listTopics();
      return true;
    } catch {
      return false;
    }
  }

  getProducer(): Producer {
    if (!this.producer) throw new Error('Producer not connected');
    return this.producer;
  }

  getAdmin(): Admin {
    if (!this.admin) throw new Error('Admin not connected');
    return this.admin;
  }

  createConsumer(groupId: string): Consumer {
    const consumer = this.kafka.consumer({ groupId });
    this.consumers.push(consumer);
    return consumer;
  }

  async resetTopics(topics: string[]): Promise<void> {
    const admin = this.getAdmin();
    
    // Delete topics if they exist
    try {
      await admin.deleteTopics({ topics });
    } catch (error) {
      // Topics might not exist, that's okay
    }
    
    // Wait a bit for deletion to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

### Example Interface

```typescript
export interface Example {
  name: string;
  description: string;
  run(client: KafkaClient, logger: Logger): Promise<void>;
}
```

### Example Template

Each example follows this pattern:

```typescript
import type { KafkaClient } from '../../client.js';
import type { Example, Logger } from '../../../../lib/types.js';

export const exampleName: Example = {
  name: 'Display Name',
  description: 'One-line description',

  async run(client: KafkaClient, logger: Logger): Promise<void> {
    const producer = client.getProducer();
    const admin = client.getAdmin();
    const consumer = client.createConsumer('example-group');

    logger.section('📨 Section Header');
    logger.info('Context and scenario\n');

    // Clean slate
    await client.resetTopics(['topic-name']);

    logger.step('Step 1: Description');
    // Implementation
    logger.command('Command description', 'output');
    logger.assert(condition, 'Assertion message');
    logger.production('Production consideration\n');

    // More steps...

    logger.success('\n✓ Example complete!');
    
    // Cleanup
    await consumer.disconnect();
  },
};
```

### CLI Integration

Update `src/cli.ts`:

1. Import KafkaClient and all Kafka examples
2. Add Kafka to technology selection menu
3. Create KAFKA_EXAMPLES array
4. Handle Kafka selection with client lifecycle
5. Display Kafka examples in submenu
6. Run selected example with client and logger

### Testing Support

**Non-Interactive Mode**:
- Check `NON_INTERACTIVE` environment variable
- Skip prompts and run all examples sequentially
- Capture output for verification
- Report success/failure for each example

**Test Script** (`scripts/test-kafka-examples.ts`):
```typescript
// Similar to test-redis-examples.ts
// Set NON_INTERACTIVE=true
// Connect to Kafka
// Run each example
// Verify no errors
// Generate test report
```

### README Structure

`src/technologies/kafka/README.md`:

1. **What is Kafka?**
   - Distributed event streaming platform
   - Key characteristics (durable, scalable, fast)
   - Message queue vs stream

2. **Why Kafka for Interviews?**
   - Common in real-world systems
   - Demonstrates distributed systems concepts
   - Async processing, decoupling, event-driven architecture

3. **10 Kafka Examples**
   - Overview table with scenarios
   - Brief description of each example
   - Link to example README

4. **Key Concepts Across Examples**
   - Partitioning and ordering
   - Consumer groups and scalability
   - Durability and fault tolerance
   - Performance optimization

5. **Getting Started**
   - Start Docker services
   - Launch CLI
   - Select Kafka and example
   - View Kafka UI at localhost:8002

6. **Production Considerations**
   - When to use Kafka vs alternatives
   - Scaling strategies
   - Monitoring and observability
   - Common pitfalls

7. **Interview Tips**
   - Discuss partition key selection
   - Explain ordering trade-offs
   - Know when NOT to use Kafka
   - Compare to Redis, RabbitMQ, SQS

8. **Common Interview Questions**
   - When would you use Kafka vs Redis pub/sub?
   - How do you handle hot partitions?
   - What are the delivery guarantees?
   - How does Kafka achieve high throughput?

9. **Further Reading**
   - Link to `key_technologies/kafka/original.md`
   - Official Kafka documentation
   - Common patterns and use cases

## Theme and Context

**E-commerce with Event-Driven Architecture**:
- Orders, payments, inventory, shipments
- Microservices communicating via events
- Real-time processing and analytics
- State synchronization across services

**Example Scenarios**:
- Order lifecycle events (created, paid, shipped, delivered)
- Inventory updates as products sell
- Product catalog changes (CDC from database)
- User activity streams for analytics
- Payment processing with retry logic
- Black Friday sale traffic spikes (hot partitions)

This maintains consistency with Redis examples while naturally showcasing Kafka's strengths in event-driven systems.

## Non-Goals (Out of Scope)

- **Schema Registry**: Not including Avro/Protobuf examples to keep setup simpler
- **Kafka Connect**: Conceptually covered in CDC example but not implementing actual connectors
- **Kafka Streams**: Mentioned in comparison but not implementing stream processing library
- **ksqlDB**: Not covering SQL interface to Kafka
- **Multiple brokers**: Single broker is sufficient for educational examples
- **Security**: No SASL/SSL configuration for local development
- **Monitoring tools**: Kafka UI provides basic visibility, not adding Prometheus/Grafana

## Success Criteria

1. **Complete Infrastructure**: Docker services running, health checks passing, CLI integrated
2. **10 Working Examples**: All examples run successfully, produce expected output, handle cleanup
3. **Educational Quality**: Clear explanations, production considerations, interview relevance
4. **Visual Experience**: Kafka UI accessible and useful for visualizing concepts
5. **Testing Coverage**: Automated tests pass for all examples
6. **Documentation**: Comprehensive README matching Redis quality
7. **Consistency**: Structure and style match existing Redis examples

## Implementation Phases

### Phase 1: Infrastructure + Examples 1-2
**Deliverables**:
- Docker services (Zookeeper, Kafka, Kafka UI)
- KafkaClient wrapper class
- CLI integration
- Example 1: Basics
- Example 2: Partitioning Strategies
- Kafka README (complete)
- Reset script
- Test script foundation

**Success Criteria**:
- Can start services via docker-compose
- Can access Kafka UI at localhost:8002
- Can select Kafka in CLI and run 2 examples
- Examples demonstrate concepts clearly
- Production considerations included

---

### Phase 2: Examples 3-6
**Deliverables**:
- Example 3: Consumer Groups
- Example 4: Message Ordering
- Example 5: Pub/Sub Messaging
- Example 6: Event Streaming
- Update test script for new examples

**Success Criteria**:
- All 6 examples (1-6) working and tested
- Clear progression from basics to patterns
- Examples build on previous concepts

---

### Phase 3: Examples 7-10
**Deliverables**:
- Example 7: Idempotency & Retries
- Example 8: Hot Partition Handling
- Example 9: Change Data Capture
- Example 10: Event Sourcing
- Complete test coverage
- Final README polish

**Success Criteria**:
- All 10 examples working and tested
- Production patterns clearly demonstrated
- Kafka vs alternatives comparisons included
- Interview tips comprehensive

## Trade-offs and Decisions

### Why kafkajs over other clients?
- Native JavaScript/TypeScript support
- Active maintenance and community
- Good documentation
- Matches the documentation examples in original.md

### Why single broker?
- Sufficient for educational purposes
- Reduces resource requirements
- Simplifies setup for students
- Concepts still apply to multi-broker clusters

### Why Kafka UI over other tools?
- Lightweight and easy to set up
- Good visualization of topics, partitions, messages
- No authentication required for local development
- Similar experience to RedisInsight

### Why not Schema Registry?
- Adds complexity to setup
- Requires additional dependencies
- Core Kafka concepts don't require it
- Can be mentioned in documentation for advanced usage

### Why 10 examples like Redis?
- Proven structure that works well
- Comprehensive coverage without overwhelming
- Consistent experience across technologies
- Sufficient depth for interview preparation

## Risks and Mitigations

**Risk**: Kafka services consume more resources than Redis
**Mitigation**: Memory limits in docker-compose, single broker setup, clear system requirements in README

**Risk**: Kafka concepts are more complex than Redis
**Mitigation**: Progressive complexity across examples, clear comparisons to Redis, focus on interview-relevant topics

**Risk**: Example code becomes verbose with async patterns
**Mitigation**: KafkaClient wrapper handles boilerplate, examples focus on Kafka concepts, helper methods for common patterns

**Risk**: Students unfamiliar with event-driven architecture
**Mitigation**: E-commerce theme provides familiar context, clear scenario descriptions, compare to Redis patterns they know

**Risk**: Kafka UI might not start or be confusing
**Mitigation**: Health checks ensure it's ready, include screenshots in README, provide CLI alternative for viewing topics

## Future Enhancements (Not in Initial Scope)

- Add PostgreSQL examples for RDBMS patterns
- Add Elasticsearch examples for search patterns
- Add Cassandra examples for NoSQL patterns
- Cross-technology examples (Kafka + PostgreSQL CDC)
- Performance benchmarking examples
- Multi-broker cluster examples
- Schema Registry integration
- Kafka Streams examples
- Interactive debugging mode

## References

- Kafka documentation: `/key_technologies/kafka/original.md`
- Redis implementation: `src/technologies/redis/`
- Docker Compose best practices
- kafkajs documentation: https://kafka.js.org/
- Kafka UI documentation: https://github.com/provectus/kafka-ui
