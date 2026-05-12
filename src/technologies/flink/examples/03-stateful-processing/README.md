# Example 3: Stateful Processing - ValueState, ListState, MapState

## Overview

This example explores stateful stream processing in Apache Flink, one of its most powerful features. You'll learn how Flink maintains state across events, enabling complex operations like aggregations, sessionization, and pattern detection while providing fault tolerance through checkpointing.

Stateful processing is essential for real-world stream processing applications. Understanding how to manage state efficiently, choose the right state primitives, and configure fault tolerance is critical for discussing distributed stream processing in system design interviews.

## What You'll Learn

- The difference between stateful and stateless processing
- Keyed state and how state is partitioned for parallel processing
- ValueState for storing single values per key
- ListState for maintaining collections of values
- MapState for storing key-value mappings
- State backends and how they affect performance and scale
- Checkpointing for fault tolerance and exactly-once semantics
- State TTL for preventing unbounded growth

## Flink Concepts Explained

### Stateful vs Stateless Processing

**Stateless processing** processes each event independently without memory:
- `map`, `filter`, `flatMap` are stateless
- No information carried between events
- Each input produces output(s) without context
- Scales easily with high parallelism

**Stateful processing** maintains memory across events:
- Operators remember information between events
- Enables aggregations (counts, sums), joins, and pattern detection
- State is partitioned by key for parallel processing
- Requires checkpointing for fault tolerance

**When to use stateful processing:**
- Counting events per entity (user, sensor, session)
- Tracking sessions with timeout-based windows
- Detecting patterns or anomalies across event sequences
- Joining streams by enriching events with contextual data
- Maintaining running aggregations or metrics

### Keyed State

State in Flink is organized by key after using `keyBy()`:

```java
DataStream<Event> stream = env.addSource(new EventSource());
KeyedStream<Event, String> keyed = stream.keyBy(event -> event.userId);
// Each userId has isolated state
```

**Key benefits:**
- State is partitioned across parallel tasks
- Each key's state is independent (user1 != user2)
- Flink manages state lifecycle automatically
- Parallel processing without coordination overhead

**Example**: If you have 1M users and parallelism of 16, each task handles ~62,500 users' state independently.

### ValueState

ValueState stores a single value per key. It's the simplest state primitive.

**Characteristics:**
- One value per key (e.g., Integer, Boolean, String, POJO)
- Read with `value()`, write with `update()`
- Returns null if no value set yet
- Perfect for counters, flags, or latest values

**Example - Login counter:**
```java
public class LoginCounter extends RichMapFunction<Event, Alert> {
  private transient ValueState<Integer> countState;
  
  @Override
  public void open(Configuration config) {
    ValueStateDescriptor<Integer> descriptor =
      new ValueStateDescriptor<>("loginCount", Integer.class);
    countState = getRuntimeContext().getState(descriptor);
  }
  
  @Override
  public Alert map(Event event) throws Exception {
    Integer count = countState.value();
    count = (count == null) ? 1 : count + 1;
    countState.update(count);
    
    if (count > 10) {
      return new Alert(event.userId, "HIGH_LOGIN_COUNT");
    }
    return null;
  }
}
```

**Use cases:**
- Running totals or counts
- Last seen value (latest price, temperature)
- Boolean flags (is active?, has purchased?)
- Single aggregated metric per key

### ListState

ListState maintains a list of values per key.

**Characteristics:**
- Stores multiple values as a list
- Add with `add()`, get all with `get()`, replace with `update()`
- Useful for tracking history or buffering
- Requires manual size management

**Example - Track recent events:**
```java
public class RecentEventsTracker extends RichFlatMapFunction<Event, Alert> {
  private transient ListState<Event> recentEvents;
  
  @Override
  public void open(Configuration config) {
    ListStateDescriptor<Event> descriptor =
      new ListStateDescriptor<>("recentEvents", Event.class);
    recentEvents = getRuntimeContext().getListState(descriptor);
  }
  
  @Override
  public void flatMap(Event event, Collector<Alert> out) throws Exception {
    recentEvents.add(event);
    
    List<Event> events = new ArrayList<>();
    for (Event e : recentEvents.get()) {
      events.add(e);
    }
    
    // Keep only last 100 events
    if (events.size() > 100) {
      events = events.subList(events.size() - 100, events.size());
      recentEvents.update(events);
    }
    
    if (detectAnomaly(events)) {
      out.collect(new Alert(event.sensorId, "ANOMALY_DETECTED"));
    }
  }
}
```

