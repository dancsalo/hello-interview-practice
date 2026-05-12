import chalk from 'chalk';
import { DockerUtils } from '../src/lib/docker-utils.js';
import { DynamoDBClientWrapper } from '../src/technologies/dynamodb/client.js';

async function main() {
  console.log(chalk.yellow('🔄 Resetting all data...'));
  console.log(chalk.dim('  - Redis'));
  console.log(chalk.dim('  - PostgreSQL'));
  console.log(chalk.dim('  - Kafka'));
  console.log(chalk.dim('  - DynamoDB'));

  try {
    // Reset DynamoDB first
    const dynamoClient = new DynamoDBClientWrapper();
    try {
      await dynamoClient.connect();
      await dynamoClient.reset();
    } finally {
      await dynamoClient.disconnect();
    }

    // Then reset other services
    await DockerUtils.resetAll();

    console.log(chalk.green('✓ All data cleared'));
  } catch (error) {
    console.error(chalk.red('✗ Failed to reset data:'), error);
    process.exit(1);
  }
}

main();