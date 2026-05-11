#!/usr/bin/env tsx
/**
 * Integration test script
 * Tests that examples can be run programmatically
 */

import { RedisClient } from '../src/technologies/redis/client.js';
import { Logger } from '../src/lib/logger.js';
import { basicsExample } from '../src/technologies/redis/examples/01-basics/index.js';
import { cacheExample } from '../src/technologies/redis/examples/02-cache/index.js';
import { rateLimitingExample } from '../src/technologies/redis/examples/05-rate-limiting/index.js';
import type { Example, RedisExample } from '../src/lib/types.js';

// Type guard to check if an example is a RedisExample
function isRedisExample(example: Example): example is RedisExample {
  return 'cleanup' in example;
}

async function testIntegration() {
  // Set environment variables for PostgreSQL connection
  process.env.POSTGRES_PORT = '5433';

  const redisClient = new RedisClient();
  const logger = new Logger();

  try {
    console.log('🧪 Starting integration tests...\n');

    // Connect to Redis
    console.log('Connecting to Redis...');
    await redisClient.connect();
    const healthy = await redisClient.healthCheck();
    if (!healthy) {
      throw new Error('Redis health check failed');
    }
    console.log('✓ Connected to Redis\n');

    const client = redisClient.getClient();

    // Test 1: Basics Example
    console.log('═'.repeat(70));
    console.log('Test 1: Running Basics Example');
    console.log('═'.repeat(70));
    await basicsExample.run(client, logger);
    if (isRedisExample(basicsExample) && basicsExample.cleanup) {
      await basicsExample.cleanup(client);
    }
    console.log('\n✓ Basics example completed\n');

    // Test 2: Cache Example
    console.log('═'.repeat(70));
    console.log('Test 2: Running Cache Example');
    console.log('═'.repeat(70));
    await cacheExample.run(client, logger);
    if (isRedisExample(cacheExample) && cacheExample.cleanup) {
      await cacheExample.cleanup(client);
    }
    console.log('\n✓ Cache example completed\n');

    // Test 3: Rate Limiting Example
    console.log('═'.repeat(70));
    console.log('Test 3: Running Rate Limiting Example');
    console.log('═'.repeat(70));
    await rateLimitingExample.run(client, logger);
    if (isRedisExample(rateLimitingExample) && rateLimitingExample.cleanup) {
      await rateLimitingExample.cleanup(client);
    }
    console.log('\n✓ Rate limiting example completed\n');

    console.log('═'.repeat(70));
    console.log('🎉 All integration tests passed!');
    console.log('═'.repeat(70));

    await redisClient.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    await redisClient.disconnect();
    process.exit(1);
  }
}

testIntegration();