**Use cases:**
- Recent event history (last N events)
- Buffering for batch operations
- Pattern detection across sequences
- Custom windowing logic

### MapState

MapState stores key-value mappings per key (nested map structure).

**Characteristics:**
- Each key has its own map of key-value pairs
- Put with `put(key, value)`, get with `get(key)`
- Iterate with `entries()`, remove with `remove(key)`
- Perfect for lookup data or grouped metrics

**Example - Feature flags:**
```java
public class FeatureFlagProcessor extends RichMapFunction<Event, EnrichedEvent> {
  private transient MapState<String, Boolean> featureFlags;
  
  @Override
  public void open(Configuration config) {
    MapStateDescriptor<String, Boolean> descriptor =
      new MapStateDescriptor<>("featureFlags", String.class, Boolean.class);
    featureFlags = getRuntimeContext().getMapState(descriptor);
  }
  
  @Override
  public EnrichedEvent map(Event event) throws Exception {
    if (event.type.equals("ENABLE_FEATURE")) {
      featureFlags.put(event.featureName, true);
    } else if (event.type.equals("DISABLE_FEATURE")) {
      featureFlags.put(event.featureName, false);
    }
    
    Boolean darkModeEnabled = featureFlags.get("dark_mode");
    return new EnrichedEvent(event, darkModeEnabled);
  }
}
```

**Use cases:**
- Feature flags or user preferences
- Lookup tables per key (product catalog, pricing)
- Metrics grouped by dimension (counts by region)
- Join state (store right-side events by join key)

### State Backends

State backends determine where and how state is stored.

#### HashMapStateBackend (Memory)

**Characteristics:**
- All state stored in TaskManager heap memory
- Fast access (in-memory)
- Limited by heap size
- Checkpoints serialize entire state to storage

**When to use:**
- Development and testing
- Small state (MBs per key)
- Fast state access required
- Low checkpoint overhead acceptable

**Configuration:**
```java
env.setStateBackend(new HashMapStateBackend());
```

#### EmbeddedRocksDBStateBackend

**Characteristics:**
- State stored on local disk, cached in memory
- Scales to TBs of state per task
- Slower access (disk I/O)
- Incremental checkpointing support

**When to use:**
- Large state (GBs-TBs per task)
- State exceeds available heap memory
- Incremental checkpointing needed
- Slight latency increase acceptable

**Configuration:**
```java
env.setStateBackend(new EmbeddedRocksDBStateBackend());
```

### Checkpointing and State Recovery

Checkpointing provides fault tolerance by periodically snapshotting state.

**How it works:**
1. JobManager triggers checkpoint at configured interval
2. Special barrier markers flow through the stream
3. Each operator snapshots its state when barrier arrives
4. State snapshots written to durable storage (S3, HDFS, NFS)
5. On failure, job restarts from last successful checkpoint

**Configuration:**
```java
// Enable checkpointing every 60 seconds
env.enableCheckpointing(60000);

// Configure checkpoint storage
env.getCheckpointConfig().setCheckpointStorage("s3://bucket/checkpoints");

// Set exactly-once mode
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);

// Minimum pause between checkpoints
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000);

// Checkpoint timeout
env.getCheckpointConfig().setCheckpointTimeout(120000);

// Max concurrent checkpoints
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
```

**Benefits:**
- Exactly-once processing guarantees
- Automatic recovery from failures
- No data loss or duplication
- State preserved across restarts

### State TTL (Time-To-Live)

TTL automatically cleans up old state to prevent unbounded growth.

**Configuration:**
```java
StateTtlConfig ttlConfig = StateTtlConfig
  .newBuilder(Time.days(7))  // State expires after 7 days
  .setUpdateType(UpdateType.OnCreateAndWrite)  // Reset TTL on writes
  .setStateVisibility(StateVisibility.NeverReturnExpired)  // Don't return expired
  .build();

ValueStateDescriptor<Integer> descriptor =
  new ValueStateDescriptor<>("count", Integer.class);
descriptor.enableTimeToLive(ttlConfig);
```

**Use cases:**
- Remove state for inactive users
- Clean up temporary session data
- Limit memory usage for long-running jobs
- Comply with data retention policies

## The Example

This example demonstrates:

