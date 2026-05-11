# ZooKeeper Technology Guide

Interactive examples for mastering distributed coordination patterns in system design interviews.

## What is ZooKeeper?

ZooKeeper is a centralized coordination service for distributed systems. It provides a simple set of primitives that enable complex coordination patterns like leader election, distributed locks, service discovery, and configuration management.

### Key Characteristics

- **Coordination-Focused**: Not for bulk data storage, but for small coordination metadata
- **Hierarchical Namespace**: File-system-like structure with ZNodes
- **Strong Consistency**: Sequential consistency guarantees via ZAB protocol
- **Watches**: Push-based notifications for reactive coordination
- **Ephemeral Nodes**: Automatic cleanup on client session expiration

### Why ZooKeeper for Interviews?

Understanding ZooKeeper teaches fundamental distributed systems concepts:
- Consensus algorithms (ZAB protocol)
- Leader election patterns
- Failure detection via sessions
- Consistency vs availability tradeoffs
- Service coordination at scale

Even if you never use ZooKeeper directly, these patterns apply to etcd, Consul, and other coordination services.

## 8 ZooKeeper Examples

### 1. Basics: ZNode Fundamentals

**What you'll learn**: The three ZNode types and CRUD operations

- Persistent nodes: Configuration data
- Ephemeral nodes: Presence detection
- Sequential nodes: Ordering guarantees
- CRUD: create, getData, setData, remove, getChildren

**Key concepts**:
- 1MB data size limit
- Version numbers for optimistic locking
- Hierarchical path organization

**Interview relevance**: Foundation for all coordination patterns. Interviewers expect you to explain why ephemeral nodes enable automatic failure detection.

**Example path**: `examples/01-basics/`

---

### 2. Watches: Change Notifications

**What you'll learn**: Reactive coordination without polling

- Data watches: Fire on setData
- Child watches: Fire on child add/remove  
- Existence watches: Fire on node create/delete
- One-time trigger behavior

**Key concepts**:
- Watch scalability and hot node problem
- Local cache + watch pattern
- Re-registration after firing

**Interview relevance**: Critical for understanding how ZooKeeper achieves scalability. Discuss how watches differ from polling and when Kafka is better for broadcasts.

**Example path**: `examples/02-watches/`

---

### 3. Configuration Management

**What you'll learn**: Centralized config with real-time updates

- Storing dynamic runtime configuration
- Propagating changes to all services instantly
- Optimistic locking with version numbers
- Feature flags and A/B testing

**Key concepts**:
- Static vs dynamic configuration
- When to use env vars vs ZooKeeper
- Config validation and rollback

**Interview relevance**: Common in "Design Netflix" or "Design Airbnb" where you need to explain how to update rate limits or feature flags without redeployment.

**Example path**: `examples/03-config-management/`

---

### 4. Service Discovery

**What you'll learn**: Dynamic service registration and discovery

- Registration with ephemeral + sequential nodes
- Automatic deregistration on failure
- Client-side load balancing
- Watch-based availability updates

**Key concepts**:
- Session timeout tradeoffs (fast detection vs false positives)
- Service metadata (capacity, version, region)
- Alternatives: Kubernetes Services, Consul, AWS Service Discovery

**Interview relevance**: Essential for microservices discussions. Explain how ephemeral nodes provide automatic cleanup without manual deregistration.

**Example path**: `examples/04-service-discovery/`

---

### 5. Leader Election

**What you'll learn**: Sequential ephemeral pattern for leadership

- Deterministic election (lowest sequence wins)
- Watching predecessor (not leader) to avoid thundering herd
- Automatic failover on leader failure
- Chain of command succession

**Key concepts**:
- Split-brain prevention via quorum
- Fencing tokens for safety
- Failover time = session timeout
- When NOT to use leader election

**Interview relevance**: Critical for "Design distributed task scheduler" or "Design HBase". Discuss ZAB consensus and alternatives like Raft/Paxos.

**Example path**: `examples/05-leader-election/`

---

### 6. Distributed Locks

**What you'll learn**: FIFO lock acquisition with ZooKeeper

- Sequential ephemeral nodes for lock queue
- Watching predecessor for lock acquisition
- Deadlock prevention
- Lock timeouts and recovery

**Key concepts**:
- Comparison with Redis locks (Redlock)
- Fencing tokens prevent stale operations
- Limitations and failure modes
- When to use database locks instead

**Interview relevance**: Common in "Design Ticketmaster" or "Design trading platform" for preventing double-booking or race conditions.

