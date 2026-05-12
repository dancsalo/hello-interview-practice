import chalk from 'chalk';
import { DockerUtils } from '../src/lib/docker-utils.js';

async function main() {
  console.log(chalk.yellow('🔄 Resetting Cassandra data...'));
  try {
    await DockerUtils.resetCassandra();
    console.log(chalk.green('✓ Cassandra data cleared'));
  } catch (error) {
    console.error(chalk.red('✗ Failed to reset Cassandra:'), error);
    process.exit(1);
  }
}

main();
