import chalk from 'chalk';
import { DockerUtils } from '../src/lib/docker-utils.js';

async function main() {
  console.log(chalk.yellow('🔄 Resetting all data...'));
  console.log(chalk.dim('  - Redis'));
  console.log(chalk.dim('  - PostgreSQL'));
  try {
    await DockerUtils.resetAll();
    console.log(chalk.green('✓ All data cleared'));
  } catch (error) {
    console.error(chalk.red('✗ Failed to reset data:'), error);
    process.exit(1);
  }
}

main();
