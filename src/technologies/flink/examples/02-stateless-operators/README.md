# Example 2: Stateless Operators - Map, Filter, FlatMap

## Overview

This example focuses on stateless transformations in Apache Flink's DataStream API. Stateless operators process each element independently without maintaining any memory between events, making them highly parallelizable and fundamental building blocks for stream processing pipelines.

Understanding these operators is crucial for system design interviews because they form the basis of data transformation logic in real-time processing systems. Whether you're designing a log processing pipeline, real-time analytics, or event-driven architecture, stateless operators are where most of the business logic lives.

## What You'll Learn

- The difference between stateless and stateful operators
- Map operator for one-to-one transformations
- Filter operator for conditional selection
- FlatMap operator for one-to-many transformations
- How to chain operators together for complex pipelines
- Parallelism and performance characteristics of stateless operations
- Best practices for building efficient transformation pipelines

## Flink Concepts Explained

### Stateless vs Stateful Operators

**Stateless operators** process each element independently:
- No memory of previous events
- Each input element is transformed based solely on its own data
- Can be parallelized across partitions without coordination
- Examples: map, filter, flatMap

**Stateful operators** maintain memory across events:
- Remember information from previous events
- Requires state management and checkpointing
- More complex but enables powerful patterns (aggregations, joins, pattern detection)
- Examples: keyBy, reduce, window aggregations

**Why this matters in interviews:**
- Stateless operations scale horizontally with zero coordination overhead
- Stateful operations require careful resource management and state backend configuration
- Choosing the right operator type affects system performance and complexity

### Map Operator

The map operator applies a function to each element, producing exactly one output element for each input.

**Function signature:**
```java
DataStream<OUT> map(MapFunction<IN, OUT> mapper)
```

**Characteristics:**
- One-to-one transformation (1 input → 1 output)
- Cannot skip elements (use filter for that)
- Cannot produce multiple outputs (use flatMap for that)
- Preserves partitioning (no shuffle required)

**Common use cases:**
```java
// Parse JSON string to object
input.map(json -> new ObjectMapper().readValue(json, Event.class))

// Extract specific field
events.map(event -> event.timestamp)

// Transform data type
temperatures.map(fahrenheit -> (fahrenheit - 32) * 5/9)

// Enrich with metadata
readings.map(reading -> new EnrichedReading(reading, getMetadata()))
```

**Performance characteristics:**
- Very fast - minimal overhead
- Can be chained with other operators (no network shuffle)
- Parallelism scales linearly
- Use for simple transformations

### Filter Operator

The filter operator selects elements based on a boolean condition, dropping elements that don't match.

**Function signature:**
```java
DataStream<T> filter(FilterFunction<T> filter)
```

**Characteristics:**
- Evaluates predicate for each element
- Keeps elements where predicate returns true
- Drops elements where predicate returns false
- Preserves partitioning and order

**Common use cases:**
```java
// Remove invalid events
events.filter(event -> event.isValid())

// Keep only specific event types
stream.filter(event -> event.type == "ERROR" || event.type == "WARNING")

// Time-based filtering
events.filter(event -> event.timestamp > cutoffTime)

// Business logic filtering
orders.filter(order -> order.amount > 100 && order.status == "PENDING")
```

**Performance characteristics:**
- Very efficient - just boolean evaluation
- Should be placed early in pipeline to reduce downstream volume
- Can dramatically reduce network and processing costs
- No state or coordination required

**Best practice:** Filter as early as possible in your pipeline to reduce the amount of data flowing through subsequent operators.

### FlatMap Operator

The flatMap operator transforms each element into zero or more output elements, enabling one-to-many transformations.

**Function signature:**
```java
DataStream<OUT> flatMap(FlatMapFunction<IN, OUT> flatMapper)
```

**Characteristics:**
- One-to-many transformation (1 input → 0+ outputs)
- Uses Collector to emit outputs
- Can emit 0 outputs (acts like filter)
- Can emit multiple outputs from single input
- Preserves order of emissions