1. **Stateful vs Stateless**: Understanding when state is needed
2. **ValueState**: Counting login events per user
3. **ListState**: Tracking recent events for pattern detection
4. **MapState**: Storing feature flags and configurations
5. **State Backends**: Choosing between memory and RocksDB
6. **Checkpointing**: Configuring fault tolerance
7. **State TTL**: Preventing unbounded state growth
8. **Complete Example**: Session tracking with all three state types

**Note**: This is a Phase 1 example focusing on concepts. Actual JAR compilation and execution will be added in future phases. For now, we demonstrate state management patterns conceptually.

## Key Takeaways

- Stateful processing maintains memory across events, enabling aggregations and pattern detection
- State is partitioned by key for parallel processing without coordination
- ValueState stores single values (counters, flags)
- ListState stores collections (history, buffers)
- MapState stores key-value pairs (lookups, configurations)
- State backends control storage: Memory (fast, limited) vs RocksDB (scalable, slower)
- Checkpointing provides fault tolerance and exactly-once guarantees
- State TTL prevents unbounded growth by expiring old state
- Proper state management enables processing TBs of data with low latency

## Interview Talking Points

**When to discuss stateful processing:**
- "We need to count events per user in real-time"
  - Use ValueState to maintain counters per key
- "Our system requires sessionization with timeout windows"
  - Use ListState to buffer events and timers for session boundaries
- "We need to join two streams with different arrival patterns"
  - Use MapState to buffer events from one side until the other arrives
- "How do we handle failures without losing state?"
  - Explain checkpointing and exactly-once guarantees

**Architectural considerations:**
- "How much state can Flink handle?"
  - Discuss state backends: Memory (GBs), RocksDB (TBs)
  - Mention state grows with number of active keys
- "What happens when state grows unbounded?"
  - Explain TTL configuration and manual state cleanup
  - Discuss monitoring state size per operator
- "How do we migrate jobs with existing state?"
  - Savepoints enable job upgrades while preserving state
  - State schema evolution requires careful planning
- "Can we scale stateful jobs dynamically?"
  - Explain key group assignment and state redistribution
  - Mention rescaling impacts (state shuffle overhead)

**Performance considerations:**
- "What's the cost of checkpointing?"
  - Discuss checkpoint interval vs recovery time tradeoff
  - Mention incremental checkpointing for large state
- "How do we avoid hot keys?"
  - Explain partitioning strategies and key distribution
  - Discuss splitting hot keys into multiple logical keys
- "What about state access latency?"
  - Compare Memory (microseconds) vs RocksDB (milliseconds)
  - Mention RocksDB caching and tuning

## Production Considerations

### State Backend Selection

**Criteria for choosing:**
- **HashMapStateBackend** if:
  - State per task < 1GB
  - Low latency critical (sub-millisecond)
  - Sufficient heap memory available
  
- **EmbeddedRocksDBStateBackend** if:
  - State per task > 1GB
  - State may grow to TBs
  - Incremental checkpointing needed
  - Slightly higher latency acceptable (1-5ms)

**Migration path:**
- Start with Memory for development
- Move to RocksDB when state grows
- Use incremental checkpointing for large state

### State Size Management

**Monitoring:**
- Track state size per operator (Flink Web UI)
- Alert on rapid state growth
- Monitor checkpoint duration (should be < interval)

**Optimization strategies:**
1. **Enable TTL** on all state descriptors with reasonable expiration
2. **Manual cleanup** in process functions (clear state when done)
3. **Key distribution** to avoid hot keys with disproportionate state
4. **State compaction** for RocksDB (automatic background process)
5. **Rescale carefully** (more parallelism = smaller state per task)

**Example monitoring:**
```java
// Log state size periodically
getRuntimeContext().getMetricGroup()
  .gauge("stateSizeBytes", () -> estimateStateSize());
```

### Checkpointing Configuration

**Production settings:**
```java
// Checkpoint every 1-5 minutes (balance frequency vs overhead)
env.enableCheckpointing(300000);  // 5 minutes

// Allow up to 10 minutes for large state checkpoints
env.getCheckpointConfig().setCheckpointTimeout(600000);

// Require at least 2 minutes between checkpoints
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(120000);

// Keep last 3 checkpoints for rollback options
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
env.getCheckpointConfig().setTolerableCheckpointFailureNumber(2);

// Externalize checkpoints (survive job cancellation)
env.getCheckpointConfig().enableExternalizedCheckpoints(
  ExternalizedCheckpointCleanup.RETAIN_ON_CANCELLATION
);

// Use incremental checkpoints with RocksDB
env.getCheckpointConfig().enableIncrementalCheckpointing(true);
```

