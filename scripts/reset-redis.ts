import chalk from 'chalk';
import { DockerUtils } from '../src/lib/docker-utils.js';

async function main() {
  console.log(chalk.yellow('🔄 Resetting Redis data...'));
  try {
    await DockerUtils.resetRedis();
    console.log(chalk.green('✓ Redis data cleared'));
  } catch (error) {
    console.error(chalk.red('✗ Failed to reset Redis:'), error);
    process.exit(1);
  }
}

main();
