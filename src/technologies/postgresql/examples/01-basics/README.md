# PostgreSQL Basics: Core SQL Operations

## What

Demonstrates fundamental SQL operations: CRUD (Create, Read, Update, Delete), table relationships, foreign keys, and basic joins.

## Why

Understanding these building blocks is essential since all PostgreSQL patterns are built on top of them. Shows when PostgreSQL's referential integrity is valuable vs when it adds overhead.

## How

The example uses an e-commerce scenario with:
- **users table**: Basic user information
- **orders table**: Orders with foreign key to users
- Demonstrates INNER JOIN (matching records only)
- Demonstrates LEFT JOIN (all users, even without orders)
- Shows foreign key constraint violations
- Shows CASCADE delete behavior

## Key Commands

- `CREATE TABLE` - Define table structure
- `INSERT`, `SELECT`, `UPDATE`, `DELETE` - CRUD operations
- `REFERENCES` - Foreign key constraint
- `ON DELETE CASCADE` - Cascading deletes
- `INNER JOIN` - Match records from both tables
- `LEFT JOIN` - All records from left table, matching from right

## Try It

Run the example via CLI and observe:
1. How foreign keys enforce referential integrity
2. The difference between INNER JOIN and LEFT JOIN
3. Cascading delete behavior
4. Constraint violation errors

Inspect the data manually:
```bash
psql -h localhost -p 5432 -U demo -d ecommerce
\dt
SELECT * FROM users;
SELECT * FROM orders;
```

## Production Considerations

**Foreign Keys:**
- Ensure data integrity automatically
- Add overhead on writes (constraint checks)
- Can cause cascading issues if not carefully designed
- Consider soft deletes instead of CASCADE for audit trails

**Normalization vs Denormalization:**
- Normalize to avoid data duplication
- Denormalize for read-heavy workloads
- Trade-off: data integrity vs query performance

**Indexes on Foreign Keys:**
- PostgreSQL doesn't auto-index foreign keys
- Manually create indexes on FK columns for join performance
- Example: `CREATE INDEX idx_orders_user_id ON orders(user_id)`

**N+1 Query Problem:**
- Loading users then looping to load orders is slow
- Use JOINs or eager loading to fetch related data in one query
- Covered more in optimization example

## Further Reading

- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [PostgreSQL Joins](https://www.postgresql.org/docs/current/tutorial-join.html)
