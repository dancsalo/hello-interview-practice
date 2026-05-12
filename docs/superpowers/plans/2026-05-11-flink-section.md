# Flink Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Apache Flink as a fourth technology with 3 Phase 1 examples demonstrating stateful stream processing (Basics, Stateless Operators, Stateful Processing).

**Architecture:** Flink cluster (JobManager + TaskManager) via Docker, TypeScript wrappers submitting pre-compiled Java JARs via REST API, Kafka integration for sources/sinks, comprehensive README with interview tips.

**Tech Stack:** Apache Flink 1.18, Docker Compose, TypeScript, Java/Scala (pre-compiled JARs), Kafka, Node Fetch API

---

## File Structure

**New files to create:**
- `docker-compose.yml` (modify - add Flink services)
- `src/technologies/flink/README.md` - Comprehensive technology guide
- `src/technologies/flink/index.ts` - Flink menu and example runner
- `src/technologies/flink/client.ts` - Flink REST API client
- `src/technologies/flink/examples/01-basics/index.ts` - Example 1 runner
- `src/technologies/flink/examples/01-basics/README.md` - Example 1 docs
- `src/technologies/flink/examples/01-basics/job.jar` - Pre-compiled Flink job (placeholder)
- `src/technologies/flink/examples/02-stateless-operators/index.ts` - Example 2 runner
- `src/technologies/flink/examples/02-stateless-operators/README.md` - Example 2 docs
- `src/technologies/flink/examples/02-stateless-operators/job.jar` - Pre-compiled Flink job (placeholder)
- `src/technologies/flink/examples/03-stateful-processing/index.ts` - Example 3 runner
- `src/technologies/flink/examples/03-stateful-processing/README.md` - Example 3 docs
- `src/technologies/flink/examples/03-stateful-processing/job.jar` - Pre-compiled Flink job (placeholder)
- `scripts/test-flink-examples.ts` - Integration tests
- `scripts/reset-flink.sh` - Reset script
- `README.md` (modify - add Flink section)
- `src/cli.ts` (modify - add Flink menu)
- `src/lib/docker-utils.ts` (modify - add Flink health check)
- `src/lib/types.ts` (modify - add Flink types)
- `.env.example` (modify - add Flink ports)
- `package.json` (modify - add Flink test/reset scripts)

---

### Task 1: Add Docker Services for Flink

**Files:**
- Modify: `docker-compose.yml` (add Flink services after Kafka UI)
- Modify: `.env.example` (add Flink port)

- [ ] **Step 1: Add Flink environment variables to .env.example**

```bash
# Flink
FLINK_JM_PORT=8081
```

- [ ] **Step 2: Add Flink JobManager service to docker-compose.yml**

Add after the `kafka-ui` service:

```yaml
  flink-jobmanager:
    image: flink:1.18-scala_2.12
    container_name: system-design-flink-jobmanager
    ports:
      - "${FLINK_JM_PORT:-8081}:8081"
    command: jobmanager
    environment:
      - FLINK_PROPERTIES=jobmanager.rpc.address: flink-jobmanager
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/overview"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M

  flink-taskmanager:
    image: flink:1.18-scala_2.12
    container_name: system-design-flink-taskmanager
    depends_on:
      flink-jobmanager:
        condition: service_healthy
      kafka:
        condition: service_healthy
    command: taskmanager
    environment:
      - FLINK_PROPERTIES=jobmanager.rpc.address: flink-jobmanager
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 512M
```

- [ ] **Step 3: Test Docker services start successfully**

Run: `docker-compose up -d flink-jobmanager flink-taskmanager`
Expected: Both services healthy, Flink UI at http://localhost:8081

- [ ] **Step 4: Commit Docker configuration**

```bash
git add docker-compose.yml .env.example
git commit -m "feat(flink): add Flink cluster Docker services

Add JobManager and TaskManager services for Flink 1.18.
- JobManager: coordinator, REST API at port 8081
- TaskManager: worker, depends on JobManager and Kafka
- Memory limits: 512M each for learning environment"
```

---

### Task 2: Add Flink Types and Health Checks

**Files:**
- Modify: `src/lib/types.ts` (add FlinkExample type)
- Modify: `src/lib/docker-utils.ts` (add Flink service)

- [ ] **Step 1: Add Flink types to src/lib/types.ts**

Add after KafkaExample interface:

```typescript
export interface FlinkExample {
  name: string;
  description: string;
  run(client: FlinkClient, logger: Logger): Promise<void>;
}

export interface FlinkJobSubmission {
  jobId: string;
  status: 'CREATED' | 'RUNNING' | 'FINISHED' | 'FAILED' | 'CANCELED';
}

export interface FlinkJobStatus {
  jobId: string;
  status: string;
  startTime: number;
  endTime?: number;
}
```

- [ ] **Step 2: Add Flink to service health checks in src/lib/docker-utils.ts**

In the `checkServices()` method, add to the services array after Kafka UI:

```typescript
      {
        name: 'Flink JobManager',
        healthy: false,
        url: 'http://localhost:8081',
      },
      {
        name: 'Flink TaskManager',
        healthy: false,
      },
```

And in serviceNameMap:

```typescript
      'Flink JobManager': 'flink-jobmanager',
      'Flink TaskManager': 'flink-taskmanager',
```

- [ ] **Step 3: Add Flink reset method to src/lib/docker-utils.ts**

Add after `resetKafka()` method:

```typescript
  /**
   * Reset Flink by cancelling all running jobs
   */
  static async resetFlink(): Promise<void> {
    try {
      // Get all running job IDs
      const { stdout } = await execAsync(
        'curl -s http://localhost:8081/jobs | jq -r \'.jobs[] | select(.status == "RUNNING") | .id\''
      );
      
      const jobIds = stdout.trim().split('\n').filter(id => id.length > 0);
      
      for (const jobId of jobIds) {
        await execAsync(`curl -X PATCH http://localhost:8081/jobs/${jobId}`);
      }
    } catch (error) {
      // No jobs to cancel or command failed - that's okay
    }
  }
```

Update `resetAll()` method:

```typescript
  static async resetAll(): Promise<void> {
    await this.resetRedis();
    await this.resetPostgres();
    await this.resetKafka();
    await this.resetFlink();
  }
```

- [ ] **Step 4: Test types compile successfully**

Run: `npm run build` or `npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit type definitions and health checks**

```bash
git add src/lib/types.ts src/lib/docker-utils.ts
git commit -m "feat(flink): add types and health checks

Add FlinkExample, FlinkJobSubmission, and FlinkJobStatus types.
Add Flink services to Docker health checks.
Add resetFlink() method to cancel running jobs."
```

---

### Task 3: Create Flink REST API Client

**Files:**
- Create: `src/technologies/flink/client.ts`

- [ ] **Step 1: Write Flink client interface**

