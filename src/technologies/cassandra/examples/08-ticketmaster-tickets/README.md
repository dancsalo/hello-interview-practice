# Ticketmaster Tickets

## What This Demonstrates

- Real-world event ticketing pattern
- Section-based partitioning to distribute load
- Denormalized `event_sections` table for aggregates
- Composite partition key: `(event_id, section_id)`
- UX-driven data modeling (UI screens map to tables)
- Lightweight transactions for double-booking prevention

## Why This Matters

Ticketing systems face extreme concurrency (millions of users hitting the same event simultaneously) and require careful partition design. This example shows how UX requirements directly drive Cassandra schema design, and how hierarchical data (event -> section -> seat) creates natural partitioning boundaries. This is a common system design interview topic.

## How It Works

### UX-Driven Design

The Ticketmaster user flow has 2 steps, requiring 2 tables:

**Step 1: Event overview** (user sees venue map with section summaries)
```cql
SELECT * FROM event_sections WHERE event_id = ?;
-- Returns: section names, available counts, price ranges
```

**Step 2: Section detail** (user clicks a section, sees individual seats)
```cql
SELECT * FROM tickets WHERE event_id = ? AND section_id = ?;
-- Returns: individual seats with price and availability
```

### Schemas

```cql
-- Table 1: Individual tickets partitioned by section
CREATE TABLE tickets (
  event_id bigint,
  section_id bigint,
  seat_id bigint,
  price decimal,
  available boolean,
  PRIMARY KEY ((event_id, section_id), seat_id)
);

-- Table 2: Pre-computed section aggregates
CREATE TABLE event_sections (
  event_id bigint,
  section_id bigint,
  section_name text,
  total_seats int,
  available_seats int,
  price_floor decimal,
  price_ceiling decimal,
  PRIMARY KEY (event_id, section_id)
);
```

### Partition Size Comparison

| Schema | Partition Key | Rows per Partition | Size |
|--------|--------------|-------------------|------|
| tickets_v1 | (event_id) | 70,000 (all seats) | ~7 MB |
| tickets | (event_id, section_id) | 3,500 (one section) | ~350 KB |

## Key Concepts

### Section-Based Partitioning

Benefits of partitioning by section:
- **Bounded partitions**: Sections have finite seats (venue is fixed)
- **Load distribution**: Hot event spread across multiple nodes
- **Query efficiency**: Only read seats user is interested in
- **Matches UX**: Users browse by section, not entire venue

### Denormalized Aggregates

The `event_sections` table pre-computes:
- Available seat count per section
- Price floor and ceiling per section
- Eliminates need to scan all tickets for overview

Trade-off: Must update aggregates when tickets are purchased.

### Double-Booking Prevention

Use Lightweight Transactions (LWT) for the actual purchase:
```cql
UPDATE tickets SET available = false
WHERE event_id = ? AND section_id = ? AND seat_id = ?
IF available = true;
```

This is a compare-and-set operation (Paxos consensus):
- Only succeeds if seat is currently available
- Prevents two users from buying same seat
- Higher latency than normal writes (consensus required)

## Production Considerations

- **LWT latency**: Only use for purchase, not browsing (4x normal latency)
- **Aggregate staleness**: event_sections can be slightly stale (acceptable UX)
- **Counter alternatives**: Cassandra counters for available_seats (atomic decrement)
- **Event popularity**: Sections distribute load even for Taylor Swift concerts
- **Venue changes**: Sections are fixed per venue (bounded, predictable)

## Interview Tips

### Common Questions

**Q: "How would you design a ticketing system?"**
A: Partition tickets by (event_id, section_id) to distribute load. Create a denormalized event_sections table for aggregates. Use LWT for purchase to prevent double-booking. Design mirrors the UX flow.

**Q: "How do you handle millions of concurrent users for a popular event?"**
A: Section-based partitioning distributes the load. 20 sections = data on potentially 20 different nodes. Users viewing different sections hit different partitions (no single hot spot).

**Q: "How do you prevent double-booking?"**
A: Lightweight Transactions (LWT): `UPDATE ... IF available = true`. This uses Paxos consensus to ensure only one buyer succeeds. Higher latency but guarantees correctness for the critical purchase path.

**Q: "Why not just use event_id as partition key?"**
A: 70K seats in one partition creates a hot spot. Millions of users all hitting one node. Section-based partitioning distributes to ~3,500 rows per partition across multiple nodes.

### Key Takeaways

1. UX requirements inform partition key design
2. Hierarchical data creates natural partitioning boundaries
3. Denormalize aggregates to avoid expensive scans
4. Section-based partitioning distributes hot event load
5. LWT for critical consistency (purchase), eventual for aggregates
6. Map each UI screen to a table

## Further Reading

- [Lightweight Transactions](https://cassandra.apache.org/doc/latest/cassandra/cql/dml.html#batch-statement)
- [Data Modeling for Ticketing](https://docs.datastax.com/en/dse/6.8/cql/cql/cql_using/useTicketing.html)
- [Cassandra Counters](https://cassandra.apache.org/doc/latest/cassandra/cql/types.html#counters)