**Checkpoint storage:**
- Use distributed file system: S3, HDFS, Azure Blob
- Configure lifecycle policies (delete old checkpoints)
- Monitor storage costs (checkpoints can be large)

### State TTL Configuration

**Example TTL strategies:**

```java
// Inactive users: 30 days
StateTtlConfig userTtl = StateTtlConfig
  .newBuilder(Time.days(30))
  .setUpdateType(UpdateType.OnReadAndWrite)  // Extend TTL on access
  .cleanupFullSnapshot()  // Clean during checkpoints
  .build();

// Session data: 1 hour
StateTtlConfig sessionTtl = StateTtlConfig
  .newBuilder(Time.hours(1))
  .setUpdateType(UpdateType.OnCreateAndWrite)  // Don't extend on reads
  .cleanupIncrementally(10, false)  // Background cleanup
  .build();

// Temporary buffers: 5 minutes
StateTtlConfig bufferTtl = StateTtlConfig
  .newBuilder(Time.minutes(5))
  .setUpdateType(UpdateType.OnCreateAndWrite)
  .cleanupInRocksdbCompactFilter(1000)  // RocksDB compaction cleanup
  .build();
```

**TTL cleanup strategies:**
- **Full snapshot**: Clean during checkpoints (low overhead, periodic cleanup)
- **Incremental**: Background cleanup during processing (continuous cleanup)
- **RocksDB compaction**: Clean during RocksDB compaction (RocksDB only)

### Migration and Evolution

**Schema evolution:**
- State is serialized; changing types requires careful migration
- Use POJO state with Avro for schema evolution support
- Test migrations in staging with production savepoints

**Job upgrades:**
1. Take savepoint: `flink savepoint <job-id> s3://path`
2. Cancel job: `flink cancel <job-id>`
3. Deploy new version
4. Restore from savepoint: `flink run -s s3://path/savepoint ...`

**Breaking changes:**
- Cannot change state descriptor name (Flink uses it to restore)
- Cannot change key type (requires state migration)
- Can add new state (null initialized)
- Can change value type with compatible serializer

## Comparison with Alternatives

### Flink State vs Kafka Streams State Stores

**Flink advantages:**
- Distributed state across machines (scales beyond single node)
- More state primitives (ValueState, ListState, MapState)
- Checkpointing to durable storage (S3, HDFS)
- Exactly-once guarantees without external changelog

**Kafka Streams advantages:**
- Embedded in application (no cluster to manage)
- State backed by Kafka changelog topics (durable by default)
- Simpler deployment for Kafka-centric architectures
- Interactive queries (query state from external applications)

**When to choose Flink:**
- State exceeds single machine capacity (TBs)
- Multiple stream sources (not just Kafka)
- Complex CEP (Complex Event Processing) required

**When to choose Kafka Streams:**
- Processing is Kafka-to-Kafka
- State fits on single machine (GBs)
- Prefer embedded processing in application

### Flink State vs Spark Streaming Checkpointing

**Flink advantages:**
- Fine-grained state per key (more efficient)
- Incremental checkpointing (faster for large state)
- True streaming (event-by-event state updates)
- Lower latency state access

**Spark Streaming approach:**
- Micro-batch processing (state updated per batch)
- Checkpoints save entire RDD lineage
- Higher latency but simpler mental model
- Better integration with Spark batch/ML

**When to choose Flink:**
- True streaming with low latency required
- Complex stateful operations per key
- Large distributed state (TBs)

**When to choose Spark:**
- Batch + streaming with unified codebase
- ML pipeline integration critical
- Micro-batch latency acceptable

## Next Steps

Now that you understand stateful processing, explore:

- **Example 4: Windowing** - Time-based and count-based windows (Future Phase)
- **Example 5: Watermarks** - Handling late events and event time (Future Phase)
- **Example 6: Stream Joins** - Joining multiple streams with state (Future Phase)

Check the Flink Web UI at http://localhost:8081 to monitor job state and checkpoints.

For deeper learning:
- Flink DataStream API documentation
- State backends comparison benchmarks
- Checkpoint tuning guides
- State schema evolution patterns
