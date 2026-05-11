# ZooKeeper Ensemble & Consensus

## What This Demonstrates

- ZooKeeper ensemble architecture (multi-node deployment)
- ZooKeeper Atomic Broadcast (ZAB) protocol
- Quorum requirements and failure tolerance
- Leader election within ZooKeeper ensemble
- Split-brain prevention through majority quorum
- Performance characteristics of consensus

## Why This Matters

Understanding ensemble behavior is critical for:
- Staff+ infrastructure interviews
- Production ZooKeeper operations
- Distributed systems design decisions
- Debugging coordination issues
- Capacity planning and scaling

## ZooKeeper Ensemble Architecture

### Ensemble Topology

```
    Client ─┐
    Client ─┼─→ ZooKeeper Ensemble
    Client ─┘     ┌─────────────┐
                  │   Leader    │ ← All writes
                  │  (Server 1) │
                  └─────┬───────┘
                        │
              ┌─────────┼─────────┐
              │         │         │
        ┌─────▼───┐ ┌──▼──────┐ ┌▼────────┐
        │Follower │ │Follower │ │Follower │ ← Reads
        │(Srv 2)  │ │(Srv 3)  │ │(Srv 4)  │
        └─────────┘ └─────────┘ └─────────┘
```

### Server Roles

**Leader:**
- Elected by ensemble
- Processes all write requests
- Coordinates state updates
- Maintains transaction log
- One leader per ensemble

**Follower:**
- Processes read requests
- Forwards writes to leader
- Participates in quorum votes
- Can become leader if current leader fails
- Multiple followers per ensemble

**Observer (optional):**
- Processes reads only
- Does not participate in quorum
- Does not vote in elections
- Used to scale read capacity without affecting quorum size

## ZooKeeper Atomic Broadcast (ZAB) Protocol

### Protocol Phases

#### Phase 1: Leader Election

```
Servers vote for leader based on:
1. Highest transaction ID (zxid)
2. Server ID (tiebreaker)

Example with 5 servers:
  Server 1: zxid=100, votes=0
  Server 2: zxid=105, votes=3 ← ELECTED (majority)
  Server 3: zxid=100, votes=0
  Server 4: zxid=105, votes=0
  Server 5: zxid=100, votes=0
```

#### Phase 2: Discovery (Synchronization)

```
Leader syncs state with followers:
1. Followers send their latest zxid
2. Leader identifies missing transactions
3. Leader sends missing transactions to followers
4. All servers reach consistent state
```

#### Phase 3: Broadcast (Normal Operation)

```
Write request flow:
  Client → Server
  Server → Leader (if not leader)
  Leader → Propose(txn) → All Followers
  Followers → ACK → Leader
  Leader → Commit (if quorum ACKs)
  Leader → Notify followers to commit
  Leader → Success → Client
```

### Two-Phase Commit

ZAB uses two-phase commit for atomicity:

**Phase 1 (Propose):**
```
Leader: "I propose transaction T with zxid=200"
Follower 1: "ACK" ✓
Follower 2: "ACK" ✓
Follower 3: "ACK" ✓
Result: Quorum achieved (3/5)
```

**Phase 2 (Commit):**
```
Leader: "Commit transaction T"
All servers commit transaction
State now consistent across ensemble
```

## Quorum Mathematics

### Quorum Formula

```
Quorum = (N / 2) + 1

Where N = number of servers
```

### Fault Tolerance Table

| Ensemble Size | Quorum | Tolerated Failures |
|--------------|--------|-------------------|
| 1 | 1 | 0 (single point of failure) |
| 2 | 2 | 0 (both must agree) |
| 3 | 2 | 1 |
| 4 | 3 | 1 (same as 3!) |
| 5 | 3 | 2 |
| 6 | 4 | 2 (same as 5!) |
| 7 | 4 | 3 |

### Why Odd Numbers Only?

Adding one more server to even number provides no additional fault tolerance:

```
3 servers → quorum 2 → tolerates 1 failure
4 servers → quorum 3 → tolerates 1 failure (no improvement!)

5 servers → quorum 3 → tolerates 2 failures
6 servers → quorum 4 → tolerates 2 failures (no improvement!)
```

**Conclusion:** Only use odd numbers (3, 5, 7) to maximize fault tolerance per server cost.

## Network Partition Handling

### Split-Brain Prevention

ZooKeeper prevents split-brain through majority quorum:

**Scenario 1: 5-node ensemble splits 3-2**
```
Partition A: 3 nodes
  - Has quorum (3 ≥ 3) ✓
  - Continues accepting reads and writes
  - Elects new leader if needed

Partition B: 2 nodes
  - No quorum (2 < 3) ✗
  - Accepts no writes
  - Serves reads (potentially stale)
```

