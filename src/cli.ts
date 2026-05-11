import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { RedisClient } from './technologies/redis/client.js';
import { KafkaClient } from './technologies/kafka/client.js';
import { Logger } from './lib/logger.js';
import { StepByStepLogger } from './lib/step-by-step-logger.js';
import { DockerUtils } from './lib/docker-utils.js';
import type { Example, RedisExample } from './lib/types.js';

// Type guard to check if an example is a RedisExample
function isRedisExample(example: Example): example is RedisExample {
  return 'cleanup' in example;
}

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

// Import all Kafka examples
import { basicsExample as kafkaBasicsExample } from './technologies/kafka/examples/01-basics/index.js';
import { partitioningExample } from './technologies/kafka/examples/02-partitioning/index.js';

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

const KAFKA_EXAMPLES: Example[] = [
  kafkaBasicsExample,
  partitioningExample,
];

class CLI {
  private redisClient: RedisClient;
  private kafkaClient: KafkaClient;
  private logger: Logger;
  private shuttingDown = false;

  constructor() {
    this.redisClient = new RedisClient();
    this.kafkaClient = new KafkaClient();
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
        await this.kafkaClient.disconnect();
        this.logger.success('Disconnected from Kafka');
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
          name: '📨 Kafka (2 examples)',
          value: 'kafka',
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

  private async showKafkaExamplesMenu(): Promise<Example | null> {
    console.log();
    const choices = KAFKA_EXAMPLES.map((example, idx) => ({
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
      message: 'Select a Kafka example:',
      choices,
      pageSize: 12,
    });

    return selected;
  }

  private async connectKafka(): Promise<boolean> {
    const spinner = ora('Connecting to Kafka...').start();

    try {
      await this.kafkaClient.connect();
      const healthy = await this.kafkaClient.healthCheck();

      if (healthy) {
        spinner.succeed('Connected to Kafka');
        return true;
      } else {
        spinner.fail('Kafka health check failed');
        return false;
      }
    } catch (error) {
      spinner.fail(`Failed to connect to Kafka: ${error}`);
      return false;
    }
  }

  private async runExample(example: Example, technology: string): Promise<void> {
    console.log();
    console.log(chalk.bold.cyan('═'.repeat(70)));
    console.log(chalk.bold.cyan(`  Running: ${example.name}`));
    console.log(chalk.bold.cyan('═'.repeat(70)));
    console.log();

    try {
      const steppingLogger = new StepByStepLogger(this.logger);

      if (technology === 'kafka') {
        await example.run(this.kafkaClient as any, steppingLogger);
      } else {
        const client = this.redisClient.getClient();
        await example.run(client, steppingLogger);
      }

      console.log();
      this.logger.success('Example completed successfully!');

      if (isRedisExample(example) && example.cleanup) {
        const client = this.redisClient.getClient();
        const spinner = ora('Cleaning up...').start();
        await example.cleanup(client);
        spinner.succeed('Cleanup complete');
      }
    } catch (error) {
      console.log();
      this.logger.error(`Example failed: ${error}`);
      if (technology === 'kafka') {
        this.logger.warning('You may need to reset Kafka to recover.');
      } else {
        this.logger.warning('You may need to reset Redis to recover.');
      }
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

    // Connect to Kafka
    const kafkaConnected = await this.connectKafka();
    if (!kafkaConnected) {
      this.logger.warning('Kafka is not available. Kafka examples will be disabled.');
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

        if (technology === 'redis') {
          let continueRedis = true;

          while (continueRedis) {
            const example = await this.showRedisExamplesMenu();
            if (!example) {
              break;
            }

            await this.runExample(example, 'redis');

            const action = await this.showPostExampleMenu();

            switch (action) {
              case 'another':
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
                await this.kafkaClient.disconnect();
                process.exit(0);
            }
          }
        } else if (technology === 'kafka') {
          if (!kafkaConnected) {
            this.logger.error('Kafka is not available. Please check Docker services.');
            continue;
          }

          let continueKafka = true;

          while (continueKafka) {
            const example = await this.showKafkaExamplesMenu();
            if (!example) {
              break;
            }

            await this.runExample(example, 'kafka');

            const action = await this.showPostExampleMenu();

            switch (action) {
              case 'another':
                continue;

              case 'reset-redis':
                await this.handleReset('redis');
                continue;

              case 'reset-all':
                await this.handleReset('all');
                continue;

              case 'back':
                continueKafka = false;
                break;

              case 'exit':
                this.logger.info('Goodbye!');
                await this.redisClient.disconnect();
                await this.kafkaClient.disconnect();
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
      await this.kafkaClient.disconnect();
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