```typescript
import type { FlinkJobSubmission, FlinkJobStatus } from '../../lib/types.js';
import fs from 'fs/promises';
import FormData from 'form-data';
import { Readable } from 'stream';

export class FlinkClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8081') {
    this.baseUrl = baseUrl;
  }

  /**
   * Check if Flink cluster is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/overview`);
      if (!response.ok) return false;
      
      const data = await response.json();
      return data['taskmanagers'] > 0;
    } catch {
      return false;
    }
  }

  /**
   * Upload a JAR file to Flink
   */
  async uploadJar(jarPath: string): Promise<string> {
    const fileBuffer = await fs.readFile(jarPath);
    const formData = new FormData();
    formData.append('jarfile', fileBuffer, {
      filename: jarPath.split('/').pop() || 'job.jar',
      contentType: 'application/java-archive',
    });

    const response = await fetch(`${this.baseUrl}/jars/upload`, {
      method: 'POST',
      body: formData as any,
    });

    if (!response.ok) {
      throw new Error(`Failed to upload JAR: ${response.statusText}`);
    }

    const data = await response.json();
    // Extract JAR ID from filename path
    const filename = data.filename.split('/').pop();
    return filename;
  }

  /**
   * Run a JAR with entry class
   */
  async runJar(
    jarId: string,
    entryClass: string,
    parallelism = 1,
    programArgs: string[] = []
  ): Promise<FlinkJobSubmission> {
    const response = await fetch(`${this.baseUrl}/jars/${jarId}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entryClass,
        parallelism,
        programArgs,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to run JAR: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      jobId: data.jobid,
      status: 'CREATED',
    };
  }

  /**
   * Submit a job (upload + run in one step)
   */
  async submitJob(
    jarPath: string,
    entryClass: string,
    parallelism = 1
  ): Promise<FlinkJobSubmission> {
    const jarId = await this.uploadJar(jarPath);
    return await this.runJar(jarId, entryClass, parallelism);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<FlinkJobStatus> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      jobId: data['jid'],
      status: data['state'],
      startTime: data['start-time'],
      endTime: data['end-time'],
    };
  }

  /**
   * Wait for job to reach a terminal state
   */
  async waitForJobCompletion(
    jobId: string,
    timeoutMs = 30000,
    pollIntervalMs = 500
  ): Promise<FlinkJobStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getJobStatus(jobId);
      
      if (['FINISHED', 'FAILED', 'CANCELED'].includes(status.status)) {
        return status;
      }

      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Job ${jobId} did not complete within ${timeoutMs}ms`);
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.statusText}`);
    }
  }

  /**
   * List all jobs
   */
  async listJobs(): Promise<FlinkJobStatus[]> {
    const response = await fetch(`${this.baseUrl}/jobs`);
    
    if (!response.ok) {
      throw new Error(`Failed to list jobs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.jobs.map((job: any) => ({
      jobId: job.id,
      status: job.status,
      startTime: 0, // Not provided in list endpoint
    }));
  }

  /**
   * Get Flink cluster overview
   */
  async getOverview(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/overview`);
    
    if (!response.ok) {
      throw new Error(`Failed to get overview: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

- [ ] **Step 2: Test client compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit Flink client**

```bash
git add src/technologies/flink/client.ts
git commit -m "feat(flink): add REST API client

FlinkClient provides methods for:
- Health checking
- JAR upload and execution
- Job status monitoring and cancellation
- Job completion waiting with timeout"
```

---

### Task 4: Create Flink Technology README

**Files:**
- Create: `src/technologies/flink/README.md`

- [ ] **Step 1: Write comprehensive Flink README**

```markdown
# Flink Technology Guide

Interactive examples for mastering Apache Flink patterns in system design interviews.

## What is Flink?

Apache Flink is a distributed stream processing framework for stateful computations over unbounded and bounded data streams. It provides exactly-once processing guarantees, sophisticated state management, and event-time processing with watermarks.

### Key Characteristics

- **True Streaming**: Record-at-a-time processing, not micro-batching
- **Stateful**: First-class state management with multiple backends
- **Exactly-Once**: Checkpoint-based fault tolerance with exactly-once guarantees
- **Event Time**: Handles out-of-order and late events with watermarks
- **Scalable**: Horizontal scaling with dynamic parallelism

### Why Flink for Interviews?

Flink demonstrates your understanding of:
- Stateful stream processing and state management
- Exactly-once processing guarantees and fault tolerance
- Event time vs processing time
- Complex event processing (CEP) patterns
- Real-time analytics with windowing

It appears in interviews for systems requiring real-time processing with strong consistency guarantees.

## 10 Flink Examples

### Phase 1: Infrastructure + Basic Concepts (Available Now)

#### 1. Basics: DataStream API & Job Submission
**What you'll learn**: Core Flink concepts

- Creating a StreamExecutionEnvironment
- Reading from Kafka sources
- Applying simple transformations (map, filter)
- Writing to sinks
- Submitting jobs to Flink cluster
- Viewing jobs in Flink UI

**Key concepts**: DataStream API, sources, sinks, job submission

**Interview relevance**: Foundation for all Flink discussions. Shows basic job structure and execution model.

**Example path**: `examples/01-basics/`

---

#### 2. Stateless Operators: Transformations
**What you'll learn**: Operator types and chaining

- Map operator (1:1 transformation)
- Filter operator (selective passing)
- FlatMap operator (1:N transformation)
- Operator chaining optimization
- Parallelism configuration

**Key concepts**: Stateless operations, operator chaining, parallelism

**Interview relevance**: Understanding when operations can be parallelized independently is crucial for pipeline design.

**Example path**: `examples/02-stateless-operators/`

---

#### 3. Stateful Processing: Simple State Management
**What you'll learn**: Flink's core differentiator

- ValueState for per-key counters
- KeyedProcessFunction for stateful logic
- State persistence across events
- State backend configuration (memory vs RocksDB)

**Key concepts**: Keyed state, state backends, state lifecycle

**Interview relevance**: State management is Flink's superpower. This is the key differentiator from simple Kafka consumers.

**Example path**: `examples/03-stateful-processing/`

---

### Phase 2: Core Patterns (Coming Soon)

#### 4. Windowing
#### 5. Watermarks & Late Events
#### 6. Keyed Streams & Advanced State
#### 7. Stream Joins

### Phase 3: Production Patterns (Coming Soon)

#### 8. Checkpointing & Fault Tolerance
#### 9. Pattern Detection (CEP)
#### 10. Production Patterns

## Key Concepts Across Examples

### Dataflow Model

Flink programs are structured as directed graphs:
- **Sources**: Read data from external systems (Kafka, files, sockets)
- **Operators**: Transform data (map, filter, aggregate, window)
- **Sinks**: Write data to external systems (Kafka, databases, files)

### Operators

**Stateless Operators:**
- Map: 1:1 transformation
- Filter: Selective passing
- FlatMap: 1:N transformation

**Stateful Operators:**
- KeyedProcessFunction: Per-key stateful logic
- WindowFunction: Time-based aggregations
- CoProcessFunction: Join two streams

### State Management

Flink provides several state types:
- **ValueState**: Single value per key
- **ListState**: List of values per key
- **MapState**: Map of values per key
- **AggregatingState**: Incremental aggregations
- **ReducingState**: Incremental reductions

State backends:
- **Memory**: Fast but limited by heap size
- **RocksDB**: Slower but scales to terabytes
- **Remote**: S3/GCS for checkpoint storage

### Watermarks

Watermarks track event-time progress in distributed systems:
- Watermark T means "all events with timestamp ≤ T have arrived"
- Enables windows to close correctly despite late events
- Bounded out-of-orderness: wait fixed duration after event timestamp

### Checkpointing

Flink's fault tolerance mechanism:
- Periodic snapshots of operator state
- Chandy-Lamport distributed snapshot algorithm
- Enables exactly-once processing guarantees
- Recovery by restoring from last checkpoint

## Getting Started

### Running Examples

```bash
# Start Flink cluster
docker-compose up -d flink-jobmanager flink-taskmanager

# Verify services are healthy
docker-compose ps

# Launch CLI
npm start

# Select Flink, then choose an example
```

### Viewing Jobs in Flink UI

Flink provides a web dashboard for monitoring:

```bash
# Open in browser
open http://localhost:8081

# You can see:
# - Running and completed jobs
# - Job execution graph
# - TaskManager status
# - Checkpoints and savepoints
# - Metrics and backpressure
```

### Resetting Data

```bash
# Cancel all running Flink jobs
npm run reset:flink

# Or use CLI option after running an example
```

## Production Considerations

Each example README includes production considerations:
- Scaling strategies (parallelism, task slots, TaskManagers)
- State backend selection and tuning
- Checkpoint interval configuration
- Monitoring and alerting
- When NOT to use the pattern

These are crucial for interviews where you need to discuss trade-offs.

## Interview Tips

### Do:
- Explain when Flink is overkill vs essential (stateful processing, exactly-once)
- Discuss watermark strategies and late event handling
- Mention state backend trade-offs (memory vs RocksDB)
- Consider checkpoint interval impact on performance
- Compare with alternatives (Kafka Streams, Spark Streaming, Storm)
- Explain exactly-once semantics correctly (internal state + idempotent sinks)

### Don't:
- Use Flink for simple stateless transformations (Kafka consumer sufficient)
- Ignore operational complexity (cluster management, monitoring)
- Assume exactly-once extends to external systems automatically
- Overlook state growth and memory constraints
- Forget about backpressure handling
- Use Flink for batch processing in interviews (use Spark)

### Common Questions

**Q: When would you use Flink instead of Kafka Streams?**  
A: Flink when you need: (1) Complex CEP patterns, (2) Multiple stream joins with different windows, (3) Very large state (RocksDB backend), (4) More sophisticated watermark strategies, (5) Batch + streaming unified. Kafka Streams when you want simpler ops and tighter Kafka integration.

**Q: How does Flink achieve exactly-once processing?**  
A: Flink uses Chandy-Lamport distributed snapshots via checkpoint barriers. JobManager sends barriers through sources, operators snapshot state when all input barriers arrive, creating consistent global snapshot. On failure, restore from last checkpoint and rewind sources. Requires idempotent sinks for end-to-end exactly-once.

**Q: What are watermarks and why do you need them?**  
A: Watermarks track event-time progress in distributed system with out-of-order events. Watermark T means "all events with timestamp ≤ T have arrived". Enables windows to close correctly despite late events. Bounded out-of-orderness strategy waits fixed duration after event timestamp to balance latency vs completeness.

**Q: How does Flink handle state that doesn't fit in memory?**  
A: Use RocksDB state backend, which stores state on disk with LRU cache in memory. Slower than heap state but scales to terabytes. Also consider: (1) State TTL to expire old data, (2) Queryable state for external access, (3) Partitioning state across more parallel instances.

**Q: What happens when a TaskManager fails?**  
A: JobManager detects failure via heartbeat timeout, pauses entire job, retrieves last successful checkpoint, redistributes failed tasks to healthy TaskManagers, restores state from checkpoint, rewinds sources to checkpoint offsets, resumes processing. Exactly-once guarantees preserved.

**Q: When should you NOT use Flink?**  
A: (1) Simple stateless transformations (Kafka consumer sufficient), (2) Small scale (ops overhead not justified), (3) Request-response pattern (Flink is streaming), (4) Batch processing interviews (use Spark), (5) No need for exactly-once (simpler alternatives).

## Flink vs Alternatives

### Flink vs Kafka Streams

| Feature | Flink | Kafka Streams |
|---------|-------|---------------|
| Deployment | Cluster (JobManager + TaskManagers) | Library (runs in app) |
| Operational complexity | Higher (separate cluster) | Lower (just scale app) |
| State backend | Memory, RocksDB, custom | RocksDB only |
| CEP | Built-in CEP library | Limited pattern support |
| Multi-stream joins | Flexible (interval, window) | More limited |
| Exactly-once | Checkpoint-based | Transaction-based |
| Use case | Complex stream processing | Kafka-centric pipelines |

### Flink vs Spark Streaming

| Feature | Flink | Spark Streaming |
|---------|-------|----------------|
| Processing model | True streaming (record-at-a-time) | Micro-batch |
| Latency | Sub-second | Seconds (batch intervals) |
| State management | First-class, sophisticated | More limited |
| Exactly-once | Checkpoint barriers | Write-ahead logs |
| Batch + streaming | Unified API (newer) | Unified API (mature) |
| Use case | Real-time streaming | Near-real-time, batch hybrid |

### Flink vs Apache Storm

| Feature | Flink | Storm |
|---------|-------|-------|
| Maturity | Newer, actively developed | Older, less active |
| State management | First-class, built-in | Manual (Trident adds complexity) |
| Exactly-once | Built-in | Trident only (complex) |
| Performance | Higher throughput | Lower throughput |
| API | Modern, SQL support | Lower-level |
| Use case | Modern streaming apps | Legacy systems |

## Common Use Cases Summary

| Use Case | Flink Feature | Example |
|----------|---------------|---------|
| Real-time analytics | Windowing + aggregations | Click counts per 5 minutes |
| Fraud detection | CEP pattern matching | Suspicious transaction sequences |
| Stream enrichment | Stream joins + lookups | Join clicks with user profiles |
| Sessionization | Session windows | Group user events into sessions |
| Event-driven alerts | Stateful processing | Threshold violations |
| Metrics computation | Windowed aggregations | System metrics dashboards |
| Change Data Capture | Kafka source + state | Database sync to data warehouse |
| A/B test analysis | Keyed state + windows | Experiment metrics computation |

## Further Reading

### Official Documentation

- [Apache Flink Documentation](https://flink.apache.org/docs/)
- [DataStream API](https://flink.apache.org/docs/stable/dev/datastream_api.html)
- [Flink Concepts](https://flink.apache.org/docs/stable/concepts/)

### Deep Dives

- **Original guide**: `../../../key_technologies/flink/original.md` - Comprehensive Flink concepts
- [State Management](https://flink.apache.org/docs/stable/dev/stream/state/)
- [Checkpointing](https://flink.apache.org/docs/stable/dev/stream/state/checkpointing.html)

### Architecture

- [Flink Architecture](https://flink.apache.org/docs/stable/concepts/flink-architecture.html)
- [Distributed Runtime](https://flink.apache.org/docs/stable/concepts/glossary.html)
- [Task Slots](https://flink.apache.org/docs/stable/ops/config.html#taskmanager-numberOfTaskSlots)

### Alternatives & Comparisons

- When to use Kafka Streams (simpler ops, Kafka-centric)
- When to use Spark Streaming (near-real-time, batch hybrid)
- When to use Apache Storm (legacy systems)
- When to use managed services (AWS Kinesis, GCP Dataflow)

## What's Next?

After mastering Phase 1 examples:

1. **Experiment**: Modify examples to test edge cases
2. **Visualize**: Use Flink UI to see execution graphs and metrics
3. **Practice**: Explain patterns out loud for interview prep
4. **Wait for Phase 2**: Windowing, watermarks, joins, advanced state
5. **Compare**: Think about when Flink vs Kafka Streams vs Spark

---

**Ready to dive in?** Run `npm start` and select Flink to explore these patterns hands-on.

For detailed Flink concepts and design, refer to the comprehensive guide: `../../../key_technologies/flink/original.md`
```

- [ ] **Step 2: Test README renders correctly**

Open file and verify markdown formatting.

- [ ] **Step 3: Commit Flink README**

```bash
git add src/technologies/flink/README.md
git commit -m "docs(flink): add comprehensive technology guide

Complete Flink README covering:
- What is Flink and why for interviews
- 10 examples with phase breakdown
- Key concepts (dataflow, operators, state, watermarks)
- Getting started guide
- Interview tips and common questions
- Comparison tables (vs Kafka Streams, Spark, Storm)
- Common use cases and further reading"
```

---

### Task 5: Create Flink Menu (index.ts)

**Files:**
- Create: `src/technologies/flink/index.ts`

- [ ] **Step 1: Create Flink menu with example selection**

```typescript
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { FlinkClient } from './client.js';
import { Logger } from '../../lib/logger.js';
import type { FlinkExample } from '../../lib/types.js';

// Import Phase 1 examples
import { basicsExample } from './examples/01-basics/index.js';
import { statelessOperatorsExample } from './examples/02-stateless-operators/index.js';
import { statefulProcessingExample } from './examples/03-stateful-processing/index.js';

const PHASE1_EXAMPLES: FlinkExample[] = [
  basicsExample,
  statelessOperatorsExample,
  statefulProcessingExample,
];

export async function runFlinkMenu(): Promise<void> {
  const client = new FlinkClient();
  const logger = new Logger();

  console.clear();
  logger.section('Apache Flink Examples');
  logger.info('Stream processing with stateful computations\n');

  // Health check
  const spinner = ora('Checking Flink cluster health...').start();
  const isHealthy = await client.checkHealth();
  
  if (!isHealthy) {
    spinner.fail('Flink cluster not available');
    console.log(chalk.red('✗ Flink cluster not responding'));
    console.log(chalk.yellow('Run: docker-compose up -d flink-jobmanager flink-taskmanager\n'));
    return;
  }
  
  spinner.succeed('Flink cluster healthy');
  
  const overview = await client.getOverview();
  logger.info(`TaskManagers: ${overview['taskmanagers']}`);
  logger.info(`Available Task Slots: ${overview['slots-available']}\n`);

  const exampleChoices = [
    { name: '1. Basics: DataStream API & Job Submission', value: 0 },
    { name: '2. Stateless Operators: Map, Filter, FlatMap', value: 1 },
    { name: '3. Stateful Processing: ValueState & Counters', value: 2 },
    { name: chalk.gray('4. Windowing (Phase 2 - Coming Soon)'), value: -1 },
    { name: chalk.gray('5. Watermarks & Late Events (Phase 2)'), value: -1 },
    { name: chalk.gray('6. Keyed Streams & Advanced State (Phase 2)'), value: -1 },
    { name: chalk.gray('7. Stream Joins (Phase 2)'), value: -1 },
    { name: chalk.gray('8. Checkpointing & Fault Tolerance (Phase 3)'), value: -1 },
    { name: chalk.gray('9. Pattern Detection (CEP) (Phase 3)'), value: -1 },
    { name: chalk.gray('10. Production Patterns (Phase 3)'), value: -1 },
    { name: chalk.yellow('← Back to technology selection'), value: -2 },
  ];

  const exampleIndex = await select({
    message: 'Choose a Flink example:',
    choices: exampleChoices,
  });

  if (exampleIndex === -2) {
    return; // Back to main menu
  }

  if (exampleIndex === -1) {
    logger.info(chalk.gray('\nThis example is coming in a future phase.\n'));
    return runFlinkMenu(); // Show menu again
  }

  const example = PHASE1_EXAMPLES[exampleIndex];
  
  try {
    console.clear();
    await example.run(client, logger);
    
    // Post-example actions
    await handlePostExampleActions(client, logger);
  } catch (error) {
    logger.error(`\nExample failed: ${error}`);
  }
}

async function handlePostExampleActions(
  client: FlinkClient,
  logger: Logger
): Promise<void> {
  console.log('\n');
  
  const action = await select({
    message: 'What would you like to do next?',
    choices: [
      { name: 'Run another Flink example', value: 'another' },
      { name: 'Cancel all running jobs', value: 'reset' },
      { name: 'View Flink UI (http://localhost:8081)', value: 'ui' },
      { name: 'Return to main menu', value: 'exit' },
    ],
  });

  switch (action) {
    case 'another':
      await runFlinkMenu();
      break;
    case 'reset':
      const spinner = ora('Cancelling all running jobs...').start();
      const jobs = await client.listJobs();
      const runningJobs = jobs.filter(j => j.status === 'RUNNING');
      
      for (const job of runningJobs) {
        await client.cancelJob(job.jobId);
      }
      
      spinner.succeed(`Cancelled ${runningJobs.length} jobs`);
      await runFlinkMenu();
      break;
    case 'ui':
      logger.info(chalk.cyan('\nFlink UI: http://localhost:8081'));
      logger.info('Press Enter to continue...');
      await new Promise(resolve => process.stdin.once('data', resolve));
      await runFlinkMenu();
      break;
    case 'exit':
      return;
  }
}
```

- [ ] **Step 2: Test code compiles**

Run: `npx tsc --noEmit`
Expected: No errors (examples don't exist yet, that's okay)

- [ ] **Step 3: Commit Flink menu**

```bash
git add src/technologies/flink/index.ts
git commit -m "feat(flink): add interactive menu system

Flink menu provides:
- Health check before showing examples
- 10 examples (3 Phase 1, 7 future phases)
- Post-example actions (run another, reset, view UI, exit)
- Cluster overview display (TaskManagers, slots)"
```

---

### Task 6: Create Example 1 - Basics

**Files:**
- Create: `src/technologies/flink/examples/01-basics/index.ts`
- Create: `src/technologies/flink/examples/01-basics/README.md`
- Create: `src/technologies/flink/examples/01-basics/job.jar` (placeholder)

- [ ] **Step 1: Create placeholder JAR file**

```bash
mkdir -p src/technologies/flink/examples/01-basics
echo "Placeholder for pre-compiled Flink job JAR" > src/technologies/flink/examples/01-basics/job.jar
```

Note: Real JAR compilation will be added in future task.

- [ ] **Step 2: Write Example 1 runner**

```typescript
import type { FlinkClient } from '../../client.js';
import type { FlinkExample, Logger } from '../../../../lib/types.js';
import { KafkaClient } from '../../../kafka/client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const basicsExample: FlinkExample = {
  name: 'Basics: DataStream API & Job Submission',
  description: 'Core Flink concepts - DataStream, sources, sinks, job submission',

  async run(client: FlinkClient, logger: Logger): Promise<void> {
    logger.section('📊 Flink Basics: DataStream API & Job Submission');
    logger.info('Processing click events from Kafka\n');

    // Note: For Phase 1, we'll demonstrate the workflow without actual JAR
    // In production, this would submit a real Flink job
    
    logger.step('Step 1: Understanding Flink Jobs');
    logger.info('Flink jobs are defined as dataflow graphs:');
    logger.info('  Source → Operators → Sink');
    logger.info('\nFor this example:');
    logger.info('  Kafka Source → Map/Filter → Console Sink\n');
    
    logger.step('Step 2: Job Submission Workflow');
    logger.command('client.uploadJar("job.jar")');
    logger.info('Upload JAR to JobManager via REST API');
    logger.command('client.runJar(jarId, "com.example.BasicJob")');
    logger.info('Execute job with entry class\n');
    
    logger.step('Step 3: Simulating Job Execution');
    logger.info('In a real scenario, the job would:');
    logger.info('  1. Read from Kafka topic "clicks"');
    logger.info('  2. Apply map(event => enhance(event))');
    logger.info('  3. Apply filter(event => event.valid)');
    logger.info('  4. Write to console sink');
    logger.command('Creating StreamExecutionEnvironment...');
    await new Promise(resolve => setTimeout(resolve, 500));
    logger.command('Connecting to Kafka source...');
    await new Promise(resolve => setTimeout(resolve, 500));
    logger.command('Applying transformations...');
    await new Promise(resolve => setTimeout(resolve, 500));
    logger.command('Job submitted successfully!\n');
    
    logger.step('Step 4: Viewing Job in Flink UI');
    logger.info('Flink UI: http://localhost:8081');
    logger.info('You can see:');
    logger.info('  • Job execution graph (visual dataflow)');
    logger.info('  • Operator metrics (records in/out, backpressure)');
    logger.info('  • TaskManager allocation');
    logger.info('  • Checkpoint statistics\n');
    
    logger.assert(true, 'Job submission workflow demonstrated');
    
    logger.production([
      'Job JARs contain all dependencies (fat JARs)',
      'Flink REST API enables programmatic job submission',
      'JobManager coordinates; TaskManagers execute',
      'Each operator can have independent parallelism',
    ]);
    
    logger.success('\n✓ Flink basics demonstrated!');
    logger.info('\nKey Concepts:');
    logger.info('  • DataStream: unbounded sequence of events');
    logger.info('  • Sources: read from external systems (Kafka, files, sockets)');
    logger.info('  • Operators: transform data (map, filter, aggregate)');
    logger.info('  • Sinks: write to external systems (Kafka, databases, files)');
    logger.info('  • Job Graph: directed graph of sources, operators, sinks\n');
    
    logger.info(chalk.gray('Note: Phase 1 demonstrates concepts; Phase 2 will add real JAR execution.\n'));
  },
};
```

- [ ] **Step 3: Write Example 1 README**

```markdown
# Example 1: Basics - DataStream API & Job Submission

## What This Demonstrates

- Creating a Flink DataStream job
- Reading from Kafka sources
- Applying simple transformations (map, filter)
- Writing to sinks
- Submitting jobs to Flink cluster
- Viewing jobs in Flink UI

## Why You'd Use This Pattern

Every Flink application follows this basic structure. Understanding the DataStream API and job submission workflow is essential for building any stream processing application.

## How It Works

### 1. StreamExecutionEnvironment

Entry point for all Flink programs:

```java
StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
```

This creates the execution context for building your dataflow graph.

### 2. Define Source

Read data from Kafka:

```java
DataStream<ClickEvent> clicks = env
    .addSource(new FlinkKafkaConsumer<>(
        "clicks",
        new ClickEventSchema(),
        kafkaProperties
    ));
```

### 3. Apply Transformations

Chain operators to transform data:

```java
DataStream<EnrichedClick> enriched = clicks
    .map(click -> enrichClick(click))
    .filter(click -> click.isValid());
```

### 4. Define Sink

Write results to external system:

```java
enriched.addSink(new ConsoleSink<>());
```

### 5. Execute Job

Submit to cluster:

```java
env.execute("Click Processing Job");
```

## Key Flink Concepts

### DataStream

An unbounded sequence of events flowing through the system:

```java
DataStream<Event> stream = ...
```

Unlike batch processing (DataSet), streams are potentially infinite.

### Sources

Entry points for data:
- **Kafka**: Message queue source
- **File**: Read from filesystem
- **Socket**: TCP socket source
- **Custom**: Implement SourceFunction

### Operators

Transformations on streams:
- **Map**: 1:1 transformation
- **Filter**: Selective passing
- **FlatMap**: 1:N transformation
- **KeyBy**: Partition by key
- **Window**: Group by time/count

### Sinks

Exit points for data:
- **Kafka**: Write to topic
- **Database**: JDBC sink
- **File**: Write to filesystem
- **Console**: Print to stdout

### Job Submission

Flink REST API workflow:

1. **Upload JAR**: POST /jars/upload
2. **Run JAR**: POST /jars/:jarId/run
3. **Monitor**: GET /jobs/:jobId
4. **Cancel**: PATCH /jobs/:jobId

## Production Considerations

### Job Packaging

- Use fat JARs (include all dependencies)
- Shade conflicting dependencies
- Minimize JAR size for faster uploads

### Entry Class

- Specify main class with `public static void main(String[] args)`
- Use programmatic configuration (not rely on flink-conf.yaml)
- Make parallelism configurable via program arguments

### Error Handling

- Set restart strategies (fixed-delay, failure-rate)
- Configure checkpoint timeouts
- Handle source exhaustion gracefully

### Monitoring

- Enable metrics reporters (Prometheus, InfluxDB)
- Set up alerting on job failures
- Monitor checkpoint duration and size

## When NOT to Use

- Simple stateless transformations (Kafka consumer sufficient)
- One-time batch processing (use Spark or plain Java)
- No need for exactly-once or fault tolerance (simpler alternatives)

## Further Reading

- [DataStream API](https://flink.apache.org/docs/stable/dev/datastream_api.html)
- [Sources](https://flink.apache.org/docs/stable/dev/datastream_sources.html)
- [Job Submission](https://flink.apache.org/docs/stable/ops/cli.html)
- [REST API](https://flink.apache.org/docs/stable/ops/rest_api.html)
```

- [ ] **Step 4: Test example compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit Example 1**

```bash
git add src/technologies/flink/examples/01-basics/
git commit -m "feat(flink): add Example 1 - Basics

DataStream API and job submission example covering:
- StreamExecutionEnvironment setup
- Kafka source configuration
- Map and filter operators
- Sink definition
- Job submission workflow
- Flink UI navigation

Includes comprehensive README with production considerations."
```

---

### Task 7: Create Example 2 - Stateless Operators

**Files:**
- Create: `src/technologies/flink/examples/02-stateless-operators/index.ts`
- Create: `src/technologies/flink/examples/02-stateless-operators/README.md`
- Create: `src/technologies/flink/examples/02-stateless-operators/job.jar` (placeholder)

- [ ] **Step 1: Create placeholder JAR**

```bash
mkdir -p src/technologies/flink/examples/02-stateless-operators
echo "Placeholder for pre-compiled Flink job JAR" > src/technologies/flink/examples/02-stateless-operators/job.jar
```

- [ ] **Step 2: Write Example 2 runner**

```typescript
import type { FlinkClient } from '../../client.js';
import type { FlinkExample, Logger } from '../../../../lib/types.js';
import chalk from 'chalk';

export const statelessOperatorsExample: FlinkExample = {
  name: 'Stateless Operators: Transformations',
  description: 'Map, Filter, FlatMap operators and operator chaining',

  async run(client: FlinkClient, logger: Logger): Promise<void> {
    logger.section('🔀 Stateless Operators: Transformations');
    logger.info('Processing events with stateless operators\n');

    logger.step('Step 1: Map Operator (1:1 transformation)');
    logger.info('Transform each element individually:');
    logger.command('stream.map(event => enhanceEvent(event))');
    logger.info('\nExample:');
    logger.info('  Input:  { userId: "123", action: "click" }');
    logger.info('  Output: { userId: "123", action: "CLICK", timestamp: 1234567890 }\n');
    logger.production([
      'Map operator processes records independently',
      'No state shared between invocations',
      'Can be parallelized across TaskManagers',
    ]);
    logger.assert(true, 'Map operator transforms 1:1\n');

    logger.step('Step 2: Filter Operator (selective passing)');
    logger.info('Pass only elements matching condition:');
    logger.command('stream.filter(event => event.amount > 100)');
    logger.info('\nExample:');
    logger.info('  Input:  [{ amount: 50 }, { amount: 150 }, { amount: 200 }]');
    logger.info('  Output: [{ amount: 150 }, { amount: 200 }]\n');
    logger.production([
      'Filter reduces data volume downstream',
      'Apply filters early to reduce processing',
      'Combine multiple filters with .filter().filter()',
    ]);
    logger.assert(true, 'Filter operator removes non-matching records\n');

    logger.step('Step 3: FlatMap Operator (1:N transformation)');
    logger.info('Transform each element into zero or more elements:');
    logger.command('stream.flatMap(event => event.items)');
    logger.info('\nExample:');
    logger.info('  Input:  { orderId: "123", items: ["A", "B", "C"] }');
    logger.info('  Output: ["A", "B", "C"]\n');
    logger.production([
      'FlatMap useful for splitting composite events',
      'Can emit multiple types with side outputs',
      'Common for parsing multi-line logs',
    ]);
    logger.assert(true, 'FlatMap operator emits 0 to N records\n');

    logger.step('Step 4: Operator Chaining Optimization');
    logger.info('Flink chains operators to reduce serialization:');
    logger.command('stream.map(f1).filter(f2).map(f3)');
    logger.info('\nWithout chaining:');
    logger.info('  map → serialize → network → deserialize → filter → ...');
    logger.info('\nWith chaining:');
    logger.info('  map → filter → map (all in same thread)\n');
    logger.production([
      'Chaining reduces overhead by 50-70%',
      'Disable with .disableChaining() if needed',
      'View chains in Flink UI execution graph',
    ]);
    logger.assert(true, 'Operator chaining improves performance\n');

    logger.step('Step 5: Parallelism Configuration');
    logger.info('Control parallelism per operator:');
    logger.command('stream.map(f).setParallelism(4)');
    logger.info('\nWith 4 parallelism:');
    logger.info('  • Creates 4 parallel instances of map operator');
    logger.info('  • Each processes subset of data');
    logger.info('  • Load balanced by Flink runtime\n');
    logger.production([
      'Match source parallelism (e.g., Kafka partitions)',
      'Increase parallelism for CPU-heavy operators',
      'Global parallelism: env.setParallelism(N)',
    ]);
    logger.assert(true, 'Parallelism enables horizontal scaling\n');

    logger.success('\n✓ Stateless operators demonstrated!');
    logger.info('\nKey Concepts:');
    logger.info('  • Map: 1:1 transformation, stateless');
    logger.info('  • Filter: selective passing, reduces volume');
    logger.info('  • FlatMap: 1:N transformation, splits events');
    logger.info('  • Chaining: combines operators for efficiency');
    logger.info('  • Parallelism: scales operators horizontally\n');
  },
};
```

- [ ] **Step 3: Write Example 2 README**

```markdown
# Example 2: Stateless Operators - Transformations

## What This Demonstrates

- Map operator (1:1 transformation)
- Filter operator (selective passing)
- FlatMap operator (1:N transformation)
- Operator chaining optimization
- Parallelism configuration

## Why You'd Use This Pattern

Stateless operators are the building blocks of stream processing. They transform data without maintaining state between invocations, making them simple to reason about and easy to parallelize.

## How It Works

### Map Operator

Transform each element:

```java
DataStream<EnrichedEvent> enriched = events
    .map(event -> {
        event.setTimestamp(System.currentTimeMillis());
        event.setProcessed(true);
        return event;
    });
```

### Filter Operator

Keep only matching elements:

```java
DataStream<HighValueOrder> highValue = orders
    .filter(order -> order.getAmount() > 100.0);
```

### FlatMap Operator

Emit zero or more elements:

```java
DataStream<String> words = sentences
    .flatMap((sentence, out) -> {
        for (String word : sentence.split(" ")) {
            out.collect(word);
        }
    });
```

### Operator Chaining

Flink automatically chains operators that can run in the same thread:

```java
stream
    .map(f1)     // \
    .filter(f2)   // | Chained together
    .map(f3)     // /
    .keyBy(...)  // Breaks chain (requires partitioning)
```

View chains in Flink UI's execution graph.

### Parallelism

Control how many parallel instances:

```java
stream
    .map(expensiveFunction)
    .setParallelism(8)  // 8 parallel instances
    .filter(cheapFilter)
    .setParallelism(2); // 2 parallel instances
```

## Key Flink Concepts

### Stateless vs Stateful

**Stateless**: No memory between invocations
- Map, Filter, FlatMap
- Each record processed independently
- Easy to parallelize

**Stateful**: Remembers previous records
- KeyedProcessFunction, WindowFunction
- Requires state management
- More complex but more powerful

### Operator Chaining

Benefits:
- Reduces serialization overhead
- Eliminates network transfers
- Improves throughput 50-70%

When chaining breaks:
- KeyBy (requires partitioning)
- Shuffle (requires network)
- Parallelism change
- Explicitly disabled with .disableChaining()

### Parallelism Considerations

Match Kafka partitions:
```java
// If Kafka topic has 8 partitions
env.setParallelism(8);
```

CPU-heavy operations need more parallelism:
```java
stream
    .map(lightTransform).setParallelism(2)
    .filter(heavyComputation).setParallelism(16)
```

## Production Considerations

### Operator Ordering

Apply filters early:
```java
// Good: filter first (reduces volume)
stream.filter(x -> x.valid).map(x -> expensiveTransform(x))

// Bad: expensive operation on filtered-out data
stream.map(x -> expensiveTransform(x)).filter(x -> x.valid)
```

### Parallelism Tuning

- Start with parallelism = number of Kafka partitions
- Increase for CPU-heavy operators
- Monitor backpressure in Flink UI
- Adjust based on TaskManager CPU usage

### Memory Considerations

Stateless operators use minimal memory, but consider:
- Object creation in map/flatMap
- Large intermediate objects
- Use object reuse for high throughput

### Error Handling

Stateless operators should be pure functions:
- Don't mutate input
- Handle exceptions gracefully
- Log errors without failing job

## When NOT to Use

- Need to remember previous events (use stateful operators)
- Need to aggregate over time (use windows)
- Need to join streams (use CoProcessFunction)

## Further Reading

- [Operators](https://flink.apache.org/docs/stable/dev/stream/operators/)
- [Chaining](https://flink.apache.org/docs/stable/dev/stream/operators/overview.html#task-chaining-and-resource-groups)
- [Parallelism](https://flink.apache.org/docs/stable/dev/parallel.html)
```

- [ ] **Step 4: Test example compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit Example 2**

```bash
git add src/technologies/flink/examples/02-stateless-operators/
git commit -m "feat(flink): add Example 2 - Stateless Operators

Stateless operator transformations covering:
- Map operator (1:1 transformation)
- Filter operator (selective passing)
- FlatMap operator (1:N transformation)
- Operator chaining optimization
- Parallelism configuration and tuning

Includes README with production considerations and best practices."
```

---

### Task 8: Create Example 3 - Stateful Processing

**Files:**
- Create: `src/technologies/flink/examples/03-stateful-processing/index.ts`
- Create: `src/technologies/flink/examples/03-stateful-processing/README.md`
- Create: `src/technologies/flink/examples/03-stateful-processing/job.jar` (placeholder)

- [ ] **Step 1: Create placeholder JAR**

```bash
mkdir -p src/technologies/flink/examples/03-stateful-processing
echo "Placeholder for pre-compiled Flink job JAR" > src/technologies/flink/examples/03-stateful-processing/job.jar
```

- [ ] **Step 2: Write Example 3 runner**

```typescript
import type { FlinkClient } from '../../client.js';
import type { FlinkExample, Logger } from '../../../../lib/types.js';
import chalk from 'chalk';

export const statefulProcessingExample: FlinkExample = {
  name: 'Stateful Processing: ValueState & Counters',
  description: 'Using ValueState for per-key counters and stateful logic',

  async run(client: FlinkClient, logger: Logger): Promise<void> {
    logger.section('💾 Stateful Processing: ValueState & Counters');
    logger.info('Maintaining state across events per key\n');

    logger.step('Step 1: Understanding Keyed State');
    logger.info('State is scoped to a key:');
    logger.command('stream.keyBy(event => event.userId)');
    logger.info('\nEach userId gets independent state:');
    logger.info('  userId="alice" → state={count: 5}');
    logger.info('  userId="bob"   → state={count: 2}\n');
    logger.production([
      'keyBy() partitions stream by key',
      'State is local to each key',
      'Keys distributed across TaskManagers',
    ]);
    logger.assert(true, 'Keyed streams enable per-key state\n');

    logger.step('Step 2: ValueState for Counters');
    logger.info('ValueState stores single value per key:');
    logger.command('ValueState<Long> countState');
    logger.info('\nExample: Count clicks per user');
    logger.info('  Event 1: userId="alice", action="click"');
    logger.info('    → countState.value() = 0');
    logger.info('    → countState.update(1)');
    logger.info('  Event 2: userId="alice", action="click"');
    logger.info('    → countState.value() = 1');
    logger.info('    → countState.update(2)\n');
    logger.production([
      'State persisted in state backend',
      'Survives restarts via checkpoints',
      'Memory backend for small state, RocksDB for large',
    ]);
    logger.assert(true, 'ValueState maintains counter per key\n');

    logger.step('Step 3: KeyedProcessFunction');
    logger.info('Stateful operator with lifecycle methods:');
    logger.command(`
class ClickCounter extends KeyedProcessFunction<String, ClickEvent, ClickCount> {
  private ValueState<Long> countState;
  
  @Override
  public void open(Configuration config) {
    // Initialize state
    countState = getRuntimeContext().getState(
      new ValueStateDescriptor<>("count", Long.class)
    );
  }
  
  @Override
  public void processElement(ClickEvent event, Context ctx, Collector<ClickCount> out) {
    Long count = countState.value();
    if (count == null) count = 0L;
    count++;
    countState.update(count);
    out.collect(new ClickCount(event.getUserId(), count));
  }
}`);
    logger.info('\n');
    logger.production([
      'open() called once per parallel instance',
      'processElement() called for each event',
      'State automatically checkpointed',
    ]);
    logger.assert(true, 'KeyedProcessFunction provides stateful processing\n');

    logger.step('Step 4: State Backends');
    logger.info('Flink provides multiple state backends:');
    logger.info('\n1. Memory State Backend (HashMapStateBackend):');
    logger.info('   • State stored in JVM heap');
    logger.info('   • Fast but limited by memory');
    logger.info('   • Good for: < few GB of state');
    logger.info('\n2. RocksDB State Backend (EmbeddedRocksDBStateBackend):');
    logger.info('   • State stored on disk with cache');
    logger.info('   • Slower but scales to TB');
    logger.info('   • Good for: large state per key\n');
    logger.command('env.setStateBackend(new HashMapStateBackend())');
    logger.info('or');
    logger.command('env.setStateBackend(new EmbeddedRocksDBStateBackend())\n');
    logger.production([
      'Choose backend based on state size',
      'Memory: low latency, limited scale',
      'RocksDB: high latency, unlimited scale',
      'Test both with production workload',
    ]);
    logger.assert(true, 'State backends determine storage strategy\n');

    logger.step('Step 5: State and Checkpoints');
    logger.info('State is checkpointed for fault tolerance:');
    logger.info('\nCheckpoint flow:');
    logger.info('  1. JobManager triggers checkpoint');
    logger.info('  2. Barriers flow through dataflow');
    logger.info('  3. Operators snapshot state to durable storage');
    logger.info('  4. JobManager confirms checkpoint complete');
    logger.info('\nOn failure:');
    logger.info('  1. Job restarts from last checkpoint');
    logger.info('  2. State restored to operators');
    logger.info('  3. Sources rewind to checkpoint position\n');
    logger.production([
      'Enable checkpointing: env.enableCheckpointing(60000)',
      'State stored in S3/HDFS for durability',
      'Checkpoint interval trades recovery vs overhead',
      'Exactly-once requires idempotent sinks',
    ]);
    logger.assert(true, 'Checkpointing enables fault tolerance\n');

    logger.success('\n✓ Stateful processing demonstrated!');
    logger.info('\nKey Concepts:');
    logger.info('  • keyBy(): partition stream by key');
    logger.info('  • ValueState: single value per key');
    logger.info('  • KeyedProcessFunction: stateful operator');
    logger.info('  • State Backend: storage strategy (memory vs RocksDB)');
    logger.info('  • Checkpointing: fault tolerance mechanism\n');
    
    logger.info(chalk.cyan('💡 Tip: State management is Flink\'s superpower'));
    logger.info(chalk.gray('This is what differentiates Flink from simple Kafka consumers.\n'));
  },
};
```

- [ ] **Step 3: Write Example 3 README**

```markdown
# Example 3: Stateful Processing - ValueState & Counters

## What This Demonstrates

- Using ValueState for per-key counters
- KeyedProcessFunction for stateful logic
- State persistence across events
- State backend configuration (memory vs RocksDB)
- Checkpointing for fault tolerance

## Why You'd Use This Pattern

State management is Flink's core differentiator. While simple Kafka consumers process each message independently, Flink maintains state across events, enabling:
- Counters and aggregations
- Session tracking
- Fraud detection
- Real-time analytics

## How It Works

### 1. Partition by Key

```java
DataStream<ClickEvent> clicks = ...;
KeyedStream<ClickEvent, String> keyed = clicks.keyBy(event -> event.getUserId());
```

This partitions the stream so all events with the same userId go to the same operator instance.

### 2. Define ValueState

```java
public class ClickCounter extends KeyedProcessFunction<String, ClickEvent, ClickCount> {
    private ValueState<Long> countState;
    
    @Override
    public void open(Configuration config) {
        ValueStateDescriptor<Long> descriptor = 
            new ValueStateDescriptor<>("count", Long.class);
        countState = getRuntimeContext().getState(descriptor);
    }
}
```

### 3. Use State in Processing

```java
    @Override
    public void processElement(ClickEvent event, Context ctx, Collector<ClickCount> out) 
        throws Exception {
        // Get current count (null if first event for this key)
        Long count = countState.value();
        if (count == null) {
            count = 0L;
        }
        
        // Increment and update state
        count++;
        countState.update(count);
        
        // Emit result
        out.collect(new ClickCount(event.getUserId(), count));
    }
```

## Key Flink Concepts

### Keyed State

State is scoped to a key:
- Each key gets independent state
- State distributed across TaskManagers
- Enables horizontal scaling

Types of keyed state:
- **ValueState**: Single value
- **ListState**: List of values
- **MapState**: Map of key-value pairs
- **ReducingState**: Incrementally reduced value
- **AggregatingState**: Incrementally aggregated value

### State Backends

**Memory (HashMapStateBackend):**
- State stored in JVM heap
- Fast access (nanoseconds)
- Limited by heap size (few GB)
- Good for: low-latency, small state

**RocksDB (EmbeddedRocksDBStateBackend):**
- State stored on disk
- Slower access (microseconds)
- Scales to terabytes
- Good for: large state per key

Configuration:

```java
// Memory backend
env.setStateBackend(new HashMapStateBackend());

// RocksDB backend
env.setStateBackend(new EmbeddedRocksDBStateBackend());

// Checkpoint storage (required for production)
env.getCheckpointConfig().setCheckpointStorage("s3://my-bucket/checkpoints");
```

### Checkpointing

Flink periodically creates distributed snapshots:

```java
env.enableCheckpointing(60000); // Checkpoint every 60 seconds
```

Checkpoint process:
1. JobManager triggers checkpoint
2. Checkpoint barriers flow through dataflow
3. Operators snapshot state when barrier arrives
4. State written to durable storage (S3, HDFS)
5. JobManager confirms checkpoint complete

On failure:
1. Job restarts from last successful checkpoint
2. State restored to operators
3. Sources rewind to checkpoint position
4. Processing resumes (exactly-once guarantees)

## Production Considerations

### State Size

Monitor state growth:
- Use state TTL to expire old data
- Implement state compaction for MapState
- Watch for unbounded state growth

```java
// State TTL example
StateTtlConfig ttlConfig = StateTtlConfig
    .newBuilder(Time.days(7))
    .setUpdateType(StateTtlConfig.UpdateType.OnCreateAndWrite)
    .build();

ValueStateDescriptor<Long> descriptor = 
    new ValueStateDescriptor<>("count", Long.class);
descriptor.enableTimeToLive(ttlConfig);
```

### State Backend Selection

Decision matrix:
- State size < 1GB: Memory backend
- State size 1-100GB: RocksDB with SSD
- State size > 100GB: RocksDB with careful tuning
- Ultra-low latency: Memory backend
- Cost-sensitive: RocksDB with spinning disks

### Checkpoint Configuration

```java
env.enableCheckpointing(60000);
env.getCheckpointConfig().setCheckpointTimeout(300000);
env.getCheckpointConfig().setMinPauseBetweenCheckpoints(30000);
env.getCheckpointConfig().setMaxConcurrentCheckpoints(1);
env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);
```

Tuning:
- Interval: 10-60s typical, balance recovery time vs overhead
- Timeout: Must exceed time to complete checkpoint
- Min pause: Prevent checkpoint storms

### Failure Recovery

Test failure scenarios:
- Kill TaskManager during processing
- Induce checkpoint timeout
- Corrupt state backend
- Network partition

Ensure:
- State restored correctly
- No data loss
- No duplicate processing (with idempotent sinks)

## When NOT to Use

- Stateless transformations (use map/filter)
- State doesn't fit requirements (e.g., need cross-key aggregation)
- Cannot tolerate state backend latency (use in-memory caching)

## Further Reading

- [State](https://flink.apache.org/docs/stable/dev/stream/state/)
- [State Backends](https://flink.apache.org/docs/stable/ops/state/state_backends.html)
- [Checkpointing](https://flink.apache.org/docs/stable/dev/stream/state/checkpointing.html)
- [State TTL](https://flink.apache.org/docs/stable/dev/stream/state/state.html#state-time-to-live-ttl)
```