**Scenario 2: 5-node ensemble splits 2-2-1**
```
All partitions: 2, 2, 1 nodes
  - None has quorum (all < 3) ✗
  - No partition accepts writes
  - All serve reads (potentially stale)
  - System blocks until partition heals
```

**Key insight:** At most one partition can have quorum, preventing conflicting writes.

## Write Path (Consensus in Action)

### Successful Write

```
Time | Event
-----|------------------------------------------------------
t0   | Client sends create("/config/rate_limit", "100")
t1   | Server receives, forwards to leader
t2   | Leader creates transaction T1 (zxid=150)
t3   | Leader proposes T1 to all followers
t4   | Follower 1 writes to log, sends ACK
t5   | Follower 2 writes to log, sends ACK
t6   | Leader receives 2 ACKs (quorum: 3/5 including self)
t7   | Leader commits T1 locally
t8   | Leader sends commit message to followers
t9   | Followers commit T1
t10  | Leader responds success to client
```

**Latency:** t10 - t0 ≈ 10-50ms (depends on network and disk speed)

### Write Failure Scenarios

**Scenario 1: No quorum (too many failures)**
```
5 servers: Leader + 4 followers
3 followers down
Quorum = 3, Available = 2 (leader + 1 follower)
Result: Cannot achieve quorum, write rejected
```

**Scenario 2: Leader failure mid-write**
```
t0: Leader receives write
t1: Leader proposes to followers
t2: Leader crashes before committing
t3: New leader elected
t4: New leader checks uncommitted proposals
t5: New leader either commits or aborts proposal
Result: Write either succeeds or fails atomically
```

## Read Path (No Consensus)

Reads are served locally without coordination:

```
Client → Any Server → Local memory → Response

Latency: 1-5ms (no network coordination)
Consistency: May be slightly stale (bounded staleness)
```

### Linearizable Reads (sync)

For guaranteed up-to-date reads:

```
Client → Server → sync() → Leader → Response

sync() ensures all pending writes committed before read
Latency: ~10-20ms (similar to write)
Use case: When strict consistency required
```

## ZAB vs Paxos vs Raft

### Comparison

| Aspect | ZAB | Paxos | Raft |
|--------|-----|-------|------|
| Year | 2007 | 1989 | 2013 |
| Understandability | Medium | Hard | Easy |
| Model | Primary-backup | Quorum-based | Leader-based |
| Ordering | Strong | Weak | Strong |
| Leader election | Fast | Complex | Simple |
| Used by | ZooKeeper | Chubby, Spanner | etcd, Consul |

### Conceptual Similarities

All three achieve:
- Linearizable consensus
- Fault tolerance through replication
- Majority quorum for decisions
- Leader-based coordination

### Key Differences

**ZAB:**
- Optimized for totally ordered updates
- Primary-backup replication
- Used only in ZooKeeper

**Paxos:**
- Theoretical foundation (very general)
- Complex to implement correctly
- Many variants (Multi-Paxos, Fast Paxos, etc.)

**Raft:**
- Designed for understandability
- Clearer separation of concerns (leader election, log replication, safety)
- Easier to implement and teach

## Performance Characteristics

### Write Throughput

**Bottleneck:** All writes go through leader

```
Single leader limits:
  - 10,000-40,000 writes/sec (typical)
  - Depends on: CPU, disk speed, network latency
  - Adding servers does NOT increase write capacity
```

**Why limited:**
- Leader must coordinate with quorum on every write
- Two-phase commit overhead
- Transaction log writes to disk

### Read Throughput

**Scales horizontally:** Each server can serve reads

```
Per server:
  - 100,000-500,000 reads/sec (typical)
  - Depends on: CPU, memory, data size

Scale out reads:
  - 3 servers: ~300k-1.5M reads/sec
  - 5 servers: ~500k-2.5M reads/sec
  - Add observers for even more read capacity
```

### Latency

**Writes:**
```
Same datacenter: 10-20ms
Cross-datacenter: 50-200ms (depends on distance)
```

**Reads:**
```
Local: 1-5ms
With sync: 10-20ms (linearizable reads)
```

## Production Considerations

### Hardware Requirements

**Minimum (3-node ensemble):**
- 4 GB RAM per server
- 2 CPU cores per server
- SSD for transaction logs (critical!)
- 100 GB disk space
- 1 Gbps network, < 1ms latency between nodes

**Recommended (5-node ensemble):**
- 8 GB RAM per server
- 4 CPU cores per server
- Dedicated SSD for logs
- 500 GB disk space
- 10 Gbps network, < 1ms latency

### Deployment Topologies

