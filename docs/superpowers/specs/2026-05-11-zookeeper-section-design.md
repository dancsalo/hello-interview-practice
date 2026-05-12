# ZooKeeper Technology Section Design

**Date:** 2026-05-11  
**Status:** Approved  
**Context:** Adding ZooKeeper as the fourth technology in the system design interview prep platform, alongside Redis, PostgreSQL, and Kafka.

## Overview

Create a comprehensive ZooKeeper technology section with 8 examples (7 hands-on + 1 conceptual) following the established pattern of Redis, PostgreSQL, and Kafka sections. The section will teach distributed coordination patterns through practical examples while maintaining a balanced approach: covering fundamental concepts that apply to modern alternatives (etcd, Consul) while being clear about when ZooKeeper still makes sense and when alternatives are better.

## Goals

1. **Educational Depth:** Provide 8 examples covering ZooKeeper's core capabilities with hands-on demonstrations
2. **Pattern Transfer:** Teach coordination patterns that apply to etcd, Consul, and cloud-native solutions
3. **Practical Guidance:** Include clear guidance on when to use ZooKeeper vs alternatives
4. **Interview Readiness:** Prepare students for distributed systems questions in system design interviews
5. **Consistency:** Match the quality and structure of existing Redis/PostgreSQL/Kafka sections

## Source Material

The design is based on `/Users/dsalo/Repos/hello-interview-practice/key_technologies/zookeeper/original.md`, which provides comprehensive coverage of ZooKeeper concepts, use cases, and trade-offs.

## Architecture

### Directory Structure

```
src/technologies/zookeeper/
├── README.md              # Technology guide (similar to Redis/Kafka READMEs)
├── client.ts              # ZooKeeper client wrapper with connection management
└── examples/
    ├── 01-basics/
    │   ├── index.ts
    │   └── README.md
    ├── 02-watches/
    │   ├── index.ts
    │   └── README.md
    ├── 03-config-management/
    │   ├── index.ts
    │   └── README.md
    ├── 04-service-discovery/
    │   ├── index.ts
    │   └── README.md
    ├── 05-leader-election/
    │   ├── index.ts
    │   └── README.md
    ├── 06-distributed-locks/
    │   ├── index.ts
    │   └── README.md
    ├── 07-session-management/
    │   ├── index.ts
    │   └── README.md
    └── 08-ensemble-consensus/
        ├── index.ts         # Conceptual demonstration with documentation
        └── README.md        # Detailed explanation of ZAB protocol
```

### Integration Points

1. **CLI Integration:** Add ZooKeeper to `src/cli.ts` menu
2. **Docker:** ZooKeeper service already exists in `docker-compose.yml` (port 2181)
3. **Scripts:** Create `scripts/reset-zookeeper.ts` and `scripts/test-zookeeper-examples.ts`
4. **Documentation:** Update main `README.md` to list ZooKeeper as available
5. **Package Dependencies:** Add `node-zookeeper-client` npm package

## Example Breakdown

### 1. Basics - ZNode Fundamentals

**What it demonstrates:**
- ZooKeeper's hierarchical data model (similar to filesystem)
- Three ZNode types: persistent, ephemeral, sequential
- Basic CRUD operations: create, getData, setData, delete
- Hierarchy navigation with getChildren

**Key concepts:**
- ZNodes can store small data (< 1MB) and have metadata
- Persistent nodes exist until explicitly deleted
- Ephemeral nodes auto-delete when session ends
- Sequential nodes append monotonically increasing counter

**Scenario:** Building a simple namespace for a chat application with config and server registration

**Learning goals:**
- Understand ZooKeeper's data model
- Know when to use each node type
- Grasp that ZooKeeper is for coordination data, not bulk storage

**Production considerations:**
- Keep ZNode data small (< 1MB limit, typically < 1KB)
- Design path hierarchy carefully (affects organization and watches)
- Use appropriate node types for use case

### 2. Watches - Change Notifications

**What it demonstrates:**
- Setting watches on nodes for change notifications
- Watch types: data watches, child watches, existence watches
- One-time trigger behavior and re-registration
- Local caching pattern with watch-based updates