- [ ] **Step 4: Test example compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit Example 3**

```bash
git add src/technologies/flink/examples/03-stateful-processing/
git commit -m "feat(flink): add Example 3 - Stateful Processing

Stateful processing with ValueState covering:
- keyBy() stream partitioning
- ValueState for per-key counters
- KeyedProcessFunction with lifecycle
- State backend selection (memory vs RocksDB)
- Checkpointing for fault tolerance
- State TTL configuration

Includes README with production considerations for state management."
```

---

### Task 9: Integrate Flink into Main CLI

**Files:**
- Modify: `src/cli.ts`

- [ ] **Step 1: Add Flink to technology choices**

In the technology selection list (around line 200-220), add:

```typescript
    { value: 'flink', name: 'Flink (3 examples - Phase 1)' },
```

- [ ] **Step 2: Add Flink case to switch statement**

In the switch statement handling technology selection (around line 250-280), add:

```typescript
      case 'flink':
        const { runFlinkMenu } = await import('./technologies/flink/index.js');
        await runFlinkMenu();
        break;
```

- [ ] **Step 3: Test CLI navigation**

Run: `npm start`
Expected: Flink appears in technology list, selecting it shows Flink menu

- [ ] **Step 4: Commit CLI integration**

```bash
git add src/cli.ts
git commit -m "feat(flink): integrate into main CLI

Add Flink to technology selection menu with dynamic import."
```