**Example path**: `examples/06-distributed-locks/`

---

### 7. Session Management

**What you'll learn**: Understanding ZooKeeper session lifecycle

- Session creation and heartbeats
- Connection loss vs session expiration
- Session recovery patterns
- Timeout configuration

**Key concepts**:
- Ephemeral node lifecycle tied to sessions
- Network partition behavior
- Client library automatic reconnection
- Session ID and password

**Interview relevance**: Shows depth when discussing failure scenarios. Explain how ZooKeeper handles network partitions differently from Redis.

**Example path**: `examples/07-session-management/`

---

### 8. Ensemble & Consensus

**What you'll learn**: How ZooKeeper achieves consistency

- ZAB (ZooKeeper Atomic Broadcast) protocol
- Leader election within ensemble
- Quorum-based writes
- Read vs write consistency guarantees

**Key concepts**:
- Why odd-numbered ensembles (3, 5, 7)
- Fault tolerance: (N-1)/2 failures
- CAP theorem: CP system (consistency + partition tolerance)
- Comparison with Raft and Paxos

**Interview relevance**: Demonstrates advanced understanding. Discuss why ZooKeeper provides sequential consistency (not linearizability) and when that matters.

**Example path**: `examples/08-ensemble-consensus/`

---

## When to Use ZooKeeper

### Good Use Cases

- **Apache Ecosystem**: Already using Kafka, HBase, Storm, Solr
- **Coordination Needs**: Leader election, distributed locks, barriers
- **Service Discovery**: Small to medium scale (< 10k services)
- **Configuration Management**: Dynamic runtime config with watch notifications

### When NOT to Use ZooKeeper

- **Large Datasets**: Use a database (ZooKeeper has 1MB limit per ZNode)
- **High Write Throughput**: Writes go through leader, limiting scalability
- **Simple Caching**: Use Redis (simpler, faster)
- **Cloud-Native Apps**: Use native solutions (etcd on K8s, AWS Service Discovery)
- **Event Streaming**: Use Kafka (better for high-volume pub/sub)

## Alternatives Comparison

| Feature | ZooKeeper | etcd | Consul | Redis | Database |
|---------|-----------|------|--------|-------|----------|
| **Consensus** | ZAB | Raft | Raft | None | Varies |
| **API** | Java-native | gRPC/HTTP | HTTP/DNS | Binary | SQL/NoSQL |
| **Use Case** | Apache stack | Kubernetes | Service mesh | Caching | General data |
| **Data Size** | < 1MB/node | < 1.5MB/key | < 512KB/key | < 512MB/key | Unlimited |
| **Watches** | Push | Push | Push+Long poll | Pub/sub | None |
| **Health Checks** | Session | TTL | HTTP/TCP probes | None | None |
| **Best For** | Coordination | K8s config | Service mesh | Speed | Persistence |

## Common Interview Questions

### Q: When would you use ZooKeeper over etcd?

**A**: Use ZooKeeper when already in Apache ecosystem (Kafka, HBase) to avoid operational overhead of another system. Use etcd for Kubernetes or greenfield projects - modern gRPC API, Raft consensus, better observability. Both solve same problems with different trade-offs.

### Q: How does ZooKeeper handle split-brain?

**A**: Quorum-based writes. Updates require majority (N/2 + 1) of ensemble nodes. During network partition, only partition with quorum can process writes. Other partition rejects writes, preventing divergence. Clients in minority partition see session timeouts and reconnect to majority.

### Q: What's the difference between ZooKeeper and Redis for coordination?

**A**: ZooKeeper provides strong consistency guarantees (sequential consistency) via ZAB consensus protocol, making it suitable for critical coordination like leader election. Redis is faster but offers weaker guarantees (eventual consistency in cluster mode). Use ZooKeeper for correctness, Redis for speed.

### Q: Why ephemeral nodes instead of manual cleanup?

**A**: Ephemeral nodes solve the "who cleans up after crashed nodes" problem. Manual cleanup requires additional heartbeat monitoring and cleanup logic. With ephemeral nodes, ZooKeeper automatically deletes nodes when session expires (~10-30s), simplifying client logic and preventing stale registrations.

### Q: How does ZooKeeper scale?

**A**: ZooKeeper scales **reads** by adding followers (reads served by any node). Doesn't scale **writes** well (all writes through leader). For write-heavy workloads, use hierarchical paths to partition data or consider alternatives like Kafka. Typical production: 3-5 nodes, 10k-50k ops/sec.

