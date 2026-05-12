#!/usr/bin/env tsx
import { config } from 'dotenv';
import { ZooKeeperClient } from '../src/technologies/zookeeper/client.js';
import { Logger } from '../src/lib/logger.js';
import chalk from 'chalk';
import { writeFile } from 'fs/promises';

// Load environment variables from .env file
config();

// Import all ZooKeeper examples
import { basicsExample } from '../src/technologies/zookeeper/examples/01-basics/index.js';
import { watchesExample } from '../src/technologies/zookeeper/examples/02-watches/index.js';
import { configManagementExample } from '../src/technologies/zookeeper/examples/03-config-management/index.js';
import { serviceDiscoveryExample } from '../src/technologies/zookeeper/examples/04-service-discovery/index.js';
import { leaderElectionExample } from '../src/technologies/zookeeper/examples/05-leader-election/index.js';
import { distributedLocksExample } from '../src/technologies/zookeeper/examples/06-distributed-locks/index.js';
import { sessionManagementExample } from '../src/technologies/zookeeper/examples/07-session-management/index.js';
import { ensembleConsensusExample } from '../src/technologies/zookeeper/examples/08-ensemble-consensus/index.js';
import type { ZooKeeperExample } from '../src/lib/types.js';

const ZOOKEEPER_EXAMPLES: ZooKeeperExample[] = [
  basicsExample,
  watchesExample,
  configManagementExample,
  serviceDiscoveryExample,
  leaderElectionExample,
  distributedLocksExample,
  sessionManagementExample,
  ensembleConsensusExample,
];

interface TestResult {
  example: string;
  success: boolean;
  error?: string;
  duration: number;
}

async function testExample(
  example: ZooKeeperExample,
  zkClient: ZooKeeperClient,
  logger: Logger
): Promise<TestResult> {
  const startTime = Date.now();

  console.log(chalk.cyan(`\n${'='.repeat(70)}`));
  console.log(chalk.cyan(`Testing: ${example.name}`));
  console.log(chalk.cyan('='.repeat(70)));

  try {
    await example.run(zkClient, logger);
    const duration = Date.now() - startTime;

    console.log(chalk.green(`✓ ${example.name} passed (${duration}ms)`));
    return { example: example.name, success: true, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.error(chalk.red(`✗ ${example.name} failed (${duration}ms)`));
    console.error(chalk.red(`Error: ${errorMessage}`));

    if (error instanceof Error && error.stack) {
      console.error(chalk.gray(error.stack));
    }

    return {
      example: example.name,
      success: false,
      error: errorMessage,
      duration,
    };
  }
}

async function main() {
  console.log(chalk.bold.blue('\n🧪 Testing ZooKeeper Examples\n'));

  const zkClient = new ZooKeeperClient();
  const logger = new Logger();

  const results: TestResult[] = [];

  try {
    console.log(chalk.yellow('Connecting to ZooKeeper...'));
    await zkClient.connect();
    console.log(chalk.green('✓ Connected to ZooKeeper\n'));

    for (const example of ZOOKEEPER_EXAMPLES) {
      const result = await testExample(example, zkClient, logger);
      results.push(result);

      // Reset ZooKeeper state between examples
      try {
        await zkClient.reset();
        console.log(chalk.gray('Cleaned up test data'));
      } catch (error) {
        console.warn(chalk.yellow('Warning: Failed to clean up test data'), error);
      }
    }

    // Print summary
    console.log(chalk.cyan(`\n${'='.repeat(70)}`));
    console.log(chalk.bold('Test Summary'));
    console.log(chalk.cyan('='.repeat(70)));

    const passed = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`Total: ${results.length}`);
    console.log(chalk.green(`Passed: ${passed}`));
    console.log(chalk.red(`Failed: ${failed}`));
    console.log(`Total Duration: ${totalDuration}ms\n`);

    if (failed > 0) {
      console.log(chalk.red('Failed tests:'));
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(chalk.red(`  - ${r.example}: ${r.error}`));
        });
    }

    // Write results to file
    const resultFile = 'test-results-zookeeper.json';
    await writeFile(
      resultFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          total: results.length,
          passed,
          failed,
          duration: totalDuration,
          results,
        },
        null,
        2
      )
    );
    console.log(chalk.gray(`\nResults written to ${resultFile}`));

    if (failed > 0) {
      process.exit(1);
    } else {
      console.log(chalk.green.bold('\n✓ All tests passed!\n'));
    }
  } catch (error) {
    console.error(chalk.red('\n✗ Test suite failed:'), error);
    process.exit(1);
  } finally {
    await zkClient.disconnect();
    console.log(chalk.gray('Disconnected from ZooKeeper'));
  }
}

main();