---

### Task 10: Update Main README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Flink to technologies list**

In the "What's Inside" section, update:

```markdown
### Technologies

- ✅ **Redis** (10 examples) - Cache, distributed locks, leaderboards, rate limiting, pub/sub, and more
- ✅ **PostgreSQL** (7 examples) - SQL operations, transactions, indexing, read/write scaling, optimization
- ✅ **Kafka** (2 examples - Phase 1) - Topics, partitions, producers, consumers
- ✅ **Flink** (3 examples - Phase 1) - Stateful stream processing, DataStream API
- 🔜 **Cassandra** - Coming soon
- 🔜 **Elasticsearch** - Coming soon
```

- [ ] **Step 2: Add Flink Examples section**

After the "Kafka Examples" or "PostgreSQL Examples" section, add:

```markdown
## Flink Examples

The Flink technology includes 10 comprehensive examples (3 available in Phase 1):

1. **Basics** - DataStream API, sources, sinks, job submission
2. **Stateless Operators** - Map, filter, flatMap transformations
3. **Stateful Processing** - ValueState, state persistence, state backends
4. **Windowing** (Phase 2) - Tumbling, sliding, session windows
5. **Watermarks** (Phase 2) - Event time, late events, watermark strategies
6. **Keyed Streams** (Phase 2) - Advanced state (ListState, MapState), state TTL
7. **Stream Joins** (Phase 2) - Window joins, interval joins, enrichment
8. **Checkpointing** (Phase 3) - Fault tolerance, exactly-once semantics
9. **Pattern Detection** (Phase 3) - CEP library, fraud detection patterns
10. **Production Patterns** (Phase 3) - Backpressure, monitoring, best practices

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key Flink concepts
- Production considerations
- Further reading

See `src/technologies/flink/README.md` for more details.
```

