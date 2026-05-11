#!/usr/bin/env tsx
import { config } from 'dotenv';
import { RedisClient } from '../src/technologies/redis/client.js';
import { Logger } from '../src/lib/logger.js';
import { StepByStepLogger } from '../src/lib/step-by-step-logger.js';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';

// Load environment variables from .env file
config();

// Import all Redis examples
import { basicsExample } from '../src/technologies/redis/examples/01-basics/index.js';
import { cacheExample } from '../src/technologies/redis/examples/02-cache/index.js';
import { distributedLockExample } from '../src/technologies/redis/examples/03-distributed-lock/index.js';
import { leaderboardsExample } from '../src/technologies/redis/examples/04-leaderboards/index.js';
import { rateLimitingExample } from '../src/technologies/redis/examples/05-rate-limiting/index.js';
import { proximitySearchExample } from '../src/technologies/redis/examples/06-proximity-search/index.js';
import { eventSourcingExample } from '../src/technologies/redis/examples/07-event-sourcing/index.js';
import { pubSubExample } from '../src/technologies/redis/examples/08-pubsub/index.js';
import { bloomFiltersExample } from '../src/technologies/redis/examples/09-bloom-filters/index.js';
import { timeSeriesExample } from '../src/technologies/redis/examples/10-time-series/index.js';
import type { Example } from '../src/lib/types.js';

const REDIS_EXAMPLES: Example[] = [
  basicsExample,
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

interface TestResult {
  example: string;
  success: boolean;
  error?: string;
  duration: number;
}

async function testExample(
  example: Example,
  redisClient: RedisClient,
  logger: Logger
): Promise<TestResult> {
  const startTime = Date.now();

  console.log(chalk.cyan(`\n${'='.repeat(70)}`));
  console.log(chalk.cyan(`Testing: ${example.name}`));
  console.log(chalk.cyan('='.repeat(70)));

  try {
    const client = redisClient.getClient();
    // Use non-interactive mode for automated testing
    const steppingLogger = new StepByStepLogger(logger, false);

    await example.run(client, steppingLogger);

    if (example.cleanup) {
      await example.cleanup(client);
    }

    const duration = Date.now() - startTime;
    console.log(chalk.green(`✓ Success (${duration}ms)\n`));

    return {
      example: example.name,
      success: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.log(chalk.red(`✗ Failed (${duration}ms)`));
    console.log(chalk.red(`Error: ${errorMessage}`));
    if (errorStack) {
      console.log(chalk.gray(errorStack));
    }
    console.log();

    return {
      example: example.name,
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

async function main() {
  const logger = new Logger();
  const redisClient = new RedisClient();

  console.log(chalk.bold.cyan('\n🧪 Redis Examples Test Suite\n'));

  try {
    // Connect to Redis
    console.log('Connecting to Redis...');
    await redisClient.connect();
    const healthy = await redisClient.healthCheck();

    if (!healthy) {
      console.error(chalk.red('Redis health check failed!'));
      process.exit(1);
    }

    console.log(chalk.green('✓ Connected to Redis\n'));

    // Run all tests
    const results: TestResult[] = [];

    for (const example of REDIS_EXAMPLES) {
      const result = await testExample(example, redisClient, logger);
      results.push(result);

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Print summary
    console.log(chalk.bold.cyan('\n' + '='.repeat(70)));
    console.log(chalk.bold.cyan('TEST SUMMARY'));
    console.log(chalk.bold.cyan('='.repeat(70) + '\n'));

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total Tests: ${results.length}`);
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log(`Total Duration: ${totalDuration}ms\n`);

    // Print failed tests
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      console.log(chalk.bold.red('FAILED TESTS:\n'));
      failedTests.forEach(result => {
        console.log(chalk.red(`✗ ${result.example}`));
        console.log(chalk.gray(`  Error: ${result.error}`));
        console.log();
      });
    }

    // Print passed tests
    const passedTests = results.filter(r => r.success);
    if (passedTests.length > 0) {
      console.log(chalk.bold.green('PASSED TESTS:\n'));
      passedTests.forEach(result => {
        console.log(chalk.green(`✓ ${result.example} (${result.duration}ms)`));
      });
    }

    // Write detailed report to file
    const report = {
      timestamp: new Date().toISOString(),
      total: results.length,
      passed,
      failed,
      totalDuration,
      results: results.map(r => ({
        example: r.example,
        success: r.success,
        duration: r.duration,
        error: r.error,
      })),
    };

    const reportPath = './test-results.json';
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(chalk.gray(`\nDetailed report written to: ${reportPath}\n`));

    // Exit with error code if any tests failed
    await redisClient.disconnect();
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    await redisClient.disconnect();
    process.exit(1);
  }
}

main();
