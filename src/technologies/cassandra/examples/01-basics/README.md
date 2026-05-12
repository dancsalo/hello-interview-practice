# Cassandra Basics & CQL

## What This Demonstrates

- Creating keyspaces with replication strategies
- Creating tables with various data types (text, int, decimal, boolean, timestamp, UUID)
- CRUD operations (INSERT, SELECT, UPDATE, DELETE)
- Collection types (set, list, map)
- User-defined types (UDTs)

## Why This Matters

Understanding CQL and Cassandra's data types is foundational for all data modeling. Knowing when to use collections vs separate tables, and how UDTs work, is critical for interview discussions.

## How It Works

**Keyspace creation** sets replication strategy. SimpleStrategy is for testing/single-DC, NetworkTopologyStrategy for production with multiple datacenters.

**Collections** are useful for small, bounded data (tags, preferences). They're stored with the row and should stay under 100 elements.

**UDTs** allow nesting structured data. They're frozen (immutable) - updates replace the entire value.

## Key Concepts

- **Keyspace**: Top-level namespace, defines replication
- **Primary Key**: Uniquely identifies rows (partition key + clustering keys)
- **Collections**: set, list, map for small bounded data
- **UDT**: User-defined composite types for structured data

## Production Considerations

- Use NetworkTopologyStrategy with appropriate RF per datacenter
- Prepared statements cache queries and improve performance
- Collections should be small; large collections degrade performance
- UDTs are fully replaced on update (no partial updates)
- UUID generation: timeuuid includes timestamp for chronological sorting

## Interview Tips

- SimpleStrategy vs NetworkTopologyStrategy is common question
- Collections are not a replacement for proper table design
- UDTs reduce application-side serialization but are inflexible
- Prepared statements are essential for performance

## Further Reading

- [CQL Data Types](https://cassandra.apache.org/doc/latest/cql/types.html)
- [Collections](https://cassandra.apache.org/doc/latest/cql/types.html#collections)
- [User-Defined Types](https://cassandra.apache.org/doc/latest/cql/types.html#udts)
