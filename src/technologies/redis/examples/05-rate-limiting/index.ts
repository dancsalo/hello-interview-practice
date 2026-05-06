import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const rateLimitingExample: Example = {
  name: 'Rate Limiting',
  description: 'Fixed window and sliding window rate limiters',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Example: Rate Limiting');
    logger.info('API rate limiting for user requests\n');

    const userId = 'user:1001';
    const now = Date.now();

    // Fixed Window Rate Limiter
    logger.step('Step 1: Fixed Window Rate Limiter');
    logger.info('Allow 5 requests per 10 seconds per user\n');

    const fixedWindowKey = `ratelimit:fixed:${userId}:${Math.floor(now / 10000)}`;
    logger.info(`Window key: ${fixedWindowKey}`);

    for (let i = 1; i <= 7; i++) {
      const count = await client.incr(fixedWindowKey);
      logger.command(`INCR ${fixedWindowKey}`, count.toString());

      if (i === 1) {
        // Set TTL on first request
        await client.expire(fixedWindowKey, 10);
        logger.command(`EXPIRE ${fixedWindowKey} 10`);
      }

      if (count <= 5) {
        logger.success(`Request ${i}: Allowed (${count}/5)`);
      } else {
        logger.warning(`Request ${i}: Rate limited (${count}/5)`);
      }
    }

    logger.production('\nFixed Window Issues:');
    logger.production('- Burst at window boundaries (10 requests in 1 second)');
    logger.production('- 5 requests at 9.9s, 5 more at 10.1s = 10 requests in 0.2s\n');

    // Sliding Window Rate Limiter
    logger.step('Step 2: Sliding Window Rate Limiter (Sorted Set)');
    logger.info('More accurate: 5 requests per 10 second sliding window\n');

    const slidingWindowKey = `ratelimit:sliding:${userId}`;
    const windowSize = 10000; // 10 seconds in ms
    const maxRequests = 5;

    for (let i = 1; i <= 7; i++) {
      const currentTime = Date.now();
      const windowStart = currentTime - windowSize;

      // Remove old entries outside the window
      await client.zRemRangeByScore(slidingWindowKey, 0, windowStart);
      logger.command(`ZREMRANGEBYSCORE ${slidingWindowKey} 0 ${windowStart}`);

      // Count requests in current window
      const count = await client.zCard(slidingWindowKey);
      logger.command(`ZCARD ${slidingWindowKey}`, count.toString());

      if (count < maxRequests) {
        // Add this request
        const requestId = `${currentTime}:${i}`;
        await client.zAdd(slidingWindowKey, { score: currentTime, value: requestId });
        logger.command(`ZADD ${slidingWindowKey} ${currentTime} ${requestId}`);
        logger.success(`Request ${i}: Allowed (${count + 1}/${maxRequests})`);
      } else {
        logger.warning(`Request ${i}: Rate limited (${count}/${maxRequests})`);
      }

      // Set TTL for cleanup
      await client.expire(slidingWindowKey, Math.ceil(windowSize / 1000));

      // Small delay to demonstrate timing
      if (i <= 6) await new Promise(resolve => setTimeout(resolve, 50));
    }

    logger.production('\nSliding Window Advantages:');
    logger.production('- No burst at boundaries');
    logger.production('- More accurate rate limiting');
    logger.production('- Higher memory usage (stores each request)\n');

    // Multi-level Rate Limiting
    logger.step('Step 3: Multi-Level Rate Limiting');
    logger.info('Different limits for different tiers\n');

    const limits = {
      free: { requests: 10, window: 60 },
      pro: { requests: 100, window: 60 },
      enterprise: { requests: 1000, window: 60 },
    };

    const userTier = 'pro';
    const tierLimit = limits[userTier];
    const tierKey = `ratelimit:tier:${userTier}:${userId}`;

    logger.info(`User tier: ${userTier}`);
    logger.info(`Limit: ${tierLimit.requests} requests per ${tierLimit.window} seconds\n`);

    const tierCount = await client.incr(tierKey);
    await client.expire(tierKey, tierLimit.window);
    logger.command(`INCR ${tierKey}`, tierCount.toString());
    logger.command(`EXPIRE ${tierKey} ${tierLimit.window}`);

    if (tierCount <= tierLimit.requests) {
      logger.success(`Request allowed: ${tierCount}/${tierLimit.requests}`);
    } else {
      logger.warning(`Rate limited: ${tierCount}/${tierLimit.requests}`);
    }

    // Lua Script for Atomic Rate Limiting
    logger.step('Step 4: Atomic Rate Limiting with Lua');
    logger.info('Use Lua script to make rate limiting atomic\n');

    const luaScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])

      local current = redis.call('INCR', key)

      if current == 1 then
        redis.call('EXPIRE', key, window)
      end

      if current > limit then
        return 0  -- Rate limited
      else
        return 1  -- Allowed
      end
    `;

    const atomicKey = `ratelimit:atomic:${userId}`;
    const allowed = await client.eval(luaScript, {
      keys: [atomicKey],
      arguments: ['5', '10'],
    });

    logger.command('EVAL <lua_script> 1 <key> 5 10', allowed?.toString() || '0');

    if (allowed === 1) {
      logger.success('Request allowed (atomic check)');
    } else {
      logger.warning('Rate limited (atomic check)');
    }

    logger.production('\nLua Script Benefits:');
    logger.production('- Atomic operation (no race conditions)');
    logger.production('- Single round trip to Redis');
    logger.production('- Consistent state even under high concurrency\n');

    logger.production('\nProduction Considerations:');
    logger.production('- Fixed window: Simple but allows bursts');
    logger.production('- Sliding window: Accurate but more memory');
    logger.production('- Use Lua scripts for atomicity');
    logger.production('- Consider token bucket for smoother rate limiting');
    logger.production('- Monitor false positives from clock skew');
    logger.production('- Add X-RateLimit headers (limit, remaining, reset)');
    logger.production('- Use different keys for IP vs user vs API key');
    logger.production('- Clean up old keys with TTL\n');

    logger.success('✓ Rate limiting patterns demonstrated!');
  },
};
