#!/usr/bin/env tsx
import { config } from 'dotenv';
import { PostgreSQLClient } from '../src/technologies/postgresql/client.js';
import { Logger } from '../src/lib/logger.js';
import { StepByStepLogger } from '../src/lib/step-by-step-logger.js';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';

// Load environment variables from .env file
config();

// Import all PostgreSQL examples
import { basicsExample } from '../src/technologies/postgresql/examples/01-basics/index.js';
import { transactionsExample } from '../src/technologies/postgresql/examples/02-transactions/index.js';
import { indexingExample } from '../src/technologies/postgresql/examples/03-indexing/index.js';
import { advancedIndexingExample } from '../src/technologies/postgresql/examples/04-advanced-indexing/index.js';
import { readScalingExample } from '../src/technologies/postgresql/examples/05-read-scaling/index.js';
import { writeScalingExample } from '../src/technologies/postgresql/examples/06-write-scaling/index.js';
import { optimizationExample } from '../src/technologies/postgresql/examples/07-optimization/index.js';
import type { PostgreSQLExample } from '../src/lib/types.js';

const POSTGRES_EXAMPLES: PostgreSQLExample[] = [
  basicsExample,
  transactionsExample,
  indexingExample,
  advancedIndexingExample,
  readScalingExample,
  writeScalingExample,
  optimizationExample,
];

interface TestResult {
  example: string;
  success: boolean;
  error?: string;
  duration: number;
}

async function testExample(
  example: PostgreSQLExample,
  postgresClient: PostgreSQLClient,
  logger: Logger
): Promise<TestResult> {
  const startTime = Date.now();

  console.log(chalk.cyan(`\n${'='.repeat(70)}`));
  console.log(chalk.cyan(`Testing: ${example.name}`));
  console.log(chalk.cyan('='.repeat(70)));

  try {
    const client = postgresClient.getClient();
    // Use non-interactive mode for automated testing
    const steppingLogger = new StepByStepLogger(logger, false);

    await example.run(client, steppingLogger);

    // PostgreSQL examples include cleanup in their run method
    // No separate cleanup call needed

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
  const postgresClient = new PostgreSQLClient();

  console.log(chalk.bold.cyan('\n🧪 PostgreSQL Examples Test Suite\n'));

  try {
    // Connect to PostgreSQL
    console.log('Connecting to PostgreSQL...');
    await postgresClient.connect();
    const healthy = await postgresClient.healthCheck();

    if (!healthy) {
      console.error(chalk.red('PostgreSQL health check failed!'));
      process.exit(1);
    }

    console.log(chalk.green('✓ Connected to PostgreSQL\n'));

    // Run all tests
    const results: TestResult[] = [];

    for (const example of POSTGRES_EXAMPLES) {
      const result = await testExample(example, postgresClient, logger);
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

    const reportPath = './test-results-postgres.json';
    await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(chalk.gray(`\nDetailed report written to: ${reportPath}\n`));

    // Exit with error code if any tests failed
    await postgresClient.disconnect();
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    await postgresClient.disconnect();
    process.exit(1);
  }
}

main();
