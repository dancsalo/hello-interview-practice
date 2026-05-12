# Document Versioning: Concurrent Updates

## What

Demonstrates Elasticsearch's optimistic concurrency control using _version, _seq_no, and _primary_term to prevent lost updates in distributed systems. Shows how to detect conflicts, implement retry logic, and use atomic script-based updates.

## Why

In distributed systems, multiple processes may try to update the same document simultaneously. Without concurrency control, lost updates occur (last write wins, discarding earlier changes). Critical for interviews involving inventory management, distributed transactions, or any system where data consistency matters.

## How

The example demonstrates product inventory management:
- **_version**: Auto-incrementing version number for each document
- **_seq_no + _primary_term**: Sequence number for precise concurrency control
- **if_seq_no / if_primary_term**: Conditional update parameters
- **Conflict Detection**: 409 error when version check fails
- **Retry Pattern**: Read-modify-write with version check
- **Atomic Scripts**: Server-side updates without read-modify-write

## Key Commands

- `_version` - Document version (auto-incremented on updates)
- `_seq_no` - Sequence number for ordering operations
- `_primary_term` - Primary shard term for failover detection
- `if_seq_no` - Conditional update parameter
- `if_primary_term` - Conditional update parameter
- `script` - Atomic server-side update without race conditions

## Try It

Run the example and observe:
1. _version starts at 1 and increments with each update
2. Updates without version check always succeed (last write wins)
3. Concurrent update with stale version fails with 409 conflict
4. Retry with current version succeeds
5. Script-based updates are atomic (no read-modify-write needed)
6. if_seq_no + if_primary_term provide precise concurrency control

Check the 409 conflict error - this is optimistic locking in action.

## Production Considerations

**Concurrency Control Strategy:**
- Optimistic locking: Assume no conflicts, check on update (Elasticsearch approach)
- Pessimistic locking: Lock before update (not supported by Elasticsearch)
- Last write wins: No version checks (dangerous for critical data)
- Atomic operations: Use scripts to avoid read-modify-write

**When to Use Version Checks:**
- Inventory updates (prevent overselling)
- Price changes (ensure consistency)
- Counter increments (use scripts instead for atomicity)
- Critical business data (financial, medical)
- Avoid for append-only data (logs, events)

**Retry Strategy:**
- Detect 409 conflict errors
- Re-read document to get current version
- Re-apply business logic with new data
- Retry with updated version
- Implement exponential backoff for high contention
- Consider maximum retry limit

**Script-Based Updates:**
- Scripts execute on server, no read-modify-write race
- Use for counters, numeric operations, array manipulation
- Painless scripting language (sandboxed, safe)
- More efficient than read-modify-write cycle
- Can include conditional logic (if inventory > 0, decrement)
- Stored scripts for reusability

**Performance:**
- Version checks have minimal overhead
- Conflicts trigger retries (high contention = performance impact)
- Scripts avoid network round-trip for read-modify-write
- High conflict rate indicates need for design change
- Consider pre-sharding or changing data model

**Version vs Seq No:**
- _version: Simple, user-friendly, increments per document
- _seq_no + _primary_term: More precise, handles shard failover
- Use _seq_no for production systems (recommended)
- _version deprecated for concurrency control in newer ES versions

**Alternative Approaches:**
- Reduce contention: Shard by user/session to isolate updates
- Event sourcing: Append events instead of updating state
- Eventual consistency: Accept last write wins for non-critical data
- External locking: Use Redis, ZooKeeper for pessimistic locks
- Database transactions: Use relational DB for strong consistency needs

**Interview Examples:**
- "Design inventory system" - Version checks to prevent overselling
- "Implement distributed counter" - Script-based atomic increments
- "Handle concurrent price updates" - Optimistic locking with retries
- "Prevent lost updates" - Seq no + primary term checks
- "Design ticket booking system" - Atomic reservation with scripts

## Further Reading

- [Optimistic Concurrency Control](https://www.elastic.co/guide/en/elasticsearch/reference/current/optimistic-concurrency-control.html)
- [Update API](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-update.html)
- [Scripting](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-scripting.html)
- [Painless Scripting Language](https://www.elastic.co/guide/en/elasticsearch/painless/current/index.html)
