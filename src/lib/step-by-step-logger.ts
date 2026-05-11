import { spawnSync } from 'child_process';
import chalk from 'chalk';
import type { Logger as LoggerInterface } from './types.js';
import { Logger } from './logger.js';

/**
 * Wrapper around Logger that adds step-by-step execution with user confirmation.
 * Intercepts step() calls to pause and wait for Enter key before continuing.
 * All other logger methods pass through unchanged.
 */
export class StepByStepLogger implements LoggerInterface {
  private baseLogger: Logger;
  private stepCount = 0;
  private interactive: boolean;

  constructor(baseLogger: Logger, interactive?: boolean) {
    this.baseLogger = baseLogger;

    // Priority: constructor param > env var > default true
    if (interactive !== undefined) {
      this.interactive = interactive;
    } else if (process.env.NON_INTERACTIVE === 'true') {
      this.interactive = false;
    } else {
      this.interactive = true;
    }
  }

  /**
   * Display a step message and synchronously wait for user to press Enter.
   * This is the only method that pauses execution.
   */
  step(message: string): void {
    this.stepCount++;

    // Display the step using base logger
    this.baseLogger.step(message);

    // Synchronously wait for Enter key
    this.waitForEnter();

    console.log(); // Add spacing after continuation
  }

  /**
   * Synchronously block execution until user presses Enter.
   * Uses platform-specific shell commands via spawnSync.
   * Automatically continues in non-interactive environments (CI).
   */
  private waitForEnter(): void {
    // Skip if explicitly set to non-interactive
    if (!this.interactive) {
      console.log(chalk.gray('(non-interactive mode, continuing automatically)'));
      return;
    }

    // Check for TTY (skip in CI/non-interactive environments)
    if (!process.stdin.isTTY) {
      console.log(chalk.gray('(non-interactive mode, continuing automatically)'));
      return;
    }

    console.log(chalk.dim('Press Enter to continue...'));

    // Platform-specific blocking input
    // stdio configuration: [stdin, stdout, stderr]
    // - stdin: inherit from parent (allows user input)
    // - stdout/stderr: pipe (suppress command output)
    if (process.platform === 'win32') {
      // Windows: use pause command
      spawnSync('cmd', ['/c', 'pause'], {
        stdio: [process.stdin, 'pipe', 'pipe'],
      });
    } else {
      // Unix/Mac: use bash read
      spawnSync('bash', ['-c', 'read -r'], {
        stdio: [process.stdin, 'pipe', 'pipe'],
      });
    }
  }

  // Pass-through methods - all delegate directly to base logger without modification

  info(message: string): void {
    this.baseLogger.info(message);
  }

  success(message: string): void {
    this.baseLogger.success(message);
  }

  error(message: string): void {
    this.baseLogger.error(message);
  }

  warning(message: string): void {
    this.baseLogger.warning(message);
  }

  command(command: string, result?: string): void {
    this.baseLogger.command(command, result);
  }

  production(message: string): void {
    this.baseLogger.production(message);
  }

  assert(condition: boolean, successMessage: string, failMessage?: string): void {
    this.baseLogger.assert(condition, successMessage, failMessage);
  }

  section(title: string): void {
    this.baseLogger.section(title);
  }
}
