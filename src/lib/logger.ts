import chalk from 'chalk';
import type { Logger as LoggerInterface } from './types.js';

export class Logger implements LoggerInterface {
  private silent: boolean;

  constructor(silent = false) {
    this.silent = silent;
  }

  info(message: string): void {
    if (!this.silent) {
      console.log(chalk.blue('ℹ'), message);
    }
  }

  success(message: string): void {
    if (!this.silent) {
      console.log(chalk.green('✓'), message);
    }
  }

  error(message: string): void {
    if (!this.silent) {
      console.log(chalk.red('✗'), message);
    }
  }

  warning(message: string): void {
    if (!this.silent) {
      console.log(chalk.yellow('⚠'), message);
    }
  }

  step(message: string): void {
    if (!this.silent) {
      console.log(chalk.cyan('→'), message);
    }
  }

  command(command: string, result?: string): void {
    if (!this.silent) {
      console.log(chalk.gray('  Command:'), chalk.white(command));
      if (result !== undefined) {
        console.log(chalk.gray('  Result:'), chalk.white(result));
      }
    }
  }

  production(message: string): void {
    if (!this.silent) {
      console.log(chalk.magenta('💡'), chalk.italic(message));
    }
  }

  assert(condition: boolean, successMessage: string, failMessage?: string): void {
    if (condition) {
      this.success(successMessage);
    } else {
      this.error(failMessage || 'Assertion failed');
      throw new Error(failMessage || 'Assertion failed');
    }
  }

  section(title: string): void {
    if (!this.silent) {
      console.log('\n' + chalk.bold.underline(title));
    }
  }
}
