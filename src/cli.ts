import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { RedisClient } from './technologies/redis/client.js';
import { Logger } from './lib/logger.js';
import { DockerUtils } from './lib/docker-utils.js';
import type { Example } from './lib/types.js';

// Import all Redis examples
import { basicsExample } from './technologies/redis/examples/01-basics/index.js';
import { cacheExample } from './technologies/redis/examples/02-cache/index.js';
import { distributedLockExample } from './technologies/redis/examples/03-distributed-lock/index.js';
import { leaderboardsExample } from './technologies/redis/examples/04-leaderboards/index.js';
import { rateLimitingExample } from './technologies/redis/examples/05-rate-limiting/index.js';
import { proximitySearchExample } from './technologies/redis/examples/06-proximity-search/index.js';
import { eventSourcingExample } from './technologies/redis/examples/07-event-sourcing/index.js';
import { pubSubExample } from './technologies/redis/examples/08-pubsub/index.js';
import { bloomFiltersExample } from './technologies/redis/examples/09-bloom-filters/index.js';
import { timeSeriesExample } from './technologies/redis/examples/10-time-series/index.js';

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

class CLI {
  private redisClient: RedisClient;
  private logger: Logger;
  private shuttingDown = false;

  constructor() {
    this.redisClient = new RedisClient();
    this.logger = new Logger();
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    const handleShutdown = async (signal: string) => {
      if (this.shuttingDown) {
        return;
      }
      this.shuttingDown = true;

      console.log(chalk.yellow(`\n\nReceived ${signal}, shutting down gracefully...`));
      try {
        await this.redisClient.disconnect();
        this.logger.success('Disconnected from Redis');
      } catch (error) {
        this.logger.error(`Error during shutdown: ${error}`);
      }
      process.exit(0);
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  }

  private async checkDockerServices(): Promise<boolean> {
    const spinner = ora('Checking Docker services...').start();

    try {
      const services = await DockerUtils.checkServices();

      spinner.stop();
      console.log();

      let allHealthy = true;
      for (const service of services) {
        if (service.healthy) {
          this.logger.success(
            `${service.name} is ready${service.url ? ` - ${chalk.cyan(service.url)}` : ''}`
          );
        } else {
          this.logger.error(`${service.name} is not ready`);
          allHealthy = false;
        }
      }

      console.log();

      if (!allHealthy) {
        this.logger.warning('Some services are not ready. Please ensure Docker is running:');
        console.log(chalk.gray('  $ docker-compose up -d'));
        console.log();
        return false;
      }

      return true;
    } catch (error) {
      spinner.stop();
      this.logger.error(`Failed to check services: ${error}`);
      return false;
    }
  }

  private async connectRedis(): Promise<boolean> {
    const spinner = ora('Connecting to Redis...').start();

    try {
      await this.redisClient.connect();
      const healthy = await this.redisClient.healthCheck();

      if (healthy) {
        spinner.succeed('Connected to Redis');
        return true;
      } else {
        spinner.fail('Redis health check failed');
        return false;
      }
    } catch (error) {
      spinner.fail(`Failed to connect to Redis: ${error}`);
      return false;
    }
  }

  private async showTechnologyMenu(): Promise<string | null> {
    console.log();
    const technology = await select({
      message: 'Select a technology:',
      choices: [
        {
          name: '🔴 Redis (10 examples)',
          value: 'redis',
        },
        {
          name: '📨 Kafka (Coming soon)',
          value: 'kafka',
          disabled: true,
        },
        {
          name: '🐘 PostgreSQL (Coming soon)',
          value: 'postgresql',
          disabled: true,
        },
        {
          name: '🔍 Elasticsearch (Coming soon)',
          value: 'elasticsearch',
          disabled: true,
        },
        {
          name: '❌ Exit',
          value: 'exit',
        },
      ],
    });

    return technology === 'exit' ? null : technology;
  }

  private async showRedisExamplesMenu(): Promise<Example | null> {
    console.log();
    const choices = REDIS_EXAMPLES.map((example, idx) => ({
      name: `${String(idx + 1).padStart(2, '0')}. ${example.name}`,
      value: example,
      description: example.description,
    }));

    choices.push({
      name: '← Back to technologies',
      value: null as any,
      description: 'Return to main menu',
    });

    const selected = await select({
      message: 'Select a Redis example:',
      choices,
      pageSize: 12,
    });

    return selected;
  }

  private async runExample(example: Example): Promise<void> {
    console.log();
    console.log(chalk.bold.cyan('═'.repeat(70)));
    console.log(chalk.bold.cyan(`  Running: ${example.name}`));
    console.log(chalk.bold.cyan('═'.repeat(70)));
    console.log();

    try {
      const client = this.redisClient.getClient();
      await example.run(client, this.logger);

      console.log();
      this.logger.success('Example completed successfully!');

      if (example.cleanup) {
        const spinner = ora('Cleaning up...').start();
        await example.cleanup(client);
        spinner.succeed('Cleanup complete');
      }
    } catch (error) {
      console.log();
      this.logger.error(`Example failed: ${error}`);
      this.logger.warning('You may need to reset Redis to recover.');
    }
  }

  private async showPostExampleMenu(): Promise<string> {
    console.log();
    const action = await select({
      message: 'What would you like to do next?',
      choices: [
        {
          name: '▶  Run another example',
          value: 'another',
        },
        {
          name: '🔄 Reset Redis data',
          value: 'reset-redis',
        },
        {
          name: '🔄 Reset all technologies',
          value: 'reset-all',
        },
        {
          name: '← Back to main menu',
          value: 'back',
        },
        {
          name: '❌ Exit',
          value: 'exit',
        },
      ],
    });

    return action;
  }

  private async handleReset(scope: 'redis' | 'all'): Promise<void> {
    const spinner = ora(
      scope === 'redis' ? 'Resetting Redis data...' : 'Resetting all data...'
    ).start();

    try {
      if (scope === 'redis') {
        await DockerUtils.resetRedis();
        spinner.succeed('Redis data cleared');
      } else {
        await DockerUtils.resetAll();
        spinner.succeed('All data cleared');
      }
    } catch (error) {
      spinner.fail(`Reset failed: ${error}`);
      this.logger.warning('Try running: docker-compose restart');
    }
  }

  private printWelcome(): void {
    console.clear();
    console.log();
    console.log(chalk.bold.cyan('🎓 System Design Technology Examples'));
    console.log(chalk.bold.cyan('═'.repeat(70)));
    console.log();
    console.log(chalk.gray('  Interactive examples for learning system design patterns'));
    console.log(chalk.gray('  Press Ctrl+C at any time to exit gracefully'));
    console.log();
  }

  async run(): Promise<void> {
    this.printWelcome();

    // Health check phase
    const servicesHealthy = await this.checkDockerServices();
    if (!servicesHealthy) {
      process.exit(1);
    }

    // Connect to Redis
    const redisConnected = await this.connectRedis();
    if (!redisConnected) {
      process.exit(1);
    }

    // Main loop
    try {
      while (true) {
        // Technology selection
        const technology = await this.showTechnologyMenu();
        if (!technology) {
          this.logger.info('Goodbye!');
          break;
        }

        // Currently only Redis is implemented
        if (technology === 'redis') {
          let continueRedis = true;

          while (continueRedis) {
            // Example selection
            const example = await this.showRedisExamplesMenu();
            if (!example) {
              // User chose "Back"
              break;
            }

            // Run the example
            await this.runExample(example);

            // Post-example actions
            const action = await this.showPostExampleMenu();

            switch (action) {
              case 'another':
                // Continue to next example selection
                continue;

              case 'reset-redis':
                await this.handleReset('redis');
                continue;

              case 'reset-all':
                await this.handleReset('all');
                continue;

              case 'back':
                continueRedis = false;
                break;

              case 'exit':
                this.logger.info('Goodbye!');
                await this.redisClient.disconnect();
                process.exit(0);
            }
          }
        }
      }
    } catch (error) {
      if ((error as any).name === 'ExitPromptError') {
        // User pressed Ctrl+C
        this.logger.info('\nGoodbye!');
      } else {
        this.logger.error(`Unexpected error: ${error}`);
      }
    } finally {
      await this.redisClient.disconnect();
    }
  }
}

// Main entry point
async function main() {
  const cli = new CLI();
  await cli.run();
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