**Key concepts:**
- Watches eliminate polling
- One-time trigger limitation (must re-register after firing)
- Enables reactive coordination
- Watch notifications are ordered

**Scenario:** Multiple servers watching for configuration changes and user location updates in chat app

**Learning goals:**
- How watches enable efficient coordination without polling
- Understanding one-time trigger limitation
- Implementing local cache + watch pattern
- Why this matters for scalability

**Production considerations:**
- Watches fire only once - must re-register
- High-traffic nodes can cause notification storms
- Watch events are ordered but may batch
- Consider watch count per node (hot spotting)

### 3. Configuration Management

**What it demonstrates:**
- Centralized configuration storage with persistent nodes
- Real-time config updates across multiple clients
- Versioning with setData version parameter
- Watch-based config propagation

**Key concepts:**
- ZooKeeper as single source of truth for config
- Version numbers for optimistic locking
- Real-time updates without restarts
- Atomic config changes

**Scenario:** E-commerce platform with dynamic config (feature flags, rate limits, discount thresholds, maintenance mode)

**Learning goals:**
- When to use ZooKeeper vs environment variables vs cloud config services
- Real-time config propagation patterns
- Configuration versioning and consistency

**Production considerations:**
- Store dynamic runtime config, not static deployment config
- Consider config validation before propagation
- Monitor config change frequency
- **Modern alternatives:** AWS Parameter Store, Azure App Configuration preferred for cloud-native apps

### 4. Service Discovery

**What it demonstrates:**
- Service registration with ephemeral nodes
- Discovering available service instances
- Automatic deregistration on failure
- Load balancing through service list

**Key concepts:**
- Ephemeral nodes for automatic cleanup
- Watch-based service availability notifications
- Session management ensures cleanup
- Service health through session heartbeats

**Scenario:** Microservice architecture where video transcoding service discovers available instances

**Learning goals:**
- Service registration/deregistration patterns
- Automatic failure detection via ephemeral nodes
- ZooKeeper vs Consul vs Kubernetes service discovery

**Production considerations:**
- Session timeout affects failure detection speed
- Consider DNS-based discovery for simpler cases
- **Modern alternatives:** Consul, Kubernetes Services, AWS Service Discovery for most use cases
- ZooKeeper service discovery mainly relevant in Apache ecosystem (HBase, Hadoop)

### 5. Leader Election

**What it demonstrates:**
- Leader election with sequential ephemeral nodes
- Automatic failover when leader crashes
- Watching predecessor node (not lowest) to avoid herd effect
- Leader responsibilities and handoff

**Key concepts:**
- Sequential + ephemeral pattern for election
- Lowest sequence number = leader
- Watch predecessor to avoid thundering herd
- Automatic failover through ephemeral node deletion

**Scenario:** Distributed job scheduler where only one node should process scheduled jobs

**Learning goals:**
- The sequential + ephemeral combination pattern
- Herd effect problem and solution
- Leader failover mechanics
- When leader election is necessary

**Production considerations:**
- Session timeout affects failover time
- Leader should not be bottleneck
- Consider split-brain scenarios
- Herd effect: watch predecessor, not leader
- Used in HBase, Kafka (pre-KRaft), and other Apache projects

### 6. Distributed Locks

**What it demonstrates:**
- Implementing distributed locks with sequential ephemeral nodes
- Lock acquisition ordering (FIFO)
- Lock release and automatic cleanup
- Preventing deadlocks

**Key concepts:**
- Similar to leader election but for resource locks
- Each client creates sequential ephemeral node
- Lowest sequence holds lock
- Others watch predecessor
- Automatic release on failure

**Scenario:** Resource allocation or rate limiting across distributed chat servers

**Learning goals:**
- ZooKeeper locks vs Redis locks trade-offs
- When ZooKeeper locks are appropriate
- Lock implementation patterns
- Avoiding common pitfalls

**Production considerations:**
- **ZooKeeper vs Redis locks:** Use Redis for simple, high-frequency locks (better performance). Use ZooKeeper for critical operations needing stronger consistency (financial transactions) or long-lived locks (hours) where automatic failure detection via ephemeral nodes is valuable
- Not designed for high-frequency locking (hundreds/sec)
- Consider lock timeout strategies
- Monitor lock contention
- Hierarchical locks possible with ZooKeeper (useful for distributed filesystems)