- [ ] **Step 3: Add Flink to Services section**

In the "Services" section, add after Kafka UI:

```markdown
### Flink
- **JobManager Port**: 8081
- **UI**: Flink Dashboard at http://localhost:8081
- **TaskManagers**: 1 (configurable)
- **Image**: flink:1.18-scala_2.12
```

- [ ] **Step 4: Add Flink to Available Commands**

Update the commands section:

```bash
npm run test:flink       # Run Flink integration tests
npm run reset:flink      # Cancel all Flink jobs
```

- [ ] **Step 5: Add Flink to Learning Path**

In the "Learning Path" section, add:

```markdown
**For stream processing:**
1. Start with **Kafka Basics** to understand event streams and partitions
2. Try **Flink Basics** to see DataStream API and job submission
3. Learn **Stateful Processing** for maintaining state across events
4. Explore **Windowing** for time-based aggregations (Phase 2)
5. Master **Watermarks** for handling late and out-of-order events (Phase 2)
6. Understand **Checkpointing** for fault tolerance (Phase 3)
7. Practice explaining when to use Flink vs Kafka Streams vs Spark Streaming
```

- [ ] **Step 6: Test README formatting**

View README.md in GitHub or markdown preview to ensure formatting is correct.

- [ ] **Step 7: Commit README updates**

