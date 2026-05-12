import chalk from 'chalk';
import dotenv from 'dotenv';
import { DynamoDBClientWrapper } from '../src/technologies/dynamodb/client.js';

dotenv.config();

async function resetDynamoDB() {
  console.log(chalk.blue('🔄 Resetting DynamoDB...'));

  const client = new DynamoDBClientWrapper();

  try {
    await client.connect();
    console.log(chalk.green('✓ Connected to DynamoDB'));

    await client.reset();
    console.log(chalk.green('✓ All tables deleted'));

    console.log(chalk.green('✓ DynamoDB reset complete\n'));
  } catch (error) {
    console.error(chalk.red(`✗ Error resetting DynamoDB: ${error}`));
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

resetDynamoDB();