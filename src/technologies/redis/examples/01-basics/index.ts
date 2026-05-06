import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const basicsExample: Example = {
  name: 'Basics: Data Structures',
  description: 'Strings, Hashes, Lists, Sets, and Sorted Sets',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Basics: Core Data Structures');
    logger.info('E-commerce user profiles and activity tracking\n');

    // Strings
    logger.step('Step 1: Strings - Simple key-value storage');
    await client.set('user:1001:name', 'Alice Johnson');
    logger.command('SET user:1001:name "Alice Johnson"');

    const name = await client.get('user:1001:name');
    logger.command('GET user:1001:name', name || '');
    logger.assert(name === 'Alice Johnson', 'String stored and retrieved correctly');

    // Increment counter
    await client.set('user:1001:login_count', '0');
    const count = await client.incr('user:1001:login_count');
    logger.command('INCR user:1001:login_count', count.toString());
    logger.assert(count === 1, 'Counter incremented');
    logger.production('Use INCR for atomic counters (page views, likes, etc.)\n');

    // Hashes
    logger.step('Step 2: Hashes - Object storage');
    await client.hSet('user:1001:profile', {
      name: 'Alice Johnson',
      email: 'alice@example.com',
      age: '28',
      city: 'San Francisco',
    });
    logger.command('HSET user:1001:profile name "Alice Johnson" email "alice@example.com" ...');

    const profile = await client.hGetAll('user:1001:profile');
    logger.command('HGETALL user:1001:profile', JSON.stringify(profile, null, 2));
    logger.assert(profile.name === 'Alice Johnson', 'Hash stored correctly');
    logger.production('Hashes are memory-efficient for objects with many fields\n');

    // Lists
    logger.step('Step 3: Lists - Activity feed');
    await client.lPush('user:1001:activity', [
      'Purchased item #5432',
      'Added item to cart',
      'Viewed product page',
    ]);
    logger.command('LPUSH user:1001:activity "Purchased item #5432" ...');

    const activities = await client.lRange('user:1001:activity', 0, 2);
    logger.command('LRANGE user:1001:activity 0 2', JSON.stringify(activities, null, 2));
    logger.assert(activities.length === 3, 'List populated correctly');
    logger.production('Lists maintain insertion order - perfect for feeds, logs, queues\n');

    // Sets
    logger.step('Step 4: Sets - User tags/interests');
    await client.sAdd('user:1001:interests', ['electronics', 'books', 'gaming', 'music']);
    logger.command('SADD user:1001:interests electronics books gaming music');

    const interests = await client.sMembers('user:1001:interests');
    logger.command('SMEMBERS user:1001:interests', JSON.stringify(interests));

    const hasGaming = await client.sIsMember('user:1001:interests', 'gaming');
    logger.command('SISMEMBER user:1001:interests gaming', hasGaming.toString());
    logger.assert(hasGaming, 'Set membership check works');
    logger.production('Sets provide O(1) membership checks - great for tags, permissions\n');

    // Sorted Sets
    logger.step('Step 5: Sorted Sets - Top customers by spending');
    await client.zAdd('customers:by_spending', [
      { score: 2500, value: 'user:1001' },
      { score: 1800, value: 'user:1002' },
      { score: 3200, value: 'user:1003' },
      { score: 950, value: 'user:1004' },
    ]);
    logger.command('ZADD customers:by_spending 2500 user:1001 1800 user:1002 ...');

    const topCustomers = await client.zRangeWithScores('customers:by_spending', 0, 2, {
      REV: true,
    });
    logger.command('ZREVRANGE customers:by_spending 0 2 WITHSCORES', JSON.stringify(topCustomers, null, 2));

    const rank = await client.zRevRank('customers:by_spending', 'user:1001');
    logger.command('ZREVRANK customers:by_spending user:1001', rank?.toString() || 'null');
    logger.assert(rank !== null && rank >= 0, 'Sorted set ranking works');
    logger.production('Sorted sets power leaderboards, priority queues, time-series indexes\n');

    logger.success('\n✓ All basic data structures demonstrated!');
  },
};