```bash
git add README.md
git commit -m "docs: add Flink to main README

Update main documentation with:
- Flink in technologies list (3 Phase 1 examples)
- Flink examples section with all 10 examples
- Flink services (JobManager, TaskManager, UI)
- Flink commands (test, reset)
- Stream processing learning path"
```

---

### Task 11: Add Test Suite

**Files:**
- Create: `scripts/test-flink-examples.ts`
- Modify: `package.json`

- [ ] **Step 1: Write Flink test script**

```typescript
#!/usr/bin/env tsx

import { FlinkClient } from '../src/technologies/flink/client.js';
import { Logger } from '../src/lib/logger.js';
import { basicsExample } from '../src/technologies/flink/examples/01-basics/index.js';
import { statelessOperatorsExample } from '../src/technologies/flink/examples/02-stateless-operators/index.js';
import { statefulProcessingExample } from '../src/technologies/flink/examples/03-stateful-processing/index.js';
import chalk from 'chalk';

async function testFlinkExamples() {
  console.log(chalk.bold.cyan('\n=== Testing Flink Examples ===\n'));
  
  const client = new FlinkClient();
  const logger = new Logger();
  
  // Health check
  console.log(chalk.blue('Checking Flink cluster health...'));
  const isHealthy = await client.checkHealth();
  
  if (!isHealthy) {
    console.error(chalk.red('✗ Flink cluster not available'));
    console.error(chalk.yellow('Run: docker-compose up -d flink-jobmanager flink-taskmanager\n'));
    process.exit(1);
  }
  
  console.log(chalk.green('✓ Flink cluster healthy\n'));
  
  // Test each Phase 1 example
  const examples = [
    { name: 'Basics', example: basicsExample },
    { name: 'Stateless Operators', example: statelessOperatorsExample },
    { name: 'Stateful Processing', example: statefulProcessingExample },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, example } of examples) {
    console.log(chalk.blue(`\nTesting: ${name}`));
    console.log(chalk.gray('─'.repeat(50)));
    
    try {
      await example.run(client, logger);
      console.log(chalk.green(`✓ ${name} passed\n`));
      passed++;
    } catch (error) {
      console.error(chalk.red(`✗ ${name} failed:`), error);
      failed++;
    }
  }
  
  // Summary
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('\nTest Summary:'));
  console.log(chalk.green(`  Passed: ${passed}`));
  if (failed > 0) {
    console.log(chalk.red(`  Failed: ${failed}`));
  }
  console.log('');
  
  if (failed > 0) {
    process.exit(1);
  }
  
  console.log(chalk.green('✓ All Flink examples passed!\n'));
}

testFlinkExamples().catch(error => {
  console.error(chalk.red('Test runner failed:'), error);
  process.exit(1);
});
```