**Common use cases:**
```java
// Split delimited strings
lines.flatMap((String line, Collector<String> out) -> {
    for (String word : line.split("\\s+")) {
        out.collect(word);
    }
})

// Explode arrays
events.flatMap((Event event, Collector<Item> out) -> {
    for (Item item : event.items) {
        out.collect(item);
    }
})

// Conditional expansion
logs.flatMap((String log, Collector<Alert> out) -> {
    if (log.contains("ERROR")) {
        out.collect(new Alert(log, "ERROR"));
    }
    if (log.contains("CRITICAL")) {
        out.collect(new Alert(log, "CRITICAL"));
    }
})

// Parse with error handling
input.flatMap((String json, Collector<Event> out) -> {
    try {
        out.collect(parseEvent(json));
    } catch (Exception e) {
        // Skip invalid events by not collecting anything
    }
})
```

**Performance characteristics:**
- More overhead than map due to Collector usage
- Output volume can be larger than input volume
- Still stateless and highly parallelizable
- Consider data volume implications

### Operator Chaining

Flink automatically chains compatible operators together to run in the same task, avoiding serialization and network overhead.

**What gets chained:**
- Operators with same parallelism
- Operators without shuffle boundaries (map, filter, flatMap on same partition)
- Operators where chaining isn't explicitly disabled

**Benefits:**
```
Without chaining:
Source → [serialize] → [network] → [deserialize] → Map → [serialize] → [network] → [deserialize] → Filter

With chaining:
Source → Map → Filter (all in one task)
```

**Performance impact:**
- Reduced serialization/deserialization overhead
- Lower network transfer
- Better CPU cache locality
- Lower latency

**Control chaining:**
```java
// Disable chaining for specific operator
stream.map(x -> transform(x)).disableChaining()

// Start new chain
stream.map(x -> transform(x)).startNewChain()

// Disable all chaining (for debugging)
env.disableOperatorChaining()
```

**When to disable chaining:**
- Debugging (to isolate operator metrics)
- Load balancing (force network shuffle to redistribute work)
- Rarely needed in production

## The Example

This example demonstrates:

1. **Stateless vs Stateful Concepts**: Understanding when operations need memory
2. **Map Operator**: One-to-one transformations with concrete examples
3. **Filter Operator**: Conditional selection for data quality and volume reduction
4. **FlatMap Operator**: One-to-many transformations for expanding data
5. **Operator Chaining**: Building complex pipelines by composing simple operators
6. **Parallelism**: How stateless operators scale horizontally
7. **Complete Pipeline**: End-to-end sensor processing example
8. **Performance Tips**: Best practices for efficient pipelines

**Example Pipeline:**
```java
DataStream<String> rawData = env.addSource(new SensorSource());

DataStream<Alert> alerts = rawData
  .map(json -> parseSensorReading(json))           // Parse
  .filter(reading -> reading.value != null)        // Validate
  .map(reading -> convertUnits(reading))           // Transform
  .filter(reading -> reading.temperature > 100)    // Detect
  .map(reading -> new Alert(reading.sensorId));    // Create alert

alerts.addSink(new AlertSink());
```

This pipeline demonstrates:
- Multiple operator types chained together
- Early filtering to reduce volume
- Progressive transformation from raw to processed data
- Each operator is stateless and independently parallelizable

**Note**: This is a Phase 1 example focusing on concepts. Actual JAR compilation and execution will be added in future phases. For now, we demonstrate the operator patterns and explain the transformation logic conceptually.

## Key Takeaways

- Stateless operators process elements independently without memory between events
- Map transforms each input into exactly one output (1:1)
- Filter selectively passes elements based on a boolean condition
- FlatMap can produce zero or more outputs for each input (1:N)
- Operators can be chained together to build complex pipelines
- Flink automatically chains compatible operators to optimize performance
- Stateless operations scale horizontally without coordination overhead
- Filter early in your pipeline to reduce downstream data volume
- These three operators form the foundation of most stream processing logic

