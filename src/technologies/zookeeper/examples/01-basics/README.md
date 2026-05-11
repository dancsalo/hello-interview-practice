# ZooKeeper Basics: ZNode Fundamentals

## What This Demonstrates

- ZooKeeper's hierarchical namespace (like a filesystem)
- Three ZNode types: persistent, ephemeral, sequential
- CRUD operations: create, getData, setData, remove, getChildren
- Version numbers for data changes

## Why This Matters

Understanding ZNodes is fundamental to all ZooKeeper patterns. Every coordination pattern (leader election, locks, service discovery) builds on these primitives.

## How It Works

### ZNode Types

**Persistent:**
- Exist until explicitly deleted
- Used for: configuration, metadata
- Example: `/config/max_users`

**Ephemeral:**
- Auto-deleted when client session ends
- Used for: service registration, presence detection
- Example: `/servers/server1`

**Sequential:**
- Append monotonically increasing counter (10 digits, zero-padded)
- Used for: ordering, leader election, distributed locks
- Example: `/messages/msg-0000000001`

### Operations

```
create(path, data, mode) → created path
getData(path) → {data, stat}
setData(path, data, version) → stat
getChildren(path) → [child names]
exists(path) → stat | null
remove(path, version) → void
```

## Production Considerations

### Data Size Limits
- Hard limit: 1MB per ZNode
- Recommended: < 1KB per ZNode
- ZooKeeper is for coordination data, not storage

### Path Hierarchy
- Design paths carefully (affects watches and organization)
- Use meaningful namespaces: `/app-name/component/resource`
- Avoid deep nesting (impacts performance)

### Version Numbers
- Incremented on every setData
- Use for optimistic locking (prevent concurrent updates)
- Pass -1 to setData to skip version check

### Sequential Node Behavior
- Counter never resets (even after deletion)
- Format: 10-digit zero-padded decimal
- Guaranteed unique within parent node

## When NOT to Use ZooKeeper

- **Large datasets:** Use a database
- **High write throughput:** ZooKeeper writes are expensive (go through leader)
- **Bulk storage:** Use object storage (S3, GCS)
- **Complex queries:** Use a database with query capabilities

## Alternatives

- **Configuration:** AWS Parameter Store, Azure App Configuration, environment variables
- **Simple key-value:** Redis, etcd
- **File storage:** S3, GCS

## Interview Tips

When discussing ZooKeeper in interviews:

1. Emphasize it's for **coordination**, not storage
2. Mention the 1MB limit upfront
3. Explain version numbers (shows depth)
4. Know when alternatives are better (shows judgment)

## Further Reading

- [ZooKeeper Data Model](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#ch_zkDataModel)
- [Node Types](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#Ephemeral+Nodes)
- Original guide: `/key_technologies/zookeeper/original.md` - "ZooKeeper Basics" section
