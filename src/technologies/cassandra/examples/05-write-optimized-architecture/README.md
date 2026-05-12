# Write-Optimized Architecture

## What This Demonstrates

- Commit log (write-ahead log for durability)
- Memtable (in-memory sorted structure)
- SSTable flush (immutable disk files)
- Compaction (merging SSTables)
- Tombstones (how deletes work)
- Read path: memtable -> bloom filter -> SSTables
- Last Write Wins (LWW) conflict resolution
- Why writes are fast, reads can be slower

## Why This Matters

Cassandra's write-optimized architecture using LSM trees is what makes it capable of handling millions of writes per second. Understanding this architecture explains why Cassandra excels at write-heavy workloads (IoT, messaging, logging) and why certain read patterns can be slow. This is a frequent interview topic for system design roles.

## How It Works

### Write Path

```
Client Write Request
       |
       v
[1. Commit Log]     -- Sequential disk append (durability)
       |
       v
[2. Memtable]       -- In-memory sorted structure (speed)
       |
       v
[3. Acknowledge]    -- Client gets success response
       |
       v (background, when memtable full)
[4. Flush to SSTable] -- Immutable sorted file on disk
       |
       v (background, periodic)
[5. Compaction]     -- Merge SSTables, remove old data
```

Key insight: Only steps 1-3 are in the write path. One sequential disk write + one memory write = fast.

### Read Path

```
Client Read Request
       |
       v
[1. Memtable]       -- Check in-memory data first
       |
       v
[2. Bloom Filters]  -- "Definitely not here" or "maybe here"
       |
       v
[3. Partition Index] -- Find offset in SSTable
       |
       v
[4. SSTable(s)]     -- Read from disk (may check multiple)
       |
       v
[5. Merge]          -- Combine results, latest timestamp wins
```

### SSTables (Sorted String Tables)

SSTables are immutable sorted files on disk:
- **Immutable**: Once written, never modified (no random I/O)
- **Sorted**: Data sorted by partition key + clustering key
- **Indexed**: Partition index + bloom filter for fast lookups
- **Compactable**: Background process merges multiple into fewer

### Compaction Strategies

| Strategy | Best For | Behavior |
|----------|----------|----------|
| Size-Tiered (STCS) | Write-heavy | Merges similar-sized SSTables |
| Leveled (LCS) | Read-heavy | Organizes into levels, 90% reads hit 1 SSTable |
| Time-Window (TWCS) | Time-series + TTL | Groups by time window, drops entire expired SSTables |

## Key Concepts

### Last Write Wins (LWW)

Every cell has a timestamp. When multiple versions exist:
- Highest timestamp wins on read
- No locks, no read-before-write needed
- Enables fast conflict-free writes across replicas
- Trade-off: Last writer always overwrites (no merge semantics)

### Tombstones

Deletes in Cassandra write a "tombstone" marker:
- Tombstone has a timestamp (newer than original data)
- On read: tombstone found = row appears deleted
- Tombstone persists for `gc_grace_seconds` (default: 10 days)
- Removed during compaction after grace period
- Anti-pattern: Frequent delete/reinsert creates tombstone buildup

### Why Writes Are O(1)

| Database | Write Operation | Disk Pattern |
|----------|----------------|--------------|
| PostgreSQL (B-tree) | Find page, update in place, update index | Random I/O |
| Cassandra (LSM) | Append to log, insert in memtable | Sequential I/O |

Sequential I/O is 100-1000x faster than random I/O on spinning disks, and still significantly faster on SSDs due to write amplification characteristics.

## Production Considerations

### Monitoring

- **SSTable count per table**: High count = slow reads, needs compaction
- **Pending compactions**: Large backlog = compaction can't keep up
- **Tombstone count**: High tombstones = slow reads, possible anti-pattern
- **Memtable flush frequency**: Too frequent = too many small SSTables

### Common Issues

1. **Tombstone accumulation**: Frequent deletes without compaction
   - Fix: Review data model, ensure compaction keeps up
2. **Too many SSTables**: Reads slow because checking many files
   - Fix: Tune compaction strategy, increase compaction throughput
3. **Write amplification**: Each logical write becomes multiple physical writes
   - Fix: Expected behavior, tune compaction strategy for workload

### Compaction Strategy Selection

- **STCS**: Default. Use for write-heavy, read-light workloads
- **LCS**: Switch when read latency matters more than write throughput
- **TWCS**: Time-series data with TTL (IoT sensors, logs, metrics)

## Interview Tips

### Common Questions

**Q: "Why is Cassandra fast at writes?"**
A: LSM tree architecture. Writes are just a sequential commit log append + memtable insert. No B-tree page splits, no random disk I/O, no index updates on the write path. Writes are O(1) regardless of data size.

**Q: "How do deletes work in Cassandra?"**
A: Deletes write a tombstone marker (not immediate removal). The tombstone has a newer timestamp than the original data, so reads see "deleted." The tombstone persists for gc_grace_seconds (10 days default) to propagate across replicas, then compaction removes it.

**Q: "What is compaction?"**
A: Background process that merges multiple SSTables into fewer. Removes overwritten entries (older timestamps), expired tombstones, and TTL'd data. Critical for maintaining read performance. Three strategies: Size-Tiered, Leveled, Time-Window.

**Q: "What are the tradeoffs of LSM trees vs B-trees?"**
A: LSM (Cassandra): Faster writes (sequential I/O), potentially slower reads (check multiple SSTables), write amplification during compaction. B-tree (PostgreSQL): Balanced read/write, random I/O for writes, predictable read performance.

### Key Takeaways

1. Writes are O(1): commit log + memtable, then acknowledge
2. Updates and deletes are writes (new entries, not in-place modifications)
3. SSTables are immutable (no random disk writes ever)
4. Compaction is essential for read performance
5. Last Write Wins via timestamps (no locking)
6. Trade-off: Write speed for read complexity

## Further Reading

- [LSM Trees](https://en.wikipedia.org/wiki/Log-structured_merge-tree)
- [Compaction Strategies](https://cassandra.apache.org/doc/latest/cassandra/operating/compaction/)
- [SSTable Format](https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html)