## Interview Talking Points

**When to discuss operator choice:**
- "How do we transform events in real-time?"
  - Map for field transformations, filter for validation, flatMap for expansion
- "Our pipeline needs to process high-volume event streams"
  - Stateless operators scale linearly with parallelism
- "We need to parse and enrich incoming data"
  - Chain map operators: parse → validate → enrich → format
- "Some events should be dropped based on business rules"
  - Use filter early in the pipeline to reduce downstream load

**Performance implications:**
- "How do we optimize throughput?"
  - Increase parallelism for stateless operators
  - Filter early to reduce volume
  - Let Flink chain operators automatically
- "What's the latency profile?"
  - Stateless operators add microseconds per event
  - Chaining reduces per-operator overhead
  - Network shuffles add more latency than stateless transforms
- "How do we handle backpressure?"
  - Stateless operators don't create backpressure (unless downstream is slow)
  - Consider async I/O for external calls instead of blocking in map

**Common patterns:**
- **ETL**: Extract (source) → Transform (map/flatMap) → Load (sink)
- **Data Quality**: Parse → Validate (filter) → Normalize (map) → Output
- **Fan-out**: One event → Multiple derived events (flatMap)
- **Enrichment**: Map with external lookups (consider AsyncDataStream for high-volume)

## Production Considerations

### Operator Chaining Optimization

**Default behavior:**
```java
// These will be chained automatically
stream
  .map(x -> parse(x))      // ↓ chained
  .filter(x -> validate(x)) // ↓ chained
  .map(x -> enrich(x))     // all in one task
```

**When to control chaining:**
- Debugging: Disable to see individual operator metrics
- Load balancing: Force rebalance between operators
- Isolation: Separate expensive operators

**Chaining strategies:**
```java
// Strategy 1: Let Flink decide (recommended)
stream.map(x -> x).filter(y -> y) // Automatic chaining

// Strategy 2: Force new chain for expensive operator
stream
  .map(x -> cheapTransform(x))
  .filter(x -> x.isValid())
  .startNewChain()  // Start here
  .map(x -> expensiveTransform(x))

// Strategy 3: Isolate operator completely
stream.map(x -> x)
  .disableChaining()  // No chaining before or after
  .addSink(sink)
```

### Parallelism Configuration

**Levels of parallelism:**
```java
// 1. Global default
env.setParallelism(8)

// 2. Per operator (overrides global)
stream.map(x -> x).setParallelism(16)
stream.filter(y -> y).setParallelism(4)

// 3. At submission time (overrides all)
flink run -p 32 my-job.jar
```

**Choosing parallelism:**
- Start with number of Kafka partitions (if using Kafka source)
- Increase for CPU-intensive operators
- Decrease for operators with external I/O (database lookups)
- Consider available task slots in cluster
- Monitor CPU and throughput metrics

**Example configuration:**
```java
// Source matches Kafka partitions
DataStream<Event> events = env
  .addSource(new FlinkKafkaConsumer<>(...))
  .setParallelism(24)  // 24 Kafka partitions

// CPU-intensive transformation - higher parallelism
DataStream<Result> processed = events
  .map(event -> expensiveTransform(event))
  .setParallelism(48)  // 2x source parallelism

// Sink to database - lower parallelism to avoid overwhelming DB
processed
  .addSink(new JdbcSink(...))
  .setParallelism(4)  // Limited by database connection pool
```

### Memory Management

**Stateless operators use minimal memory:**
- No state to checkpoint
- Only buffered records in network channels
- Mainly affected by serialization

**Memory considerations:**
```java
// 1. Object reuse (advanced optimization)
env.getConfig().enableObjectReuse()  // Reuse objects instead of copying
// Trade-off: Faster but requires immutability or careful handling

// 2. Serialization format
env.getConfig().enableForceAvro()  // Use Avro for serialization
// Trade-off: More efficient than Java serialization

// 3. Network buffer configuration
taskmanager.network.memory.fraction: 0.1  // 10% of memory for network buffers
taskmanager.network.memory.min: 64mb
taskmanager.network.memory.max: 1gb
```