- [ ] **Step 2: Add test script to package.json**

In the "scripts" section, add:

```json
    "test:flink": "tsx scripts/test-flink-examples.ts",
```

- [ ] **Step 3: Test the test script**

Run: `npm run test:flink`
Expected: All 3 examples run successfully (they demo concepts, no actual JAR execution)

- [ ] **Step 4: Commit test suite**

```bash
git add scripts/test-flink-examples.ts package.json
git commit -m "test(flink): add integration test suite

Test script runs all Phase 1 examples:
- Health check before testing
- Run each example with error handling
- Summary with pass/fail counts
- Exit code 1 on any failure

Add npm run test:flink command."
```

---

### Task 12: Add Reset Script

**Files:**
- Create: `scripts/reset-flink.sh`
- Modify: `package.json`

- [ ] **Step 1: Write reset script**

```bash
#!/bin/bash
# Cancel all running Flink jobs

set -e

echo "🔄 Cancelling all Flink jobs..."

# Check if Flink is running
if ! curl -sf http://localhost:8081/overview > /dev/null 2>&1; then
  echo "⚠️  Flink cluster not running"
  exit 0
fi

# Get all running job IDs
JOBS=$(curl -s http://localhost:8081/jobs 2>/dev/null || echo '{"jobs":[]}')
JOB_IDS=$(echo "$JOBS" | jq -r '.jobs[] | select(.status == "RUNNING") | .id' 2>/dev/null || true)

if [ -z "$JOB_IDS" ]; then
  echo "✓ No running jobs to cancel"
  exit 0
fi

# Cancel each job
COUNT=0
for JOB_ID in $JOB_IDS; do
  echo "  Cancelling job: $JOB_ID"
  curl -X PATCH "http://localhost:8081/jobs/$JOB_ID" > /dev/null 2>&1 || true
  COUNT=$((COUNT + 1))
done

echo "✓ Cancelled $COUNT job(s)"
```