### Q: What happens if ZooKeeper is down?

**A**: Services lose coordination ability but cached data remains valid. Well-designed systems maintain local caches of critical data (config, service registry) and continue operating with last known state. This is why ZooKeeper runs as ensemble (3-5 nodes) for high availability.

## Production Considerations

### Deployment

- **Ensemble Size**: 3 nodes for dev, 5 nodes for production, 7 for critical systems
- **Hardware**: Dedicated servers (don't share with application nodes)
- **Storage**: Fast disk for transaction logs (SSD recommended)
- **Network**: Low-latency network between ensemble nodes

### Monitoring

- **Session Expirations**: High rate indicates network issues or GC pauses
- **Watch Fires**: Sudden spike suggests hot node problem
- **Outstanding Requests**: Queue buildup indicates overload
- **Leader Elections**: Frequent elections suggest instability

### Tuning

- **Session Timeout**: 10-20s typical, 30-60s for flaky networks
- **Tick Time**: 2-4 seconds (controls heartbeat interval)
- **Max Client Connections**: Limit per client to prevent resource exhaustion
- **ZNode Data Size**: Keep < 1KB for best performance

## Architecture Patterns

### Pattern 1: Service Discovery + Load Balancing

```
/services/
  /api-server/
    /instance-0000000001  →  {"host": "10.0.1.1", "port": 8080}
    /instance-0000000002  →  {"host": "10.0.1.2", "port": 8080}
```

Client watches `/services/api-server`, maintains local cache, selects instance via round-robin/random/least-loaded.

### Pattern 2: Leader Election for Singleton Work

```
/election/
  /node-0000000001  →  server-1
  /node-0000000002  →  server-2
  /node-0000000003  →  server-3
```

Lowest sequence is leader. Each node watches predecessor. On leader failure, next node becomes leader automatically.

### Pattern 3: Distributed Lock Queue

```
/locks/resource-name/
  /lock-0000000001  →  client-A (acquired)
  /lock-0000000002  →  client-B (waiting)
  /lock-0000000003  →  client-C (waiting)
```

Create sequential ephemeral node. If lowest sequence, acquired lock. Otherwise, watch predecessor and wait.

## Migration Guide

### From ZooKeeper to etcd

- Replace ZooKeeper API calls with etcd gRPC calls
- Convert watches to etcd watch streams
- Ephemeral nodes → TTL-based leases
- Sequential nodes → manual counter with transactions

### From ZooKeeper to Consul

- Service discovery: Use Consul's native service registry
- Health checks: Replace session detection with HTTP/TCP probes
- Configuration: Use Consul KV store
- Leader election: Use Consul sessions

### From ZooKeeper to Kubernetes

- Service discovery: Use K8s Services + DNS
- Configuration: Use ConfigMaps and Secrets
- Leader election: Use Lease API (leader-election library)
- No direct replacement for distributed locks (use database or Redis)

## Learning Resources

### Official Documentation
- [ZooKeeper Getting Started](https://zookeeper.apache.org/doc/current/zookeeperStartedGuide.html)
- [ZooKeeper Programmer's Guide](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html)
- [ZooKeeper Recipes](https://zookeeper.apache.org/doc/r3.1.2/recipes.html)

### Books
- "ZooKeeper: Distributed Process Coordination" by Flavio Junqueira and Benjamin Reed
- "Designing Data-Intensive Applications" by Martin Kleppmann (Chapter on Consensus)

### Papers
- [ZooKeeper: Wait-free coordination for Internet-scale systems](https://www.usenix.org/legacy/event/atc10/tech/full_papers/Hunt.pdf)
- [ZAB: High-performance broadcast for primary-backup systems](https://marcoserafini.github.io/papers/zab.pdf)

## Running Examples

All examples run through the interactive CLI:

```bash
npm start
# Select "ZooKeeper (8 examples)"
# Choose an example to run
```

Or run specific scripts:

```bash
# Test all examples
npm run test:zookeeper

# Reset ZooKeeper data
npm run reset:zookeeper
```

## Next Steps

1. **Start with Basics** (`examples/01-basics/`) to understand ZNodes
2. **Learn Watches** (`examples/02-watches/`) for reactive patterns
3. **Explore Coordination** patterns (leader election, locks, service discovery)
4. **Study Consensus** (`examples/08-ensemble-consensus/`) for depth

By working through all 8 examples, you'll gain the distributed systems knowledge needed to confidently discuss coordination patterns in any system design interview.
