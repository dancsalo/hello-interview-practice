# Redis Leaderboards

## What

Demonstrates using Redis sorted sets to implement leaderboards with efficient ranking, score updates, and range queries.

## Why

Leaderboards are common in games, social media (top posts), and analytics (top customers). Redis sorted sets provide O(log N) operations for ranking, making them much faster than database ORDER BY queries at scale.

## How

The example uses a game leaderboard:
1. **Add scores**: `ZADD` adds players with scores
2. **Top N**: `ZREVRANGE` gets highest scorers
3. **Find rank**: `ZREVRANK` returns a player's position
4. **Update score**: `ZINCRBY` atomically increments
5. **Range queries**: `ZRANGEBYSCORE` gets players in score range
6. **Cleanup**: `ZREMRANGEBYRANK` keeps only top 100

## Key Commands

- `ZADD` - Add member with score (or update existing score)
- `ZREVRANGE` - Get members in descending score order
- `ZREVRANK` - Get member's rank (0-based, highest score = rank 0)
- `ZSCORE` - Get member's current score
- `ZINCRBY` - Atomically increment member's score
- `ZRANGEBYSCORE` - Get members within score range
- `ZREMRANGEBYRANK` - Remove members by rank range

## Try It

Run the example and observe:
1. Players sorted by score automatically
2. Rank lookups (what's my position?)
3. Score updates and rank changes
4. Range queries (show me 7000-8000 point players)
5. Pagination (ranks 4-6)

Check RedisInsight to see the sorted set visualization.

## Production Considerations

### Time-Based Leaderboards

**Daily/Weekly/Monthly boards**:
```typescript
// Separate sorted set per period
const dailyKey = `leaderboard:daily:${YYYY-MM-DD}`;
const weeklyKey = `leaderboard:weekly:${YYYY-Www}`;

// Add score to all relevant boards
await client.zIncrBy(dailyKey, 100, 'player:alice');
await client.zIncrBy(weeklyKey, 100, 'player:alice');

// Expire old boards
await client.expire(dailyKey, 86400 * 7); // Keep for a week
```

**Rolling windows** (last 24 hours):
```typescript
// Use timestamp as score
const timestamp = Date.now();
await client.zAdd('leaderboard:rolling', [
  { score: timestamp, value: `player:alice:${timestamp}` }
]);

// Remove entries older than 24 hours
const cutoff = Date.now() - 86400000;
await client.zRemRangeByScore('leaderboard:rolling', 0, cutoff);
```

### Global vs Regional Leaderboards

**Separate boards**:
```typescript
await client.zAdd('leaderboard:us', [{ score: 9800, value: 'player:alice' }]);
await client.zAdd('leaderboard:eu', [{ score: 8500, value: 'player:bob' }]);
```

**Aggregate for global view**:
```typescript
// Combine multiple boards
await client.zUnionStore('leaderboard:global', [
  'leaderboard:us',
  'leaderboard:eu'
]);
```

### Pagination Strategy

For large leaderboards, use cursor-based pagination:
```typescript
// Page 1: ranks 0-99
const page1 = await client.zRevRange(leaderboardKey, 0, 99);

// Page 2: ranks 100-199
const page2 = await client.zRevRange(leaderboardKey, 100, 199);
```

For "show ranks around me":
```typescript
const myRank = await client.zRevRank(leaderboardKey, 'player:alice') || 0;
const start = Math.max(0, myRank - 5);
const end = myRank + 5;
const nearby = await client.zRevRange(leaderboardKey, start, end);
```

### Handling Ties

When scores are equal, Redis uses lexicographical order:
```typescript
await client.zAdd('leaderboard', [
  { score: 1000, value: 'alice' },
  { score: 1000, value: 'bob' },
  { score: 1000, value: 'charlie' },
]);
// Order: alice, bob, charlie (alphabetical)
```

To break ties by timestamp:
```typescript
// Use composite score: main_score + small_timestamp_fraction
const score = mainScore + (timestamp / 1e15);
await client.zAdd('leaderboard', [{ score, value: playerId }]);
```

### Memory Optimization

**Estimate**:
- Each entry: ~40 bytes (member + score + pointers)
- 1 million entries: ~40 MB
- 10 million entries: ~400 MB

**Cleanup strategies**:
```typescript
// Keep only top 10,000
await client.zRemRangeByRank('leaderboard', 0, -10001);

// Remove players below threshold
await client.zRemRangeByScore('leaderboard', 0, 1000);

// Remove inactive players (use timestamp as score)
const monthAgo = Date.now() - 30 * 86400000;
await client.zRemRangeByScore('leaderboard:activity', 0, monthAgo);
```

### Performance at Scale

**Complexity**:
- ZADD: O(log N)
- ZRANGE: O(log N + M) where M is result count
- ZRANK: O(log N)
- ZINCRBY: O(log N)

**Bottleneck**: Single sorted set limited to one Redis node

**Solutions**:
- **Sharding**: Multiple leaderboards, aggregate on read
- **Read replicas**: Route reads to replicas
- **Caching**: Cache top 100 in application memory, refresh every 10s
- **Approximate**: For huge scale, use HyperLogLog or bloom filters for "am I in top X?"

## Further Reading

- [Redis Sorted Sets](https://redis.io/docs/data-types/sorted-sets/)
- [Leaderboard Pattern](https://redis.io/docs/manual/patterns/leaderboard/)