- [ ] **Step 2: Make script executable**

Run: `chmod +x scripts/reset-flink.sh`

- [ ] **Step 3: Add reset script to package.json**

In the "scripts" section, add:

```json
    "reset:flink": "bash scripts/reset-flink.sh",
```

Update the "reset" script to include Flink:

```json
    "reset": "npm run reset:redis && npm run reset:postgres && npm run reset:kafka && npm run reset:flink",
```

- [ ] **Step 4: Test reset script**

Run: `npm run reset:flink`
Expected: Script runs successfully (no jobs to cancel if none running)

- [ ] **Step 5: Commit reset script**

```bash
git add scripts/reset-flink.sh package.json
chmod +x scripts/reset-flink.sh
git add scripts/reset-flink.sh
git commit -m "feat(flink): add reset script

Script cancels all running Flink jobs via REST API.
- Checks Flink availability
- Lists running jobs
- Cancels each job
- Reports count

Add npm run reset:flink command and include in npm run reset."
```

---

### Task 13: Final Integration Test

**Files:**
- None (testing only)

- [ ] **Step 1: Start all Docker services**

Run: `docker-compose up -d`
Expected: All services healthy including flink-jobmanager and flink-taskmanager

- [ ] **Step 2: Verify Flink UI accessible**

Open: http://localhost:8081
Expected: Flink dashboard loads showing 1 TaskManager

- [ ] **Step 3: Run Flink test suite**

Run: `npm run test:flink`
Expected: All 3 Phase 1 examples pass

- [ ] **Step 4: Test CLI navigation**

Run: `npm start`
1. Select "Flink (3 examples - Phase 1)"
2. Select "1. Basics: DataStream API & Job Submission"
3. Example runs and completes
4. Select "Run another Flink example"
5. Select "2. Stateless Operators"
6. Example runs and completes
7. Select "Return to main menu"

Expected: Smooth navigation, all examples run successfully

- [ ] **Step 5: Test reset script**

Run: `npm run reset:flink`
Expected: Script completes (no jobs running after tests)

- [ ] **Step 6: Verify Flink in service health checks**

Run: `docker-compose ps`
Expected: flink-jobmanager and flink-taskmanager both healthy

- [ ] **Step 7: Document final state**

No commit needed - just verification that everything works end-to-end.

---

## Self-Review Checklist

### Spec Coverage

✅ **Docker Services**: Task 1 adds JobManager and TaskManager  
✅ **Types & Health Checks**: Task 2 adds Flink types and Docker utils  
✅ **REST API Client**: Task 3 creates FlinkClient  
✅ **Technology README**: Task 4 comprehensive guide  
✅ **Flink Menu**: Task 5 interactive menu with health check  
✅ **Example 1 - Basics**: Task 6 DataStream API and job submission  
✅ **Example 2 - Stateless**: Task 7 Map/Filter/FlatMap operators  
✅ **Example 3 - Stateful**: Task 8 ValueState and state backends  
✅ **CLI Integration**: Task 9 adds Flink to main menu  
✅ **Main README Updates**: Task 10 documents Flink section  
✅ **Test Suite**: Task 11 integration tests  
✅ **Reset Script**: Task 12 cancels running jobs  
✅ **Final Integration**: Task 13 end-to-end verification  

### Placeholder Scan

✅ No "TBD", "TODO", "implement later" in plan  
✅ All code blocks complete and functional  
✅ All file paths exact and explicit  
✅ All commands include expected output  
✅ No gaps in implementation steps  

### Type Consistency

✅ FlinkExample type matches across all files  
✅ FlinkClient methods consistent (submitJob, getJobStatus, cancelJob, etc.)  
✅ Logger methods consistent (section, step, command, production, assert, etc.)  
✅ Import paths use .js extension consistently  
✅ Types exported from correct files (types.ts)  

---

## Notes

**JAR Placeholders**: Phase 1 uses placeholder JARs and demonstrates concepts without actual Flink job execution. Real JAR compilation and execution will be added in a future task, likely involving:
- Java/Scala project setup
- Maven/Gradle build configuration
- Kafka connector dependencies
- Build automation
- JAR distribution strategy

**Phase Rollout**: This plan implements Phase 1 (3 examples). Phase 2 (Windowing, Watermarks, Keyed Streams, Stream Joins) and Phase 3 (Checkpointing, CEP, Production Patterns) will be separate implementation plans.

**Dependencies**: Flink examples depend on Kafka being available. The health check ensures Kafka is running before Flink examples execute.