### 7. Session Management

**What it demonstrates:**
- Session lifecycle and establishment
- Connection loss vs session expiration (different!)
- Session recovery and reconnection
- Timeout configuration impact

**Key concepts:**
- Sessions maintain ephemeral nodes and watches
- Client sends heartbeats to maintain session
- Connection loss ≠ session expiration
- Session timeout determines failure detection

**Scenario:** Understanding behavior during network partitions and server failures

**Learning goals:**
- Critical for production deployments
- Why session timeout tuning matters
- Connection vs session distinction
- Impact on ephemeral nodes and watches

**Production considerations:**
- **Session timeout tuning:** Too short (< 5s) causes false failures from temporary network issues. Too long (> 60s) delays failure detection
- Typical range: 10-30 seconds
- Consider network stability and failure detection needs
- Session recovery requires reconnect before timeout
- Monitor session expiration rates

### 8. Ensemble & Consensus (Advanced - Conceptual)

**What it demonstrates:**
- ZooKeeper Atomic Broadcast (ZAB) protocol concepts
- Leader election within ZooKeeper ensemble
- Quorum requirements and failure tolerance
- Write-through-leader architecture

**Key concepts:**
- ZooKeeper ensemble (3, 5, or 7 servers)
- One leader, multiple followers
- Quorum requirement: majority must agree
- Tolerates (N-1)/2 failures
- Two-phase commit for writes

**Scenario:** Understanding multi-node ZooKeeper behavior during server failures

**Learning goals:**
- Deep understanding for Staff+ infrastructure interviews
- How ZooKeeper achieves consensus
- Trade-offs of consistency model
- When consensus complexity is justified

**Implementation approach:** 
- Option A (chosen): Document the concepts without live demo, explain ZAB protocol with diagrams and examples
- Keep single-node Docker setup simple
- Focus on conceptual understanding and interview relevance
- Students learn the patterns without operational complexity

**Production considerations:**
- Deploy odd number of servers (3, 5, 7)
- Quorum math: 3 servers tolerate 1 failure, 5 tolerate 2
- Transaction log on dedicated disk for performance
- Avoid memory swapping (impacts all queued requests)
- ZAB similar to Paxos/Raft but predates Raft
- Understanding ensemble behavior critical for production ops

## Client Implementation

### ZooKeeperClient Class (`client.ts`)

```typescript
export class ZooKeeperClient {
  private client: ZooKeeper;
  private connectionString: string;
  
  // Connection management
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  
  // Core ZNode operations
  async create(path: string, data: Buffer, mode: CreateMode): Promise<string>
  async getData(path: string, watch?: boolean): Promise<{data: Buffer, stat: Stat}>
  async setData(path: string, data: Buffer, version?: number): Promise<Stat>
  async getChildren(path: string, watch?: boolean): Promise<string[]>
  async exists(path: string, watch?: boolean): Promise<Stat | null>
  async remove(path: string, version?: number): Promise<void>
  
  // Helper methods
  async ensurePath(path: string): Promise<void>  // Create parent nodes recursively
  async deleteRecursive(path: string): Promise<void>  // Delete node and all children
}
```

**Configuration:**
- Connection string: `localhost:2181` (from env var `ZOOKEEPER_HOST`)
- Session timeout: 10000ms (configurable via env var)
- Connection timeout: 5000ms
- Auto-reconnect enabled

**Error handling:**
- Graceful handling of common errors: `NONODE`, `NODEEXISTS`, `BADVERSION`
- Retry logic for transient connection issues
- Clear error messages for educational purposes
- Expose ZooKeeper error codes to examples when relevant

**Package dependency:** `node-zookeeper-client` (most stable Node.js ZooKeeper client)

## Example Code Structure

Each example follows this template:

