# Example 1: Basics - DataStream API & Job Submission

## Overview

This example introduces the core concepts of Apache Flink stream processing. You'll learn about the DataStream API, the fundamental job structure (Source → Operators → Sink), and how Flink jobs are submitted and managed in a cluster.

Apache Flink is a distributed stream processing framework that processes unbounded and bounded data streams with low latency and high throughput. Understanding these fundamentals is essential for discussing real-time data processing architectures in system design interviews.

## What You'll Learn

- DataStream API as the core abstraction for stream processing
- The Source → Operators → Sink pattern in Flink jobs
- How jobs are packaged as JARs and submitted to a cluster
- Job lifecycle states and monitoring
- The role of TaskManagers and task slots in parallel execution
- How Flink manages distributed state and fault tolerance

## Flink Concepts Explained

### DataStream API

The DataStream API is Flink's primary abstraction for processing data streams. It represents an immutable stream of records that can be transformed using functional operations like `map`, `filter`, `keyBy`, and `reduce`.

**Key characteristics:**
- Immutable streams (transformations create new streams)
- Type-safe in Java/Scala
- Supports event time and processing time semantics
- Rich set of operators for stateless and stateful transformations

**Example structure:**
```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
DataStream<Event> events = env.addSource(new FlinkKafkaConsumer<>(...));
DataStream<Result> results = events
    .keyBy(event -> event.userId)
    .map(event -> transform(event))
    .filter(result -> result.isValid());
results.addSink(new FlinkKafkaSink<>(...));
env.execute("My Flink Job");
```

### Sources and Sinks

**Sources** ingest data into Flink:
- Kafka: Real-time event streams
- Files: Batch processing of stored data
- Sockets: Network streams
- Custom sources: Database CDC, message queues

**Sinks** write processed data:
- Kafka: Stream results to other systems
- Files: Persist results to storage (S3, HDFS)
- Databases: Write to PostgreSQL, Cassandra, etc.
- Custom sinks: Elasticsearch, Redis, webhooks

### Job Submission

Flink jobs are compiled into JAR files containing all application code and dependencies. The submission workflow:

1. **Package**: Compile code with Maven/Gradle → `my-flink-job.jar`
2. **Upload**: Send JAR to Flink cluster via REST API
3. **Submit**: Specify entry class and parameters to start job
4. **Monitor**: Check job status and metrics via REST API or Web UI

### Job Lifecycle

Flink jobs progress through states:

- **CREATED**: Job has been submitted but not yet started
- **RUNNING**: Job is actively processing data
- **FINISHED**: Job completed successfully (for bounded streams)
- **FAILED**: Job encountered an error and stopped
- **CANCELED**: Job was manually stopped

Jobs can be managed via:
- **Cancel**: Stop job immediately
- **Savepoint**: Take consistent snapshot and stop job
- **Restart**: Resume from savepoint or checkpoint

## The Example

This example demonstrates:

1. **Cluster Status**: Check TaskManagers and available slots
2. **Job Structure**: Understand the Source → Operators → Sink pattern
3. **DataStream API**: See how stream transformations are defined
4. **Job Submission**: Learn the workflow from JAR to running job
5. **Job Monitoring**: Query job status and lifecycle states

**Note**: This is a Phase 1 example focusing on concepts. Actual JAR compilation and execution will be added in future phases. For now, we demonstrate the REST API interactions and explain the job structure conceptually.

## Key Takeaways

- Flink's DataStream API provides a functional, type-safe way to define stream processing logic
- Jobs follow a simple pattern: ingest data (Source), transform it (Operators), and write results (Sink)
- Jobs are packaged as JARs containing compiled code and dependencies
- Flink clusters consist of JobManagers (coordination) and TaskManagers (execution)
- Task slots enable parallel execution within TaskManagers
- Jobs have a well-defined lifecycle with states that can be monitored
- The REST API provides programmatic access to job submission and monitoring

## Interview Talking Points

**When to discuss Flink:**
- "We need to process event streams with complex stateful operations"
  - Example: Sessionization, pattern detection, time-window aggregations
- "Our system requires exactly-once processing guarantees"
  - Flink's checkpointing provides exactly-once state consistency
- "We need both stream and batch processing with the same API"
  - Flink's unified API handles bounded and unbounded streams
