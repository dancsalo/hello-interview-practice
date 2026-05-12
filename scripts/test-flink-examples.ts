#!/usr/bin/env tsx

import { FlinkClient } from '../src/technologies/flink/client.js';
import { Logger } from '../src/lib/logger.js';
import { basicsExample } from '../src/technologies/flink/examples/01-basics/index.js';
import { statelessOperatorsExample } from '../src/technologies/flink/examples/02-stateless-operators/index.js';
import { statefulProcessingExample } from '../src/technologies/flink/examples/03-stateful-processing/index.js';
import chalk from 'chalk';

async function testFlinkExamples() {
  console.log(chalk.bold.cyan('\n=== Testing Flink Examples ===\n'));

  const client = new FlinkClient();
  const logger = new Logger();

  // Health check
  console.log(chalk.blue('Checking Flink cluster health...'));
  const isHealthy = await client.checkHealth();

  if (!isHealthy) {
    console.error(chalk.red('✗ Flink cluster not available'));
    console.error(chalk.yellow('Run: docker-compose up -d flink-jobmanager flink-taskmanager\n'));
    process.exit(1);
  }

  console.log(chalk.green('✓ Flink cluster healthy\n'));

  // Test each Phase 1 example
  const examples = [
    { name: 'Basics', example: basicsExample },
    { name: 'Stateless Operators', example: statelessOperatorsExample },
    { name: 'Stateful Processing', example: statefulProcessingExample },
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, example } of examples) {
    console.log(chalk.blue(`\nTesting: ${name}`));
    console.log(chalk.gray('─'.repeat(50)));

    try {
      await example.run(client, logger);
      console.log(chalk.green(`✓ ${name} passed\n`));
      passed++;
    } catch (error) {
      console.error(chalk.red(`✗ ${name} failed:`), error);
      failed++;
    }
  }

  // Summary
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.bold('\nTest Summary:'));
  console.log(chalk.green(`  Passed: ${passed}`));
  if (failed > 0) {
    console.log(chalk.red(`  Failed: ${failed}`));
  }
  console.log('');

  if (failed > 0) {
    process.exit(1);
  }

  console.log(chalk.green('✓ All Flink examples passed!\n'));
}

testFlinkExamples().catch(error => {
  console.error(chalk.red('Test runner failed:'), error);
  process.exit(1);
});