```typescript
// examples/XX-example-name/index.ts
import { createStepLogger } from '../../lib/step-by-step-logger';
import { getZooKeeperClient } from '../client';

export async function runExample() {
  const logger = createStepLogger('Example Name');
  const zk = await getZooKeeperClient();
  
  try {
    logger.step('Description of what we're doing');
    // Implementation with clear comments
    logger.success('What we learned from this step');
    
    logger.step('Next step description');
    // More implementation
    
    // Self-verifying assertions
    logger.assert(condition, 'Expected behavior explanation');
    
    logger.info('Key concept or production consideration');
    
  } finally {
    // Cleanup
    await cleanup();
    await zk.disconnect();
  }
}
```

## Testing Strategy

### Integration Tests (`scripts/test-zookeeper-examples.ts`)

- Run each example in sequence (1-8)
- Verify no errors thrown
- Check ZooKeeper state after each example
- Clean up test data between examples
- Report success/failure for each example
- Pattern matches existing `test-redis-examples.ts` and `test-postgres-examples.ts`

### Reset Script (`scripts/reset-zookeeper.ts`)

- Delete all nodes under `/test-*` or `/demo-*` paths (example namespaces)
- Leave ZooKeeper system nodes intact (e.g., `/zookeeper`)
- Verify connection before cleanup
- Handle case where nodes don't exist
- Pattern matches existing `reset-redis.ts` and `reset-postgres.ts`

### Health Checks

Add ZooKeeper health check to CLI startup:
- Connect to localhost:2181
- Verify connection successful
- Display clear error if ZooKeeper unavailable
- Suggest `docker-compose up -d` if service down

## CLI Integration

Update `src/cli.ts`:

```typescript
const TECHNOLOGIES = [
  { name: 'Redis', path: 'redis', exampleCount: 10 },
  { name: 'PostgreSQL', path: 'postgresql', exampleCount: 7 },
  { name: 'Kafka', path: 'kafka', exampleCount: 2 },  // Phase 1
  { name: 'ZooKeeper', path: 'zookeeper', exampleCount: 8 }
];
```

Add health check for ZooKeeper (port 2181) alongside Redis, PostgreSQL, Kafka checks.

## Documentation Updates

### Main README.md

**Technologies section:**
```markdown
- ✅ **Redis** (10 examples) - Cache, distributed locks, leaderboards, rate limiting, pub/sub, and more
- ✅ **PostgreSQL** (7 examples) - SQL operations, transactions, indexing, read/write scaling, optimization
- ✅ **Kafka** (2 examples) - Topics, producers, consumers, partitioning strategies [Phase 1]
- ✅ **ZooKeeper** (8 examples) - Distributed coordination, leader election, config management, service discovery
- 🔜 **Cassandra** - Coming soon
- 🔜 **Elasticsearch** - Coming soon
```

**Services section:**
```markdown
### ZooKeeper
- **Port**: 2181
- **Image**: confluentinc/cp-zookeeper:7.5.0
- **Use**: Distributed coordination primitives
```

**Commands section:**
```bash
npm run test:zookeeper    # Run ZooKeeper integration tests
npm run reset:zookeeper   # Reset ZooKeeper data
```

### Technology README (`src/technologies/zookeeper/README.md`)

Structure similar to existing Redis/Kafka READMEs:

1. **What is ZooKeeper?** - Brief introduction, key characteristics
2. **Why ZooKeeper for Interviews?** - Relevance and positioning
3. **8 ZooKeeper Examples** - Detailed breakdown of each example
4. **Key Concepts Across Examples** - Performance, scalability, consistency
5. **Getting Started** - Running examples, resetting data
6. **Production Considerations** - Deployment, configuration, monitoring
7. **Interview Tips** - Do's and don't's, common questions
8. **ZooKeeper vs Alternatives** - Comparison tables (etcd, Consul, Redis, cloud services)
9. **Common Use Cases Summary** - Table mapping use cases to features
10. **Further Reading** - Links to docs and original.md

**Key sections to emphasize:**

**When NOT to Use ZooKeeper:**
- Small-scale systems (operational overhead)
- High-throughput read/write scenarios (not designed for this)
- Request-response patterns (ZooKeeper is async coordination)
- Pure caching (use Redis)
- Bulk data storage (use database)

