# Redis Basics: Core Data Structures

## What

Demonstrates the five fundamental Redis data structures: Strings, Hashes, Lists, Sets, and Sorted Sets.

## Why

Understanding these building blocks is essential because all Redis patterns are built on top of them. Each structure has specific performance characteristics and use cases.

## How

The example shows practical e-commerce scenarios:
- **Strings**: User names, counters (login counts)
- **Hashes**: User profiles (structured objects)
- **Lists**: Activity feeds (ordered sequences)
- **Sets**: User interests/tags (unique collections)
- **Sorted Sets**: Top customers by spending (ranked data)

## Key Commands

- `SET`, `GET`, `INCR` - String operations
- `HSET`, `HGET`, `HGETALL` - Hash operations
- `LPUSH`, `RPUSH`, `LRANGE` - List operations
- `SADD`, `SMEMBERS`, `SISMEMBER` - Set operations
- `ZADD`, `ZRANGE`, `ZRANK` - Sorted set operations

## Try It

Run the example and observe:
1. How each data structure stores data differently
2. The command output format for each type
3. O(1) operations (SISMEMBER, HGET) vs O(N) operations (SMEMBERS, LRANGE)

Check RedisInsight to visualize the data structures.

## Production Considerations

**Strings**: 
- Use for simple values, counters, booleans
- INCR/DECR are atomic - safe for concurrent updates

**Hashes**:
- More memory-efficient than JSON strings for objects
- Can update individual fields without fetching entire object
- Limited nesting (flatten your data model)

**Lists**:
- Maintain insertion order
- Fast at head/tail (LPUSH, RPOP), slow in middle
- Capped lists: Use LTRIM to keep only recent N items

**Sets**:
- O(1) membership testing
- Support set operations: union, intersection, difference
- No duplicates - adding same value twice has no effect

**Sorted Sets**:
- Members must be unique, but scores can duplicate
- Log-time operations for rank queries
- Can be used as priority queues (ZPOPMIN, ZPOPMAX)

## Further Reading

- [Redis Data Types](https://redis.io/docs/data-types/)
- [Redis Commands](https://redis.io/commands/)
