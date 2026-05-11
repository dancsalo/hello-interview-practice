import chalk from 'chalk';
import dotenv from 'dotenv';
import { PostgreSQLClient } from '../src/technologies/postgresql/client.js';

// Load environment variables
dotenv.config();

async function main() {
  console.log(chalk.yellow('🔄 Resetting PostgreSQL data...'));

  const client = new PostgreSQLClient();

  try {
    await client.connect();
    await client.reset();
    console.log(chalk.green('✓ PostgreSQL data cleared'));
  } catch (error) {
    console.error(chalk.red('✗ Failed to reset PostgreSQL:'), error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

main();