**Single datacenter (best performance):**
```
All 5 servers in same DC
  - Lowest latency (~1-2ms between nodes)
  - Fast consensus (~10ms write latency)
  - Risk: DC failure takes down ensemble
```

**Multi-datacenter (better resilience):**
```
DC1: 3 servers (quorum here)
DC2: 2 servers

  - Survives DC2 failure (3-server quorum in DC1)
  - Higher write latency (cross-DC coordination)
  - Complex: Need careful quorum placement
```

**Anti-pattern: Even split across DCs:**
```
DC1: 2 servers
DC2: 2 servers
Tie-breaker: 1 server elsewhere

  - Dangerous: Network partition splits quorum
  - Better: Use 5 servers with clear majority in one DC
```

### Monitoring Metrics

**Essential metrics:**
- Leader election frequency (should be rare: < 1/day)
- Follower lag (should be < 100 transactions)
- Outstanding requests (should be < 1000)
- Transaction log size (rotate regularly)
- Session expirations (should be low)

**Alerts:**
- Leader election happening frequently → instability
- Follower lag > 10,000 transactions → follower struggling
- Outstanding requests > 10,000 → overload
- Disk space < 20% → expand or rotate logs

### Capacity Planning

**Write capacity:**
```
Cannot scale horizontally (leader bottleneck)
Vertical scaling only:
  - Faster CPU
  - Faster SSD
  - More memory for caching
```

**Read capacity:**
```
Scale horizontally:
  - Add more servers (observers for read scaling)
  - Each server adds ~100k-500k read/sec capacity
```

**Storage capacity:**
```
Transaction log grows unbounded
Must configure log rotation:
  - autopurge.snapRetainCount=3
  - autopurge.purgeInterval=24 (hours)
```

## When NOT to Use ZooKeeper

### Use alternatives when:

**High write throughput needed:**
- ZooKeeper: ~10k-40k writes/sec max
- Alternative: Cassandra, DynamoDB (millions writes/sec)

**Large data storage:**
- ZooKeeper: < 1MB per node
- Alternative: Database, object storage

**Simple coordination:**
- ZooKeeper: Complex operational overhead
- Alternative: Redis, etcd (simpler to operate)

**Cloud-native architecture:**
- ZooKeeper: Requires manual setup and maintenance
- Alternative: Cloud services (AWS, GCP, Azure)

## Interview Tips

When discussing ensembles:

1. **Explain quorum math clearly:**
   - Quorum = (N/2) + 1
   - Odd numbers only for efficiency
   - Shows understanding of distributed systems

2. **Describe write path:**
   - Client → Server → Leader → Propose → ACK → Commit
   - Two-phase commit for atomicity
   - Shows depth of knowledge

3. **Mention split-brain prevention:**
   - Majority quorum guarantees single partition
   - Critical for data consistency
   - Shows production awareness

4. **Compare ZAB, Paxos, Raft:**
   - All achieve consensus differently
   - Raft more understandable
   - Shows breadth of knowledge

## Common Interview Questions

**Q: How does ZooKeeper achieve consensus?**  
A: ZAB (ZooKeeper Atomic Broadcast) protocol with two-phase commit. Leader proposes transactions to followers. If quorum ACKs, leader commits and notifies followers. Majority quorum ensures at most one partition can proceed during network partition.

**Q: Why do ZooKeeper ensembles use odd numbers?**  
A: Even numbers provide no additional fault tolerance vs odd number minus one. 4 servers tolerate 1 failure (quorum=3), same as 3 servers. 5 servers tolerate 2 failures (quorum=3). Odd numbers maximize fault tolerance per server.

**Q: What happens during network partition?**  
A: Partition with majority (quorum) continues operation. Other partitions cannot accept writes but may serve stale reads. Prevents split-brain since only one partition can have majority.

**Q: Why do writes not scale with more ZooKeeper servers?**  
A: All writes go through single leader. Leader must coordinate with quorum using two-phase commit. This is fundamental bottleneck. Adding servers only helps read scalability.

**Q: How does ZooKeeper compare to etcd?**  
A: Both provide distributed coordination with strong consistency. ZooKeeper uses ZAB protocol, etcd uses Raft. Raft more understandable and modern. etcd has better HTTP API, better tooling, and is cloud-native. ZooKeeper more mature with larger ecosystem (Kafka, HBase, Hadoop).

## Further Reading

- [ZAB Protocol Paper](https://marcoserafini.github.io/papers/zab.pdf)
- [ZooKeeper Internals](https://zookeeper.apache.org/doc/current/zookeeperInternals.html)
- [Raft vs ZAB](https://cwiki.apache.org/confluence/display/ZOOKEEPER/Zab+vs.+Paxos)
- Original guide: `/key_technologies/zookeeper/original.md` - "Ensemble & Consensus" section
