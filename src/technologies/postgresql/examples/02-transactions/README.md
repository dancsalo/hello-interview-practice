# PostgreSQL Transactions: ACID & Consistency

## What

Demonstrates ACID properties, transaction blocks, isolation levels, and row-level locking for concurrent operations.

## Why

Transactions are the core differentiator between PostgreSQL and NoSQL databases. This is one of the most common interview topics - candidates need to explain not just what transactions are, but when to use different isolation levels and locking strategies.

## How

The example covers:
- **Atomicity**: Bank transfers that either fully succeed or fully rollback
- **Consistency**: CHECK constraints preventing invalid states
- **Isolation**: Race conditions in auction bidding and how to fix them
- **Row-Level Locking**: Using SELECT ... FOR UPDATE to prevent concurrent updates

## Key Commands

- `BEGIN`, `COMMIT`, `ROLLBACK` - Transaction control
- `SELECT ... FOR UPDATE` - Row-level locking
- `SET TRANSACTION ISOLATION LEVEL` - Change isolation level
- `CHECK` constraint - Enforce data validity

## Try It

Run the example and observe:
1. Successful transaction committing both updates atomically
2. Failed transaction rolling back both updates
3. Race condition with default isolation
4. Fixed race condition with row-level locking

## Production Considerations

**Isolation Levels:**

| Level | Dirty Read | Non-Repeatable Read | Phantom Read | Serialization Anomaly |
|-------|-----------|-------------------|-------------|---------------------|
| Read Committed (default) | No | Yes | Yes | Yes |
| Repeatable Read | No | No | No (in PG) | Yes |
| Serializable | No | No | No | No |

**When to Use Row-Level Locking:**
- Inventory management (prevent overselling)
- Auction bidding (highest bid wins)
- Ticket booking (prevent double-booking)
- Any case where you need to read-then-update atomically

**When to Use Higher Isolation:**
- Complex financial calculations across multiple tables
- When you can't identify exactly which rows to lock
- Trade-off: Serializable isolation requires retry logic for conflicts

**Optimistic Locking Alternative:**
```sql
-- Add version column
ALTER TABLE items ADD COLUMN version INT DEFAULT 0;

-- Update only if version matches
UPDATE items
SET quantity = quantity - 1, version = version + 1
WHERE id = $1 AND version = $2;

-- If rowCount = 0, someone else updated it - retry
```

**Deadlock Prevention:**
- Always lock rows in the same order
- Keep transactions short
- Use timeouts: `SET lock_timeout = '2s'`

## Further Reading

- [PostgreSQL Transaction Isolation](https://www.postgresql.org/docs/current/transaction-iso.html)
- [PostgreSQL Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [ACID Properties Explained](https://www.postgresql.org/docs/current/tutorial-transactions.html)
