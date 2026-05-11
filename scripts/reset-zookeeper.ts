#!/usr/bin/env tsx
import chalk from 'chalk';
import { ZooKeeperClient } from '../src/technologies/zookeeper/client.js';

async function main() {
  console.log(chalk.yellow('🔄 Resetting ZooKeeper data...'));

  const client = new ZooKeeperClient();

  try {
    await client.connect();
    console.log(chalk.blue('Connected to ZooKeeper'));

    await client.reset();
    console.log(chalk.green('✓ ZooKeeper demo and test nodes cleared'));

    await client.disconnect();
    console.log(chalk.blue('Disconnected from ZooKeeper'));
  } catch (error) {
    console.error(chalk.red('✗ Failed to reset ZooKeeper:'), error);
    await client.disconnect();
    process.exit(1);
  }
}

main();
