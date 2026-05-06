# Redis Rate Limiting

## What

Demonstrates rate limiting patterns using Redis to control API request rates per user, IP, or other identifiers.

## Why

Rate limiting protects your API from:
- Abuse and DoS attacks
- Accidental runaway scripts
- Unfair resource usage
- Cost overruns on metered APIs

It ensures fair usage across all users and maintains system stability under load.

## How

The example shows four rate limiting approaches:

1. **Fixed Window Counter**: Simple INCR with TTL
2. **Sliding Window Log**: Sorted set tracks each request timestamp
3. **Multi-Level Limiting**: Different tiers (free/pro/enterprise)
4. **Atomic Lua Script**: Race condition-free implementation

## Key Commands

- `INCR` - Increment request counter
- `EXPIRE` - Set window TTL
- `ZADD` - Add request to sliding window
- `ZREMRANGEBYSCORE` - Remove old requests
- `ZCARD` - Count requests in window
- `EVAL` - Execute Lua script atomically

## Try It

Run the example and observe:
1. Fixed window allowing bursts at boundaries
2. Sliding window providing accurate limiting
3. Multi-tier limits for different user levels
4. Atomic operations with Lua scripts

## Production Considerations

### Fixed Window Counter

**How it works**:
```typescript
const windowKey = `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`;
const count = await redis.incr(windowKey);
await redis.expire(windowKey, 60);
if (count > 100) throw new Error('Rate limited');
```

**Pros**:
- Simple implementation
- Memory efficient (one counter per window)
- Fast (single INCR operation)

**Cons**:
- **Burst problem**: Allows 2x limit at window boundaries
  - 100 requests at 59.9 seconds
  - 100 more at 60.1 seconds
  - = 200 requests in 0.2 seconds
- Resets suddenly (poor UX)

**Best for**: Internal APIs, non-critical limits

### Sliding Window Log

**How it works**:
```typescript
const now = Date.now();
const windowStart = now - 60000;

// Remove old entries
await redis.zRemRangeByScore(key, 0, windowStart);

// Count remaining
const count = await redis.zCard(key);

if (count < 100) {
  await redis.zAdd(key, { score: now, value: requestId });
}
```

**Pros**:
- Accurate rate limiting
- No burst at boundaries
- Smooth user experience

**Cons**:
- Memory intensive (stores every request)
- More Redis commands (slower)
- Cleanup overhead

**Best for**: User-facing APIs, strict rate limits

### Sliding Window Counter (Hybrid)

A memory-efficient hybrid approach:

```typescript
const currentWindow = Math.floor(now / 60000);
const previousWindow = currentWindow - 1;

const currentCount = await redis.get(`ratelimit:${userId}:${currentWindow}`);
const previousCount = await redis.get(`ratelimit:${userId}:${previousWindow}`);

// Weight previous window by overlap
const overlap = (60000 - (now % 60000)) / 60000;
const approximateCount = currentCount + (previousCount * overlap);

if (approximateCount < 100) {
  await redis.incr(`ratelimit:${userId}:${currentWindow}`);
}
```

**Pros**:
- Memory efficient (2 counters)
- Better than fixed window
- Fast (2-3 commands)

**Cons**:
- Approximate (not exact)
- Still some burst possible

**Best for**: High-traffic APIs needing balance

### Token Bucket

For smoother rate limiting:

```typescript
// Refill tokens over time
const lastRefill = await redis.hGet(key, 'lastRefill');
const tokens = await redis.hGet(key, 'tokens');

const now = Date.now();
const timePassed = now - lastRefill;
const tokensToAdd = Math.floor(timePassed / 1000) * refillRate;

const newTokens = Math.min(tokens + tokensToAdd, maxTokens);

if (newTokens >= 1) {
  await redis.hSet(key, {
    tokens: newTokens - 1,
    lastRefill: now,
  });
  return true; // Allowed
}
return false; // Rate limited
```

**Pros**:
- Smooths out traffic
- Allows bursts up to bucket size
- Intuitive "token" model

**Cons**:
- More complex
- Needs Lua for atomicity

### Distributed Challenges

**Clock Skew**:
- Different servers have slightly different clocks
- Fixed window: Requests might be counted in wrong windows
- Sliding window: Less affected (uses relative timestamps)

