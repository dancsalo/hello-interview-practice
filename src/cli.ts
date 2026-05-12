import { select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { RedisClient } from './technologies/redis/client.js';
import { PostgreSQLClient } from './technologies/postgresql/client.js';
import { ElasticsearchClient } from './technologies/elasticsearch/client.js';
import { KafkaClient } from './technologies/kafka/client.js';
import { CassandraClient } from './technologies/cassandra/client.js';
import { DynamoDBClientWrapper } from './technologies/dynamodb/client.js';
import { ZooKeeperClient } from './technologies/zookeeper/client.js';
import { Logger } from './lib/logger.js';
import { StepByStepLogger } from './lib/step-by-step-logger.js';
import { DockerUtils } from './lib/docker-utils.js';
import type { Example, RedisExample, PostgreSQLExample, CassandraExample, DynamoDBExample, ZooKeeperExample } from './lib/types.js';

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

// Import all PostgreSQL examples
import { basicsExample as pgBasicsExample } from './technologies/postgresql/examples/01-basics/index.js';
import { transactionsExample } from './technologies/postgresql/examples/02-transactions/index.js';
import { indexingExample } from './technologies/postgresql/examples/03-indexing/index.js';
import { advancedIndexingExample } from './technologies/postgresql/examples/04-advanced-indexing/index.js';
import { readScalingExample } from './technologies/postgresql/examples/05-read-scaling/index.js';
import { writeScalingExample } from './technologies/postgresql/examples/06-write-scaling/index.js';
import { optimizationExample } from './technologies/postgresql/examples/07-optimization/index.js';

// Import all Kafka examples
import { basicsExample as kafkaBasicsExample } from './technologies/kafka/examples/01-basics/index.js';
import { partitioningExample } from './technologies/kafka/examples/02-partitioning/index.js';

// Import all DynamoDB examples
import { basicsExample as dynamoBasicsExample } from './technologies/dynamodb/examples/01-basics/index.js';
import { indexingExample as dynamoIndexingExample } from './technologies/dynamodb/examples/02-indexing/index.js';
import { consistencyExample } from './technologies/dynamodb/examples/03-consistency-models/index.js';
import { transactionsExample as dynamoTransactionsExample } from './technologies/dynamodb/examples/04-transactions/index.js';
import { singleTableExample } from './technologies/dynamodb/examples/05-single-table-design/index.js';
import { streamsExample } from './technologies/dynamodb/examples/06-streams/index.js';
import { performanceExample } from './technologies/dynamodb/examples/07-performance/index.js';
import { productionExample } from './technologies/dynamodb/examples/08-production-patterns/index.js';

// Import Elasticsearch examples
import { ELASTICSEARCH_EXAMPLES } from './technologies/elasticsearch/index.js';

// Import all Cassandra examples
import { basicsExample as cassandraBasicsExample } from './technologies/cassandra/examples/01-basics/index.js';
import { primaryKeyDesignExample } from './technologies/cassandra/examples/02-primary-key-design/index.js';
import { partitioningStrategyExample } from './technologies/cassandra/examples/03-partitioning-strategy/index.js';

// Import all ZooKeeper examples
import { zookeeperExamples } from './technologies/zookeeper/examples/index.js';

const REDIS_EXAMPLES: RedisExample[] = [
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

const POSTGRES_EXAMPLES: PostgreSQLExample[] = [
  pgBasicsExample,
  transactionsExample,
  indexingExample,
  advancedIndexingExample,
  readScalingExample,
  writeScalingExample,
  optimizationExample,
];

const KAFKA_EXAMPLES: Example[] = [
  kafkaBasicsExample,
  partitioningExample,
];

const DYNAMODB_EXAMPLES: DynamoDBExample[] = [
  dynamoBasicsExample,
  dynamoIndexingExample,
  consistencyExample,
  dynamoTransactionsExample,
  singleTableExample,
  streamsExample,
  performanceExample,
  productionExample,
];

const CASSANDRA_EXAMPLES: CassandraExample[] = [
  cassandraBasicsExample,
  primaryKeyDesignExample,
  partitioningStrategyExample,
];

const ZOOKEEPER_EXAMPLES: ZooKeeperExample[] = zookeeperExamples;

class CLI {
  private redisClient: RedisClient;
  private postgresClient: PostgreSQLClient;
  private elasticsearchClient: ElasticsearchClient;
  private kafkaClient: KafkaClient;
  private cassandraClient: CassandraClient;
  private dynamoClient: DynamoDBClientWrapper;
  private zookeeperClient: ZooKeeperClient;
  private logger: Logger;
  private shuttingDown = false;

  constructor() {
    this.redisClient = new RedisClient();
    this.postgresClient = new PostgreSQLClient();
    this.elasticsearchClient = new ElasticsearchClient();
    this.kafkaClient = new KafkaClient();
    this.cassandraClient = new CassandraClient();
    this.dynamoClient = new DynamoDBClientWrapper();
    this.zookeeperClient = new ZooKeeperClient();
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
        await this.postgresClient.disconnect();
        this.logger.success('Disconnected from PostgreSQL');
        await this.elasticsearchClient.disconnect();
        this.logger.success('Disconnected from Elasticsearch');
        await this.kafkaClient.disconnect();
        this.logger.success('Disconnected from Kafka');
        await this.cassandraClient.disconnect();
        this.logger.success('Disconnected from Cassandra');
        await this.dynamoClient.disconnect();
        this.logger.success('Disconnected from DynamoDB');
        await this.zookeeperClient.disconnect();
        this.logger.success('Disconnected from ZooKeeper');
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

  private async connectPostgreSQL(): Promise<boolean> {
    const spinner = ora('Connecting to PostgreSQL...').start();

    try {
      await this.postgresClient.connect();
      const healthy = await this.postgresClient.healthCheck();

      if (healthy) {
        spinner.succeed('Connected to PostgreSQL');
        return true;
      } else {
        spinner.fail('PostgreSQL health check failed');
        return false;
      }
    } catch (error) {
      spinner.fail(`Failed to connect to PostgreSQL: ${error}`);
      return false;
    }
  }

  private async connectElasticsearch(): Promise<boolean> {
    const spinner = ora('Connecting to Elasticsearch...').start();

    try {
      await this.elasticsearchClient.connect();
      const healthy = await this.elasticsearchClient.healthCheck();

      if (healthy) {
        spinner.succeed('Connected to Elasticsearch');
        return true;
      } else {
        spinner.fail('Elasticsearch health check failed');
        return false;
      }
    } catch (error) {
      spinner.fail(`Failed to connect to Elasticsearch: ${error}`);
      return false;
    }
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

  private async connectDynamoDB(): Promise<boolean> {
    const spinner = ora('Connecting to DynamoDB...').start();

    try {
      await this.dynamoClient.connect();
      const healthy = await this.dynamoClient.healthCheck();

      if (healthy) {
        spinner.succeed('Connected to DynamoDB');
        return true;
      } else {
        spinner.fail('DynamoDB health check failed');
        return false;
      }
    } catch (error) {
      spinner.fail(`Failed to connect to DynamoDB: ${error}`);
      return false;
    }
  }

  private async connectCassandra(): Promise<boolean> {
    const spinner = ora('Connecting to Cassandra...').start();

    try {
      await this.cassandraClient.connect();
      const healthy = await this.cassandraClient.healthCheck();

      if (healthy) {
        spinner.succeed('Connected to Cassandra');
        return true;
      } else {
        spinner.fail('Cassandra health check failed');
        return false;
      }
    } catch (error) {
      spinner.fail(`Failed to connect to Cassandra: ${error}`);
      return false;
    }
  }

  private async connectZooKeeper(): Promise<boolean> {
    const spinner = ora('Connecting to ZooKeeper...').start();

    try {
      await this.zookeeperClient.connect();
      const healthy = await this.zookeeperClient.healthCheck();

      if (healthy) {
        spinner.succeed('Connected to ZooKeeper');
        return true;
      } else {
        spinner.fail('ZooKeeper health check failed');
        return false;
      }
    } catch (error) {
      spinner.fail(`Failed to connect to ZooKeeper: ${error}`);
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
          name: '🐘 PostgreSQL (7 examples)',
          value: 'postgresql',
        },
        {
          name: '⚡ DynamoDB (8 examples)',
          value: 'dynamodb',
        },
        {
          name: '🔍 Elasticsearch (10 examples)',
          value: 'elasticsearch',
        },
        {
          name: '📨 Kafka (2 examples)',
          value: 'kafka',
        },
        {
          name: '💎 Cassandra (3 examples)',
          value: 'cassandra',
        },
        {
          name: '🔐 ZooKeeper (8 examples)',
          value: 'zookeeper',
        },
        {
          name: '🌊 Flink - Event Stream Processing (3 examples in Phase 1)',
          value: 'flink',
        },
        {
          name: '❌ Exit',
          value: 'exit',
        },
      ],
    });

    return technology === 'exit' ? null : technology;
  }

  private async showRedisExamplesMenu(): Promise<RedisExample | null> {
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

  private async showPostgresExamplesMenu(): Promise<PostgreSQLExample | null> {
    console.log();
    const choices = POSTGRES_EXAMPLES.map((example, idx) => ({
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
      message: 'Select a PostgreSQL example:',
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

  private async showDynamoDBExamplesMenu(): Promise<DynamoDBExample | null> {
    console.log();
    const choices = DYNAMODB_EXAMPLES.map((example, idx) => ({
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
      message: 'Select a DynamoDB example:',
      choices,
      pageSize: 12,
    });

    return selected;
  }

  private async showZooKeeperExamplesMenu(): Promise<ZooKeeperExample | null> {
    console.log();
    const choices = ZOOKEEPER_EXAMPLES.map((example, idx) => ({
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
      message: 'Select a ZooKeeper example:',
      choices,
      pageSize: 12,
    });

    return selected;
  }

  private async showElasticsearchExamplesMenu(): Promise<Example | null> {
    console.log();
    const choices = ELASTICSEARCH_EXAMPLES.map((example, idx) => ({
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
      message: 'Select an Elasticsearch example:',
      choices,
      pageSize: 12,
    });

    return selected;
  }

  private async showCassandraExamplesMenu(): Promise<CassandraExample | null> {
    console.log();
    const choices = CASSANDRA_EXAMPLES.map((example, idx) => ({
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
      message: 'Select a Cassandra example:',
>>>>>>> origin/main
      choices,
      pageSize: 12,
    });

    return selected;
  }

  private async runExample(example: Example<any>, technology: string): Promise<void> {
    console.log();
    console.log(chalk.bold.cyan('═'.repeat(70)));
    console.log(chalk.bold.cyan(`  Running: ${example.name}`));
    console.log(chalk.bold.cyan('═'.repeat(70)));
    console.log();

    try {
      const steppingLogger = new StepByStepLogger(this.logger);

      if (technology === 'kafka') {
        await example.run(this.kafkaClient as any, steppingLogger);
      } else if (technology === 'postgresql') {
        await example.run(this.postgresClient.getClient() as any, steppingLogger);
      } else if (technology === 'dynamodb') {
        const clients = this.dynamoClient.getClients();
        await example.run(clients, steppingLogger);
      } else if (technology === 'elasticsearch') {
        await example.run(this.elasticsearchClient.getClient() as any, steppingLogger);
      } else if (technology === 'cassandra') {
        await example.run(this.cassandraClient.getClient() as any, steppingLogger);
      } else if (technology === 'zookeeper') {
        await example.run(this.zookeeperClient, steppingLogger);
      } else {
        const client = this.redisClient.getClient();
        await example.run(client, steppingLogger);
      }

      console.log();
      this.logger.success('Example completed successfully!');

      if (isRedisExample(example) && example.cleanup) {
        const client = this.redisClient.getClient();
        const spinner = ora('Cleaning up...').start();
        await example.cleanup(client as any);
        spinner.succeed('Cleanup complete');
      } else if (technology === 'cassandra' && example.cleanup) {
        const client = this.cassandraClient.getClient();
        const spinner = ora('Cleaning up...').start();
        await example.cleanup(client as any);
        spinner.succeed('Cleanup complete');
      }
    } catch (error) {
      console.log();
      this.logger.error(`Example failed: ${error}`);
      if (technology === 'kafka') {
        this.logger.warning('You may need to reset Kafka to recover.');
      } else if (technology === 'postgresql') {
        this.logger.warning('You may need to reset the database to recover.');
      } else if (technology === 'dynamodb') {
        this.logger.warning('You may need to reset DynamoDB to recover.');
      } else if (technology === 'elasticsearch') {
        this.logger.warning('You may need to reset Elasticsearch to recover.');
      } else if (technology === 'cassandra') {
        this.logger.warning('You may need to reset Cassandra to recover.');
      } else if (technology === 'zookeeper') {
        this.logger.warning('You may need to reset ZooKeeper to recover.');
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
          // Connect to Redis
          const redisConnected = await this.connectRedis();
          if (!redisConnected) {
            continue;
          }

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
                await this.postgresClient.disconnect();
                await this.elasticsearchClient.disconnect();
                await this.kafkaClient.disconnect();
                await this.cassandraClient.disconnect();
                await this.dynamoClient.disconnect();
                await this.zookeeperClient.disconnect();
                process.exit(0);
            }
          }
        } else if (technology === 'postgresql') {
          // Connect to PostgreSQL
          const postgresConnected = await this.connectPostgreSQL();
          if (!postgresConnected) {
            continue;
          }

          let continuePostgres = true;

          while (continuePostgres) {
            const example = await this.showPostgresExamplesMenu();
            if (!example) {
              break;
            }

            await this.runExample(example, 'postgresql');

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
                continuePostgres = false;
                break;

              case 'exit':
                this.logger.info('Goodbye!');
                await this.redisClient.disconnect();
                await this.postgresClient.disconnect();
                await this.kafkaClient.disconnect();
                await this.cassandraClient.disconnect();
                await this.dynamoClient.disconnect();
                await this.zookeeperClient.disconnect();
                process.exit(0);
            }
          }
        } else if (technology === 'dynamodb') {
          // Connect to DynamoDB
          const dynamoConnected = await this.connectDynamoDB();
          if (!dynamoConnected) {
            this.logger.error('DynamoDB is not available. Please check Docker services.');
            continue;
          }

          let continueDynamo = true;

          while (continueDynamo) {
            const example = await this.showDynamoDBExamplesMenu();
            if (!example) {
              break;
            }

            await this.runExample(example, 'dynamodb');

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
                continueDynamo = false;
                break;

              case 'exit':
                this.logger.info('Goodbye!');
                await this.redisClient.disconnect();
                await this.postgresClient.disconnect();
                await this.kafkaClient.disconnect();
                await this.cassandraClient.disconnect();
                await this.dynamoClient.disconnect();
                process.exit(0);
            }
          }
        } else if (technology === 'elasticsearch') {
          // Connect to Elasticsearch
          const elasticsearchConnected = await this.connectElasticsearch();
          if (!elasticsearchConnected) {
            continue;
          }

          let continueElasticsearch = true;

          while (continueElasticsearch) {
            const example = await this.showElasticsearchExamplesMenu();
            if (!example) {
              break;
            }

            await this.runExample(example, 'elasticsearch');

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
                continueElasticsearch = false;
                break;

              case 'exit':
                this.logger.info('Goodbye!');
                await this.redisClient.disconnect();
                await this.postgresClient.disconnect();
                await this.elasticsearchClient.disconnect();
                await this.kafkaClient.disconnect();
>>>>>>> origin/main
                process.exit(0);
            }
          }
        } else if (technology === 'kafka') {
          // Connect to Kafka
          const kafkaConnected = await this.connectKafka();
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
                await this.postgresClient.disconnect();
                await this.kafkaClient.disconnect();
                await this.cassandraClient.disconnect();
                await this.dynamoClient.disconnect();
                await this.zookeeperClient.disconnect();
                process.exit(0);
            }
          }
        } else if (technology === 'zookeeper') {
          // Connect to ZooKeeper
          const zookeeperConnected = await this.connectZooKeeper();
          if (!zookeeperConnected) {
            this.logger.error('ZooKeeper is not available. Please check Docker services.');
            continue;
          }

          let continueZooKeeper = true;

          while (continueZooKeeper) {
            const example = await this.showZooKeeperExamplesMenu();
            if (!example) {
              break;
            }

            await this.runExample(example, 'zookeeper');

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
                continueZooKeeper = false;
                break;

              case 'exit':
                this.logger.info('Goodbye!');
                await this.redisClient.disconnect();
                await this.postgresClient.disconnect();
                await this.kafkaClient.disconnect();
                await this.cassandraClient.disconnect();
                await this.dynamoClient.disconnect();
                await this.zookeeperClient.disconnect();
                process.exit(0);
            }
          }
        } else if (technology === 'cassandra') {
          // Connect to Cassandra
          const cassandraConnected = await this.connectCassandra();
          if (!cassandraConnected) {
            this.logger.error('Cassandra is not available. Please check Docker services.');
            continue;
          }

          let continueCassandra = true;

          while (continueCassandra) {
            const example = await this.showCassandraExamplesMenu();
            if (!example) {
              break;
            }

            await this.runExample(example, 'cassandra');

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
                continueCassandra = false;
                break;

              case 'exit':
                this.logger.info('Goodbye!');
                await this.redisClient.disconnect();
                await this.postgresClient.disconnect();
                await this.kafkaClient.disconnect();
                await this.cassandraClient.disconnect();
                await this.dynamoClient.disconnect();
                process.exit(0);
            }
          }
        } else if (technology === 'flink') {
          const { runFlinkMenu } = await import('./technologies/flink/index.js');
          await runFlinkMenu();
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
      await this.postgresClient.disconnect();
      await this.elasticsearchClient.disconnect();
      await this.kafkaClient.disconnect();
      await this.cassandraClient.disconnect();
      await this.dynamoClient.disconnect();
      await this.zookeeperClient.disconnect();
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