**ZooKeeper vs Alternatives Table:**

| Feature | ZooKeeper | etcd | Consul | Redis | Cloud Services |
|---------|-----------|------|--------|-------|----------------|
| Consistency | Strong (CP) | Strong (CP) | Strong (CP) | Eventual (AP) | Varies |
| API | Java-native | HTTP/gRPC | HTTP | Protocol | REST |
| Ecosystem | Apache projects | Kubernetes | HashiCorp | General-purpose | Cloud-native |
| Ops complexity | Higher | Medium | Medium | Lower | Minimal |
| Use case | Apache ecosystem, coordination | K8s, cloud-native | Service mesh | Caching, simple locks | Managed config |

## Educational Elements

### Per-Example Documentation

Each example's README.md includes:

1. **What it demonstrates** - Clear learning objectives
2. **Why you'd use this pattern** - Real-world motivation
3. **How it works** - Technical explanation with code walkthrough
4. **Key ZooKeeper concepts** - API calls, node types, patterns used
5. **Production considerations** - Scaling, failure modes, performance, monitoring
6. **When NOT to use this pattern** - Alternative approaches and trade-offs
7. **Modern alternatives** - etcd, Consul, cloud-native solutions when applicable
8. **Further reading** - Links to ZooKeeper docs and original.md sections

### Interview Talking Points

Throughout examples, emphasize:

1. **ZooKeeper is not a database** - It's for coordination, not bulk storage (< 1MB per node)
2. **Write-through-leader architecture** - All writes go through leader, making them more expensive than reads
3. **Session timeout trade-offs** - Balance between false failures (too short) and slow detection (too long)
4. **Quorum requirements** - Majority must agree; odd-number ensembles (3, 5, 7)
5. **Watch limitations** - One-time triggers, must re-register after firing
6. **Hot spotting** - Popular nodes can become bottlenecks with many watchers
7. **When alternatives are better** - Redis for simple locks, cloud services for config, Kubernetes for service discovery
8. **Apache ecosystem relevance** - Still core to HBase, Hadoop, ClickHouse, Pulsar
9. **Kafka's transition** - Moved from ZooKeeper to KRaft (self-contained consensus)

### Comparison Guidance

Help students make informed decisions:

**Use ZooKeeper when:**
- Working within Apache ecosystem (HBase, Hadoop, etc.)
- Need hierarchical locks with complex dependencies
- Require long-lived locks (hours) with automatic failure detection
- Building infrastructure requiring strong coordination (distributed message queue, task scheduler)
- Critical operations where correctness > performance (financial transactions)

**Use alternatives when:**
- Cloud-native architecture → cloud provider services (AWS Parameter Store, etc.)
- Kubernetes environment → built-in service discovery and config
- Simple distributed locks → Redis (better performance, simpler ops)
- High-frequency locking → Redis or database transactions
- Modern service mesh → Consul
- Container orchestration → etcd (Kubernetes native)

## Package Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "node-zookeeper-client": "^2.2.5"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"  // For TypeScript support
  }
}
```

Note: `node-zookeeper-client` may not have official TypeScript types. Will create type definitions if needed.

## Docker Configuration

ZooKeeper service already exists in `docker-compose.yml`:

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
```

**No changes needed.** This single-node setup is sufficient for all examples (1-8). Example 8 will document ensemble behavior conceptually rather than demonstrate it live.

## Implementation Order

Recommended implementation sequence:

1. **Setup Phase:**
   - Install `node-zookeeper-client` dependency
   - Create `src/technologies/zookeeper/client.ts` with connection management
   - Update `docker-compose.yml` if needed (likely no changes)

2. **Example Implementation (in order):**
   - Example 01-basics (foundation for all others)
   - Example 02-watches (used in most subsequent examples)
   - Example 03-config-management (practical application)
   - Example 04-service-discovery (builds on ephemeral nodes)
   - Example 05-leader-election (sequential + ephemeral pattern)
   - Example 06-distributed-locks (similar to leader election)
   - Example 07-session-management (operational understanding)
   - Example 08-ensemble-consensus (conceptual, no code)