- "Latency is critical - we need sub-second processing"
  - Flink processes events individually, not in micro-batches

**Architectural considerations:**
- "How do we handle late-arriving events?"
  - Discuss event time processing, watermarks, and allowed lateness
- "What happens if a TaskManager fails?"
  - Explain checkpointing, state recovery, and task reallocation
- "How do we scale processing capacity?"
  - TaskManagers can be added/removed dynamically, slots provide parallelism
- "Can we reprocess data without losing state?"
  - Savepoints enable job upgrades and backfilling while preserving state

## Production Considerations

### Job Deployment

**Deployment modes:**
- **Session Cluster**: Multiple jobs share a long-running cluster
  - Lower resource usage, but jobs affect each other
- **Job Cluster**: Dedicated cluster per job (deprecated in newer versions)
  - Isolation but higher overhead
- **Application Mode**: Application runs on cluster, submits job locally
  - Recommended for production, better resource efficiency

**Resource allocation:**
- Configure TaskManager memory (heap, network buffers, managed memory)
- Set parallelism based on data volume and latency requirements
- TaskManager slots should match CPU cores for optimal performance

### Resource Configuration

**Parallelism:**
- Default parallelism affects all operators (can be overridden per operator)
- Higher parallelism = more parallel tasks = higher throughput
- Too high = overhead from coordination and network shuffles

**Memory:**
- TaskManager heap for user code and operators
- Network buffers for data exchange between tasks
- Managed memory for RocksDB state backend (if used)

**Checkpointing:**
- Enable checkpointing for fault tolerance (e.g., every 60 seconds)
- Choose state backend: Memory (dev), FsStateBackend (small state), RocksDBStateBackend (large state)
- Configure checkpoint storage (HDFS, S3) for production

### Monitoring

**Essential metrics:**
- Job status and uptime
- Checkpoint duration and size
- Backpressure (tasks waiting for downstream tasks)
- Task failures and restarts
- Records processed per second
- Event time lag (how far behind real-time)

**Tools:**
- Flink Web UI: Visual job graph, metrics, logs
- REST API: Programmatic monitoring and alerting
- Metrics reporters: Prometheus, Grafana, Datadog
- Logging: TaskManager logs for debugging

### Failure Recovery

**Checkpointing:**
- Periodic snapshots of job state to durable storage
- Enables exactly-once processing guarantees
- On failure, job restarts from last successful checkpoint

**Restart strategies:**
- Fixed-delay: Retry N times with delay
- Failure-rate: Retry if failure rate below threshold
- Exponential-backoff: Increase delay between retries

**State backends:**
- Memory: Fast but limited to TaskManager memory (dev only)
- FsStateBackend: Snapshots to distributed filesystem
- RocksDBStateBackend: Embedded database for large state (GBs-TBs)

## Comparison with Alternatives

### When to use Flink vs Spark Streaming

**Choose Flink when:**
- True streaming (event-by-event) is required
- Low latency is critical (milliseconds to seconds)
- Complex event processing with state (sessionization, pattern detection)
- Exactly-once semantics are essential

**Choose Spark when:**
- Batch processing dominates your workload
- Micro-batch latency (seconds) is acceptable
- You already have a Spark ecosystem
- ML/SQL integration is important

### When to use Flink vs Kafka Streams

**Choose Flink when:**
- You need distributed state across multiple machines
- Processing requires joining multiple streams with different sources
- You want a separate compute layer from storage
- Complex windowing and event-time processing

**Choose Kafka Streams when:**
- Processing is Kafka-to-Kafka
- You want embedded processing in your application
- Simpler deployment model (no cluster to manage)
- State fits on a single machine

### When to use Flink vs Storm

**Choose Flink:**
- Modern replacement for Storm with better performance
- Exactly-once processing (Storm only provides at-least-once)
- More mature ecosystem and tooling
- Better state management

**Storm is largely superseded by Flink in modern architectures**

## Next Steps

Now that you understand Flink basics, explore:

- **Example 2: Stateless Operators** - Learn about `map`, `filter`, `flatMap`, and windowing
- **Example 3: Stateful Processing** - Dive into keyed state, checkpointing, and fault tolerance

Check the Flink Web UI at http://localhost:8081 to visualize jobs and explore the cluster.
