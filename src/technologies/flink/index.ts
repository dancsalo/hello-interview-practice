import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { FlinkClient } from './client.js';
import { Logger } from '../../lib/logger.js';
import type { FlinkExample } from '../../lib/types.js';

// Import Phase 1 examples
import { basicsExample } from './examples/01-basics/index.js';
import { statelessOperatorsExample } from './examples/02-stateless-operators/index.js';
import { statefulProcessingExample } from './examples/03-stateful-processing/index.js';

const PHASE1_EXAMPLES: FlinkExample[] = [
  basicsExample,
  statelessOperatorsExample,
  statefulProcessingExample,
];

export async function runFlinkMenu(): Promise<void> {
  const client = new FlinkClient();
  const logger = new Logger();

  while (true) {
    console.clear();
    logger.section('Apache Flink Examples');
    logger.info('Stream processing with stateful computations\n');

    // Health check
    const spinner = ora('Checking Flink cluster health...').start();
    const isHealthy = await client.checkHealth();

    if (!isHealthy) {
      spinner.fail('Flink cluster not available');
      console.log(chalk.red('✗ Flink cluster not responding'));
      console.log(chalk.yellow('Run: docker-compose up -d flink-jobmanager flink-taskmanager\n'));
      return;
    }

    spinner.succeed('Flink cluster healthy');

    try {
      const overview = await client.getOverview();
      logger.info(`TaskManagers: ${overview['taskmanagers']}`);
      logger.info(`Available Task Slots: ${overview['slots-available']}\n`);
    } catch (error) {
      logger.error(`Failed to get cluster overview: ${error}`);
      logger.info('Continuing anyway...\n');
    }

    const exampleChoices = [
      { name: '1. Basics: DataStream API & Job Submission', value: 0 },
      { name: '2. Stateless Operators: Map, Filter, FlatMap', value: 1 },
      { name: '3. Stateful Processing: ValueState, ListState, MapState', value: 2 },
      { name: chalk.gray('4. Windowing (Phase 2 - Coming Soon)'), value: -1 },
      { name: chalk.gray('5. Watermarks & Late Events (Phase 2)'), value: -1 },
      { name: chalk.gray('6. Keyed Streams & Advanced State (Phase 2)'), value: -1 },
      { name: chalk.gray('7. Stream Joins (Phase 2)'), value: -1 },
      { name: chalk.gray('8. Checkpointing & Fault Tolerance (Phase 3)'), value: -1 },
      { name: chalk.gray('9. Pattern Detection (CEP) (Phase 3)'), value: -1 },
      { name: chalk.gray('10. Production Patterns (Phase 3)'), value: -1 },
      { name: chalk.yellow('← Back to technology selection'), value: -2 },
    ];

    const exampleIndex = await select({
      message: 'Choose a Flink example:',
      choices: exampleChoices,
    });

    if (exampleIndex === -2) {
      return; // Back to main menu
    }

    if (exampleIndex === -1) {
      logger.info(chalk.gray('\nThis example is coming in a future phase.\n'));
      continue; // Show menu again
    }

    const example = PHASE1_EXAMPLES[exampleIndex];

    try {
      console.clear();
      await example.run(client, logger);

      // Post-example actions
      const shouldExit = await handlePostExampleActions(client, logger);
      if (shouldExit) {
        return;
      }
    } catch (error) {
      logger.error(`\nExample failed: ${error}`);
    }
  }
}

async function handlePostExampleActions(
  client: FlinkClient,
  logger: Logger
): Promise<boolean> {
  console.log('\n');

  const action = await select({
    message: 'What would you like to do next?',
    choices: [
      { name: 'Run another Flink example', value: 'another' },
      { name: 'Cancel all running jobs', value: 'reset' },
      { name: 'View Flink UI (http://localhost:8081)', value: 'ui' },
      { name: 'Return to main menu', value: 'exit' },
    ],
  });

  switch (action) {
    case 'another':
      return false; // Continue loop
    case 'reset':
      const spinner = ora('Cancelling all running jobs...').start();
      try {
        const jobs = await client.listJobs();
        const runningJobs = jobs.filter((j: any) => j.status === 'RUNNING');

        for (const job of runningJobs) {
          await client.cancelJob(job.jobId);
        }

        spinner.succeed(`Cancelled ${runningJobs.length} jobs`);
      } catch (error) {
        spinner.fail('Failed to cancel jobs');
        logger.error(`Error: ${error}`);
      }
      return false; // Continue loop
    case 'ui':
      logger.info(chalk.cyan('\nFlink UI: http://localhost:8081'));
      logger.info('Press Enter to continue...');
      await new Promise(resolve => process.stdin.once('data', resolve));
      return false; // Continue loop
    case 'exit':
      return true; // Exit loop
  }
  return true; // Default to exit
}
