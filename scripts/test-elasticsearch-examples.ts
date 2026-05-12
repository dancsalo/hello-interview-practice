#!/usr/bin/env tsx
import { config } from 'dotenv';
import { ElasticsearchClient } from '../src/technologies/elasticsearch/client.js';
import { Logger } from '../src/lib/logger.js';
import { StepByStepLogger } from '../src/lib/step-by-step-logger.js';
import chalk from 'chalk';
import type { Example } from '../src/lib/types.js';
import type { Client } from '@elastic/elasticsearch';

// Load environment variables from .env file
config();

// Import all Elasticsearch examples
import { ELASTICSEARCH_EXAMPLES } from '../src/technologies/elasticsearch/index.js';

interface TestResult {
  example: string;
  success: boolean;
  error?: string;
  duration: number;
}

async function testExample(
  example: Example<Client>,
  elasticsearchClient: ElasticsearchClient,
  logger: Logger
): Promise<TestResult> {
  const startTime = Date.now();

  console.log(chalk.cyan(`\n${'='.repeat(70)}`));
  console.log(chalk.cyan(`Testing: ${example.name}`));
  console.log(chalk.cyan('='.repeat(70)));

  const client = elasticsearchClient.getClient();

  try {
    // Use non-interactive mode for automated testing
    const steppingLogger = new StepByStepLogger(logger, false);

    await example.run(client, steppingLogger, { nonInteractive: true });

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
  } finally {
    // Always run cleanup, even if test failed
    if (example.cleanup) {
      try {
        await example.cleanup(client);
      } catch (cleanupError) {
        console.log(chalk.yellow(`⚠ Cleanup failed: ${cleanupError}`));
      }
    }
  }
}

async function main() {
  const logger = new Logger();
  const elasticsearchClient = new ElasticsearchClient();

  console.log(chalk.bold.cyan('\n🧪 Elasticsearch Examples Test Suite\n'));

  try {
    // Connect to Elasticsearch
    console.log('Connecting to Elasticsearch...');
    await elasticsearchClient.connect();
    const healthy = await elasticsearchClient.healthCheck();

    if (!healthy) {
      console.error(chalk.red('Elasticsearch health check failed!'));
      process.exit(1);
    }

    console.log(chalk.green('✓ Connected to Elasticsearch\n'));

    // Run all tests
    const results: TestResult[] = [];

    for (const example of ELASTICSEARCH_EXAMPLES) {
      const result = await testExample(example, elasticsearchClient, logger);
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

    // Exit with error code if any tests failed
    await elasticsearchClient.disconnect();
    process.exit(failed > 0 ? 1 : 0);

  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    await elasticsearchClient.disconnect();
    process.exit(1);
  }
}

main();
