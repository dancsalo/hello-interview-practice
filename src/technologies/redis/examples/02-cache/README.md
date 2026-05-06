# Redis Cache: Cache-Aside Pattern

## What

Demonstrates the cache-aside (lazy loading) pattern where the application checks the cache before querying the database, populating the cache on misses.

## Why

Caching reduces database load and improves response times. Redis' in-memory storage provides microsecond latency compared to milliseconds for database queries. A 10-100x speedup is common.

## How

The example uses a product catalog:
1. **Cache miss**: Check Redis, key doesn't exist
2. **Fetch from DB**: Query PostgreSQL for product
3. **Populate cache**: Store result in Redis with TTL
4. **Cache hit**: Subsequent requests served from Redis
5. **Invalidation**: Delete cache entry on updates

## Key Commands

- `GET` - Check if key exists in cache
- `SETEX` - Set key with expiration (combines SET + EXPIRE)
- `TTL` - Check remaining time-to-live
- `DEL` - Remove key (cache invalidation)
- `EXPIRE` - Set expiration on existing key

## Try It

Run the example and observe:
1. Cache miss → Database query (10-20ms)
2. Cache hit → Redis query (<1ms)
3. The speedup ratio (often 10-100x)
4. TTL countdown

Check RedisInsight to see the cached product and watch it expire.

## Production Considerations

### Cache Stampede
**Problem**: When a popular key expires, many requests simultaneously hit the database.

**Solutions**:
- **Locks**: First request acquires lock, others wait for cache to populate
- **Probabilistic early expiration**: Recompute before TTL expires based on load
- **Always-on cache**: Never let hot keys expire, update in background

### TTL Jitter
**Problem**: If many keys have same TTL, they expire simultaneously causing load spike.

**Solution**: Add randomness to TTL
```typescript
const baseTTL = 300; // 5 minutes
const jitter = Math.random() * 60; // ±30 seconds
await client.setEx(key, baseTTL + jitter, value);
```

### Hot Key Problem
**Problem**: A single popular item can overwhelm one Redis node in a cluster.

**Solutions**:
- **Read replicas**: Route reads to replicas
- **Key replication**: Store same data under multiple keys, randomize access
- **Client-side caching**: Cache extremely hot data in application memory

### Cache Consistency
**Problem**: Cache-aside can serve stale data until TTL expires.

**Solutions**:
- **Write-through**: Update cache on every write (stronger consistency)
- **Cache invalidation**: Delete key on update (next read fetches fresh data)
- **Change Data Capture**: Stream database changes to invalidate cache
- **Short TTLs**: For critical data, use seconds not minutes

### When Not to Cache
- Highly personalized data (low hit rate)
- Data that changes frequently
- Data where staleness is unacceptable
- Data that's already fast to query

## Further Reading

- [Caching Strategies](https://redis.io/docs/manual/patterns/caching/)
- [Cache Stampede Prevention](https://redis.io/docs/manual/programmability/)