3. **Testing & Scripts:**
   - Create `scripts/reset-zookeeper.ts`
   - Create `scripts/test-zookeeper-examples.ts`
   - Test each example individually
   - Test full suite with `npm run test:zookeeper`

4. **Documentation:**
   - Write `src/technologies/zookeeper/README.md` (adapt from original.md)
   - Update main `README.md` with ZooKeeper info
   - Ensure each example has comprehensive README

5. **CLI Integration:**
   - Add ZooKeeper to `src/cli.ts` menu
   - Add health check for ZooKeeper service
   - Test interactive flow

6. **Verification:**
   - Run all ZooKeeper examples via CLI
   - Verify reset script works correctly
   - Run integration tests
   - Test alongside existing technologies (no conflicts)

## Success Criteria

The implementation is complete when:

1. ✅ All 8 examples run successfully via CLI
2. ✅ `npm run test:zookeeper` passes all examples
3. ✅ `npm run reset:zookeeper` cleans up test data
4. ✅ Each example has comprehensive README with production considerations
5. ✅ Technology README mirrors quality of Redis/Kafka docs
6. ✅ Main README updated with ZooKeeper information
7. ✅ ZooKeeper appears in CLI menu and examples are selectable
8. ✅ Health check verifies ZooKeeper service availability
9. ✅ Examples follow existing code patterns (step logger, assertions)
10. ✅ Documentation includes "when NOT to use ZooKeeper" guidance

## Out of Scope

The following are explicitly NOT part of this implementation:

- Multi-node ZooKeeper ensemble setup (Example 8 is conceptual)
- ZooKeeper UI tool (like RedisInsight or Kafka UI)
- Advanced ZooKeeper features (ACLs, authentication, encryption)
- ZooKeeper client library alternatives (sticking with node-zookeeper-client)
- Performance benchmarking tools
- Migration guides from ZooKeeper to alternatives
- Integration with other technologies (Redis, Kafka, etc.)
- Additional technologies beyond ZooKeeper

## Risks and Mitigations

**Risk:** `node-zookeeper-client` package may be outdated or lack TypeScript support
**Mitigation:** Test package compatibility during setup phase. Create custom type definitions if needed. Consider alternative packages (zkClient) if issues arise.

**Risk:** Example 8 (ensemble) may feel incomplete without hands-on demo
**Mitigation:** Provide rich conceptual documentation with diagrams, clear explanations, and interview-focused content. Make it clear this is an advanced topic for Staff+ interviews.

**Risk:** Students may over-use ZooKeeper when simpler solutions exist
**Mitigation:** Strong emphasis on "When NOT to use ZooKeeper" in docs and examples. Include comparison tables and decision guidance. Frame ZooKeeper as valuable for learning patterns, not always the practical choice.

**Risk:** ZooKeeper operational complexity may frustrate beginners
**Mitigation:** Single-node Docker setup keeps it simple. Focus on concepts and patterns rather than production operations. Acknowledge complexity in docs.

## References

- Source material: `/Users/dsalo/Repos/hello-interview-practice/key_technologies/zookeeper/original.md`
- Existing Redis section: `src/technologies/redis/`
- Existing PostgreSQL section: `src/technologies/postgresql/`
- Existing Kafka section: `src/technologies/kafka/`
- Docker compose: `docker-compose.yml`
- ZooKeeper documentation: https://zookeeper.apache.org/doc/current/

## Appendix: Example Use Case Mapping

| Interview Question | Relevant ZooKeeper Examples |
|-------------------|----------------------------|
| "Design a chat system" | 01-basics, 04-service-discovery, 07-session-management |
| "Design a distributed task scheduler" | 05-leader-election, 06-distributed-locks |
| "Design a configuration system" | 03-config-management, 02-watches |
| "Design a distributed message queue" | 04-service-discovery, 05-leader-election, 08-ensemble-consensus |
| "Explain distributed coordination" | All examples, especially 05-08 |
| "Design Kafka/HBase/Hadoop" | 08-ensemble-consensus, 05-leader-election |
| "Handle service discovery at scale" | 04-service-discovery, 07-session-management |

This mapping helps students connect ZooKeeper concepts to common interview questions.
