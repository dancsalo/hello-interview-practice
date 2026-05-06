import { Client } from 'pg';
import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const cacheExample: Example = {
  name: 'Cache: Cache-Aside Pattern',
  description: 'Lazy loading with TTL-based eviction',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Example: Cache-Aside Pattern');
    logger.info('Product catalog caching with PostgreSQL\n');

    // Setup PostgreSQL
    const pgClient = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      user: process.env.POSTGRES_USER || 'demo',
      password: process.env.POSTGRES_PASSWORD || 'demo',
      database: process.env.POSTGRES_DB || 'ecommerce',
    });

    await pgClient.connect();
    logger.success('Connected to PostgreSQL');

    // Create products table
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name VARCHAR(255),
        price DECIMAL(10, 2),
        inventory_count INTEGER,
        category VARCHAR(100)
      )
    `);

    // Insert sample data
    await pgClient.query(`
      INSERT INTO products (id, name, price, inventory_count, category)
      VALUES
        (123, 'Laptop Pro 15', 999.99, 50, 'electronics'),
        (124, 'Wireless Mouse', 29.99, 200, 'electronics'),
        (125, 'USB-C Cable', 12.99, 500, 'accessories')
      ON CONFLICT (id) DO NOTHING
    `);
    logger.info('Sample products inserted into PostgreSQL\n');

    // Cache-aside pattern demo
    logger.step('Step 1: Check cache for product:123 (cache miss)');
    const cacheKey = 'product:123';
    let cachedProduct = await client.get(cacheKey);
    logger.command(`GET ${cacheKey}`, cachedProduct || '(nil)');
    logger.assert(cachedProduct === null, 'Cache miss - product not in Redis');

    logger.step('Step 2: Fetch from database (slow)');
    const startDb = Date.now();
    const result = await pgClient.query('SELECT * FROM products WHERE id = $1', [123]);
    const dbTime = Date.now() - startDb;
    const product = result.rows[0];
    logger.command(`SELECT * FROM products WHERE id = 123`, JSON.stringify(product, null, 2));
    logger.info(`Database query took ${dbTime}ms`);

    logger.step('Step 3: Populate cache with 60s TTL');
    const productJson = JSON.stringify(product);
    await client.setEx(cacheKey, 60, productJson);
    logger.command(`SETEX ${cacheKey} 60 '${productJson}'`);
    logger.success('Cache populated with 60-second TTL');

    logger.step('Step 4: Verify cache hit (fast)');
    const startCache = Date.now();
    cachedProduct = await client.get(cacheKey);
    const cacheTime = Date.now() - startCache;
    logger.command(`GET ${cacheKey}`, cachedProduct || '');
    logger.info(`Cache query took ${cacheTime}ms (${Math.round(dbTime / cacheTime)}x faster!)`);
    logger.assert(cachedProduct !== null, 'Cache hit - product retrieved from Redis');

    logger.step('Step 5: Check TTL');
    const ttl = await client.ttl(cacheKey);
    logger.command(`TTL ${cacheKey}`, `${ttl} seconds remaining`);
    logger.assert(ttl > 0 && ttl <= 60, `TTL set correctly (${ttl}s remaining)`);

    logger.step('Step 6: Cache invalidation on update');
    await pgClient.query('UPDATE products SET price = $1 WHERE id = $2', [899.99, 123]);
    await client.del(cacheKey);
    logger.command(`DEL ${cacheKey}`);
    logger.success('Cache invalidated after database update\n');

    logger.production('Production Considerations:');
    logger.production('- Cache stampede: Multiple requests during miss can overwhelm DB');
    logger.production('  → Solution: Use locks or probabilistic early expiration');
    logger.production('- TTL jitter: Add randomness (±10%) to prevent synchronized expiration');
    logger.production('- Hot keys: Popular items may overload a single Redis node');
    logger.production('  → Solution: Replicate hot keys or use client-side caching');
    logger.production('- Consistency: Cache-aside can serve stale data for TTL duration');
    logger.production('  → Consider write-through caching for critical data\n');

    logger.success('✓ Cache-aside pattern demonstrated!');

    await pgClient.end();
  },
};