**Solution**:
- Use Redis TIME command for consistent timestamps
- Or accept small inaccuracies (usually fine)

**Race Conditions**:
Multiple simultaneous requests can bypass limit:

```typescript
// Thread 1 and 2 both read count=99
const count = await redis.get(key);  // Both see 99

// Both think they're under limit
if (count < 100) {
  await redis.incr(key);  // Both increment -> 101
}
```

**Solution**: Use Lua scripts for atomicity

### Lua Script for Atomicity

```lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])

local current = redis.call('INCR', key)

if current == 1 then
  redis.call('EXPIRE', key, window)
end

if current > limit then
  return {0, current}  -- Rate limited, current count
else
  return {1, current}  -- Allowed, current count
end
```

All operations run atomically on Redis server.

### Response Headers

Always return rate limit info:

```typescript
res.setHeader('X-RateLimit-Limit', '100');
res.setHeader('X-RateLimit-Remaining', (100 - count).toString());
res.setHeader('X-RateLimit-Reset', nextResetTime.toString());

if (rateLimited) {
  res.setHeader('Retry-After', secondsUntilReset.toString());
  return res.status(429).json({ error: 'Too many requests' });
}
```

### Multi-Dimensional Limiting

Combine different limits:

```typescript
// Per user: 100/hour
await checkRateLimit(`user:${userId}`, 100, 3600);

// Per IP: 1000/hour (prevent single IP from many users)
await checkRateLimit(`ip:${ipAddress}`, 1000, 3600);

// Per API key: depends on tier
await checkRateLimit(`key:${apiKey}`, tierLimit, 3600);

// Global: 100k/hour (protect entire system)
await checkRateLimit('global', 100000, 3600);
```

### Memory Considerations

**Fixed window**: `O(users * time_periods)`
- 1M users, 1 hour windows = 1M keys max
- Each key = ~100 bytes
- Total = ~100 MB

**Sliding window**: `O(total_requests_in_window)`
- 1M users, 100 req/min each = 100M entries
- Each entry = ~50 bytes (timestamp + ID)
- Total = ~5 GB

**Mitigation**:
- Use shorter windows (1 minute instead of 1 hour)
- Use hybrid approach
- Clean up inactive users
- Use Redis Cluster for sharding

### When Not to Use Redis

**Use API Gateway** if:
- You use AWS/GCP/Azure (API Gateway, Cloud Endpoints, APIM)
- Need advanced features (quotas, analytics, billing)
- Want managed solution

**Use Application-Level** if:
- Single server deployment
- Very low traffic
- In-memory cache sufficient

**Use Redis** when:
- Distributed system (multiple servers)
- High traffic (millions of requests)
- Need custom logic
- Want granular control
- Cost-sensitive (managed gateways expensive at scale)

### Testing Rate Limits

```typescript
describe('Rate Limiter', () => {
  it('allows requests under limit', async () => {
    for (let i = 0; i < 100; i++) {
      const result = await checkRateLimit('user:test', 100, 60);
      expect(result.allowed).toBe(true);
    }
  });

  it('blocks requests over limit', async () => {
    for (let i = 0; i < 100; i++) {
      await checkRateLimit('user:test', 100, 60);
    }
    const result = await checkRateLimit('user:test', 100, 60);
    expect(result.allowed).toBe(false);
  });

  it('resets after window', async () => {
    // Fill bucket
    for (let i = 0; i < 100; i++) {
      await checkRateLimit('user:test', 100, 1);
    }

    // Wait for window
    await sleep(1100);

    // Should work again
    const result = await checkRateLimit('user:test', 100, 1);
    expect(result.allowed).toBe(true);
  });
});
```

### Monitoring

Track these metrics:
- Rate limit hits per user/IP/endpoint
- 429 response rate
- P99 time to check rate limit
- False positives from clock skew
- Memory usage growth

Alert on:
- Sudden spike in 429s (possible attack)
- Single user hitting limits repeatedly
- Global limit approaching capacity

## Further Reading

- [Redis Rate Limiting Patterns](https://redis.io/glossary/rate-limiting/)
- [Scaling your API with rate limiters](https://stripe.com/blog/rate-limiters)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Generic Cell Rate Algorithm (GCRA)](https://brandur.org/rate-limiting)