**Best practices:**
- Use efficient serialization (Avro, Protobuf, Kryo)
- Avoid large objects in streams
- Enable object reuse for high-throughput scenarios
- Monitor network buffer usage

### Serialization

**Why serialization matters:**
- Data is serialized when crossing network boundaries
- Inefficient serialization impacts throughput and latency
- Flink uses TypeInformation for type-safe serialization

**Serialization options:**

1. **POJOs (Plain Old Java Objects):**
```java
public class Event {
  public String id;
  public long timestamp;
  public double value;
  // No-arg constructor required
}
// Flink automatically uses efficient POJO serializer
```

2. **Tuples:**
```java
DataStream<Tuple2<String, Integer>> pairs = stream.map(
  x -> Tuple2.of(x.key, x.count)
);
// Built-in efficient serialization
```

3. **Avro:**
```java
env.getConfig().enableForceAvro()
// Uses Avro schema for serialization
```

4. **Kryo:**
```java
env.getConfig().enableForceKryo()
env.getConfig().registerKryoType(MyClass.class)
// Fallback serializer, less efficient than POJOs
```

**Performance ranking:**
1. POJOs (fastest)
2. Tuples
3. Avro
4. Kryo
5. Java Serialization (slowest, avoid)

**Best practice:** Use POJOs or Tuples for best performance. Register custom types with Kryo if needed.

## Comparison with Alternatives

### Flink vs Spark Transformations

**Flink stateless operators:**
```java
// Flink - true streaming, per-event processing
stream
  .map(x -> transform(x))
  .filter(x -> x.isValid())
  .flatMap((x, out) -> out.collect(...))
```

**Spark transformations:**
```scala
// Spark Streaming - micro-batches
dstream
  .map(x => transform(x))
  .filter(x => x.isValid)
  .flatMap(x => List(...))
```

**Key differences:**
- **Latency**: Flink processes per-event (ms), Spark uses micro-batches (seconds)
- **API**: Similar functional API but different execution model
- **Performance**: Flink better for low-latency, Spark better for batch-oriented workloads
- **Chaining**: Flink chains automatically, Spark uses stages

### Kafka Streams Operators

**Kafka Streams:**
```java
// Kafka Streams - embedded library
stream
  .mapValues(x -> transform(x))
  .filter((k, v) -> v.isValid())
  .flatMapValues(v -> Arrays.asList(...))
```

**Comparison:**
- **Deployment**: Kafka Streams embedded in app, Flink is separate cluster
- **Operators**: Very similar API and semantics
- **Parallelism**: KS uses Kafka partitions, Flink uses task parallelism
- **State**: Both support stateless operations efficiently
- **Use case**: KS for Kafka-to-Kafka, Flink for multi-source and larger scale

### Storm vs Flink

**Storm (legacy):**
```java
// Storm - older streaming framework
topology
  .map(new MapBolt())
  .filter(new FilterBolt())
```

**Why Flink is preferred:**
- Higher-level API (functional vs Bolt classes)
- Better performance and lower latency
- Exactly-once semantics (Storm only at-least-once)
- Better state management
- More active ecosystem

**Note:** Storm is largely superseded by Flink in modern architectures.

## Next Steps

Now that you understand stateless operators, explore:

- **Example 3: Stateful Processing** - Learn about keyed state, reduce, windows, and checkpointing
- **Advanced Topics**: Async I/O, side outputs, custom serializers

For stateful operations, you'll learn:
- KeyedStream and state partitioning
- Reduce and aggregate operators
- Time windows and event time processing
- Checkpointing and fault tolerance

Check the Flink Web UI at http://localhost:8081 to visualize job graphs and see how operators are chained.
