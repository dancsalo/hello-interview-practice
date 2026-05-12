# Replication & Consistency

## What This Demonstrates

- Replication factor configurations (RF=1, RF=3, NetworkTopologyStrategy)
- Consistency levels (ONE, QUORUM, ALL, LOCAL_QUORUM)
- R + W > RF formula for strong consistency
- CAP theorem and how Cassandra fits (AP system, tunable toward CP)
- Consistency vs availability tradeoff matrix
- Repair mechanisms (read repair, hinted handoff, anti-entropy repair)

## Why This Matters

Cassandra's tunable consistency is its defining characteristic. Unlike traditional databases that enforce strong consistency, Cassandra lets you choose per-query how many replicas must respond. Understanding this tradeoff is essential for system design interviews where you must explain why Cassandra is suitable for high-availability systems.

## How It Works

### Replication Factor (RF)

The replication factor determines how many copies of each piece of data exist across the cluster:

- **RF=1**: Data on 1 node only. No fault tolerance. Development only.
- **RF=3**: Data on 3 nodes. Can lose 1 node with QUORUM, 2 nodes with CL=ONE.
- **RF=5**: Rare. Used for extremely critical data.

### Consistency Levels

| Level | Nodes Required | Use Case |
|-------|---------------|----------|
| ONE | 1 replica | Max speed, eventual consistency |
| QUORUM | floor(RF/2)+1 | Strong consistency with availability |
| ALL | All replicas | Strongest, least available |
| LOCAL_QUORUM | Quorum in local DC | Multi-DC strong consistency |

### The Formula: R + W > RF

When the sum of read consistency (R) and write consistency (W) exceeds the replication factor, you get strong consistency:

- **RF=3, QUORUM write (W=2), QUORUM read (R=2)**: 2+2=4 > 3 = STRONG
- **RF=3, ALL write (W=3), ONE read (R=1)**: 3+1=4 > 3 = STRONG
- **RF=3, ONE write (W=1), ONE read (R=1)**: 1+1=2 < 3 = EVENTUAL

### CAP Theorem

Cassandra is an **AP system** (Availability + Partition Tolerance):
- During network partitions, nodes continue serving requests
- Sacrifices strict consistency for availability
- Can be tuned toward CP behavior using QUORUM levels
- With QUORUM reads + writes, effectively behaves as strongly consistent

## Key Concepts

### NetworkTopologyStrategy

For multi-datacenter deployments:
```cql
CREATE KEYSPACE production WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'dc1': 3,
  'dc2': 2
};
```

Benefits:
- Specify RF per datacenter
- Data locality (reads from local DC)
- Disaster recovery (full copy in each DC)
- Use LOCAL_QUORUM to avoid cross-DC latency

### Repair Mechanisms

Cassandra uses multiple mechanisms to achieve eventual consistency:

1. **Read Repair**: Compare replicas during reads, fix stale data
2. **Hinted Handoff**: Store writes for down nodes, replay when recovered
3. **Anti-Entropy Repair**: Periodic full comparison using Merkle trees

### Consistency/Availability Matrix

```
Write CL  | Read CL   | Consistency  | Availability | Latency
----------|-----------|--------------|--------------|--------
ONE       | ONE       | Eventual     | Highest      | Lowest
ONE       | QUORUM    | Eventual     | High         | Medium
QUORUM    | QUORUM    | Strong       | Medium       | Medium
ALL       | ALL       | Strong       | Lowest       | Highest
```

## Production Considerations

- **QUORUM/QUORUM**: Default for strong consistency with good availability
- **LOCAL_QUORUM**: Multi-DC setups (avoid cross-DC round trips per request)
- **ONE**: Maximum throughput, accept milliseconds of staleness
- **ALL**: Almost never used (single node failure blocks all requests)
- **Per-query tuning**: Critical reads use QUORUM, analytics use ONE

## Interview Tips

### Common Questions

**Q: "Is Cassandra CP or AP?"**
A: AP by default (prioritizes availability), but tunable toward CP with QUORUM consistency levels. With QUORUM reads + QUORUM writes, you get strong consistency while tolerating minority node failures.

**Q: "How do you guarantee strong consistency in Cassandra?"**
A: Use consistency levels where R + W > RF. Most common: QUORUM for both reads and writes with RF=3. This means 2+2=4 > 3, guaranteeing overlap between write and read replica sets.

**Q: "What happens during a network partition?"**
A: With CL=ONE, both sides continue serving requests (AP behavior). With CL=QUORUM, the minority side becomes unavailable (CP behavior). This is the tunable tradeoff.

**Q: "When would you use LOCAL_QUORUM vs QUORUM?"**
A: LOCAL_QUORUM in multi-DC setups. QUORUM would require responses from nodes in other DCs (high latency). LOCAL_QUORUM provides strong consistency within the local DC without cross-DC round trips.

### Key Takeaways

1. Cassandra prioritizes availability (AP in CAP theorem)
2. Tunable consistency via R + W > RF formula
3. QUORUM = floor(RF/2) + 1 nodes must respond
4. LOCAL_QUORUM for multi-DC (avoid cross-DC latency)
5. Consistency is per-query, not per-cluster
6. Higher consistency = higher latency = lower availability

## Further Reading

- [Consistency Levels](https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html)
- [CAP Theorem](https://en.wikipedia.org/wiki/CAP_theorem)
- [Tunable Consistency](https://docs.datastax.com/en/cassandra-oss/3.x/cassandra/dml/dmlConfigConsistency.html)
