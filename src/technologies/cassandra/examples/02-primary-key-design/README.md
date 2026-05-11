# Primary Key Design

## What This Demonstrates

- Simple primary key: `PRIMARY KEY (user_id)`
- Compound partition key: `PRIMARY KEY ((tenant_id, user_id))`
- Partition + clustering keys: `PRIMARY KEY (user_id, created_at)`
- Composite partition + clustering: `PRIMARY KEY ((channel_id, bucket), message_id)`
- CLUSTERING ORDER BY (ASC/DESC)
- Query patterns enabled by each design

## Why This Matters

Primary key design is THE most critical Cassandra decision. It determines:
- How data is distributed across the cluster
- Which queries are efficient vs impossible
- Partition size and potential hot spots
- Sort order within partitions

Getting primary keys wrong means slow queries or redesigning schemas.

## How It Works

**Partition key** (first part of PRIMARY KEY): Hashed to determine which node stores the data. Can be simple (one column) or compound (multiple columns in parentheses).

**Clustering keys** (remaining columns in PRIMARY KEY): Determine sort order within the partition. Optional but powerful.

**Examples:**
- `PRIMARY KEY (user_id)` - Simple partition key, no clustering
- `PRIMARY KEY ((tenant_id, user_id))` - Compound partition key (distribute by both)
- `PRIMARY KEY (user_id, created_at)` - Partition by user_id, sort by created_at
- `PRIMARY KEY ((channel_id, bucket), message_id)` - Compound partition (channel+bucket), sort by message_id

## Key Concepts

- **Partition Key Cardinality**: Higher = better distribution. Low cardinality (e.g., always "myapp") = hot partition.
- **Clustering Key Order**: Determines sort order. DESC useful for "most recent first" patterns.
- **Query Alignment**: Queries MUST include full partition key. Clustering key enables range queries.

## Production Considerations

- Start with access patterns, design primary key to match
- High cardinality partition keys prevent hot partitions
- Aim for partitions <100MB, <100k rows
- Compound partition keys useful for multi-tenancy
- Clustering keys provide free sorting (no ORDER BY needed)

## Interview Tips

- Always ask "What are the access patterns?" before designing primary key
- Explain partition key determines node location
- Clustering keys provide sorting within partition for free
- Can't query on non-key columns without secondary index (slow)
- Discord messages example shows compound partition + clustering for bucketing

## Further Reading

- [Primary Keys](https://cassandra.apache.org/doc/latest/cql/ddl.html#the-primary-key)
- [Partition Keys Best Practices](https://docs.datastax.com/en/dse/6.8/cql/cql/cql_using/useCompoundPrimaryKeyConcept.html)
