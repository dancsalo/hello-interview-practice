#!/usr/bin/env tsx
/**
 * Comprehensive test runner for all examples across all technologies
 * Runs Redis and Kafka examples, reports aggregate results
 */

import { RedisClient } from '../src/technologies/redis/client.js';
import { KafkaClient } from '../src/technologies/kafka/client.js';
import { Logger } from '../src/lib/logger.js';

// Redis examples
import { basicsExample as redisBasics } from '../src/technologies/redis/examples/01-basics/index.js';
import { cacheExample } from '../src/technologies/redis/examples/02-cache/index.js';
import { distributedLockExample } from '../src/technologies/redis/examples/03-distributed-lock/index.js';
import { leaderboardsExample } from '../src/technologies/redis/examples/04-leaderboards/index.js';
import { rateLimitingExample } from '../src/technologies/redis/examples/05-rate-limiting/index.js';
import { proximitySearchExample } from '../src/technologies/redis/examples/06-proximity-search/index.js';
import { eventSourcingExample } from '../src/technologies/redis/examples/07-event-sourcing/index.js';
import { pubSubExample } from '../src/technologies/redis/examples/08-pubsub/index.js';
import { bloomFiltersExample } from '../src/technologies/redis/examples/09-bloom-filters/index.js';
import { timeSeriesExample } from '../src/technologies/redis/examples/10-time-series/index.js';

// Kafka examples
import { basicsExample as kafkaBasics } from '../src/technologies/kafka/examples/01-basics/index.js';
import { partitioningExample } from '../src/technologies/kafka/examples/02-partitioning/index.js';

import type { Example, RedisExample } from '../src/lib/types.js';

// Type guard
function isRedisExample(example: Example): example is RedisExample {
  return 'cleanup' in example;
}

interface TestResult {
  technology: string;
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

const REDIS_EXAMPLES = [
  redisBasics,
  cacheExample,
  distributedLockExample,
  leaderboardsExample,
  rateLimitingExample,
  proximitySearchExample,
  eventSourcingExample,
  pubSubExample,
  bloomFiltersExample,
  timeSeriesExample,
];

const KAFKA_EXAMPLES = [
  kafkaBasics,
  partitioningExample,
];

async function testRedisExamples(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const redisClient = new RedisClient();
  const logger = new Logger();

  try {
    console.log('\n📦 Testing Redis Examples');
    console.log('═'.repeat(70));

    await redisClient.connect();
    console.log('✓ Connected to Redis\n');

    const client = redisClient.getClient();

    for (const example of REDIS_EXAMPLES) {
      const startTime = Date.now();
      console.log(`Testing: ${example.name}`);

      try {
        await example.run(client, logger);

        // Cleanup if available
        if (isRedisExample(example) && example.cleanup) {
          await example.cleanup(client);
        }

        const duration = Date.now() - startTime;
        results.push({
          technology: 'Redis',
          name: example.name,
          success: true,
          duration,
        });
        console.log(`✓ ${example.name} passed (${duration}ms)\n`);
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          technology: 'Redis',
          name: example.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration,
        });
        console.log(`✗ ${example.name} failed: ${error}\n`);
      }

      // Reset Redis between examples
      await redisClient.reset();
    }

    await redisClient.disconnect();
  } catch (error) {
    console.error('✗ Redis test suite setup failed:', error);
    await redisClient.disconnect();
  }

  return results;
}

async function testKafkaExamples(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const kafkaClient = new KafkaClient();
  const logger = new Logger();

  try {
    console.log('\n📨 Testing Kafka Examples');
    console.log('═'.repeat(70));

    await kafkaClient.connect();
    console.log('✓ Connected to Kafka\n');

    for (const example of KAFKA_EXAMPLES) {
      const startTime = Date.now();
      console.log(`Testing: ${example.name}`);

      try {
        await example.run(kafkaClient, logger);

        const duration = Date.now() - startTime;
        results.push({
          technology: 'Kafka',
          name: example.name,
          success: true,
          duration,
        });
        console.log(`✓ ${example.name} passed (${duration}ms)\n`);
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          technology: 'Kafka',
          name: example.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          duration,
        });
        console.log(`✗ ${example.name} failed: ${error}\n`);
      }

      // Reset Kafka between examples
      await kafkaClient.reset();
    }

    await kafkaClient.disconnect();
  } catch (error) {
    console.error('✗ Kafka test suite setup failed:', error);
    await kafkaClient.disconnect();
  }

  return results;
}

async function testAll() {
  console.log('🧪 Testing All Examples Across All Technologies\n');
  const startTime = Date.now();

  // Run tests for each technology
  const redisResults = await testRedisExamples();
  const kafkaResults = await testKafkaExamples();

  const allResults = [...redisResults, ...kafkaResults];
  const totalDuration = Date.now() - startTime;

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(70));

  const byTechnology = {
    Redis: redisResults,
    Kafka: kafkaResults,
  };

  for (const [tech, results] of Object.entries(byTechnology)) {
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const total = results.length;

    console.log(`\n${tech}:`);
    console.log(`  Total: ${total}`);
    console.log(`  Passed: ${passed} ✓`);
    console.log(`  Failed: ${failed} ${failed > 0 ? '✗' : ''}`);

    if (failed > 0) {
      console.log(`\n  Failed tests:`);
      results
        .filter(r => !r.success)
        .forEach(r => console.log(`    - ${r.name}: ${r.error}`));
    }
  }

  const totalPassed = allResults.filter(r => r.success).length;
  const totalFailed = allResults.filter(r => !r.success).length;
  const totalTests = allResults.length;

  console.log('\n' + '═'.repeat(70));
  console.log('OVERALL:');
  console.log(`  Total: ${totalTests}`);
  console.log(`  Passed: ${totalPassed} ✓`);
  console.log(`  Failed: ${totalFailed} ${totalFailed > 0 ? '✗' : ''}`);
  console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log('═'.repeat(70));

  if (totalFailed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

testAll();
