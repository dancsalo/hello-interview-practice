/**
 * Elasticsearch Examples Integration Tests
 *
 * Tests all 10 Elasticsearch examples in non-interactive mode.
 * Requires Docker services to be running (elasticsearch, kibana).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { Logger } from '../src/lib/logger.js';
import { ELASTICSEARCH_EXAMPLES } from '../src/technologies/elasticsearch/index.js';

// Custom logger for test output capture
class TestLogger implements Logger {
  private errors: string[] = [];
  private outputs: string[] = [];

  info(message: string): void {
    this.outputs.push(`[INFO] ${message}`);
  }

  success(message: string): void {
    this.outputs.push(`[SUCCESS] ${message}`);
  }

  error(message: string): void {
    this.errors.push(message);
    this.outputs.push(`[ERROR] ${message}`);
  }

  warning(message: string): void {
    this.outputs.push(`[WARNING] ${message}`);
  }

  step(message: string): void {
    this.outputs.push(`[STEP] ${message}`);
  }

  command(command: string, result?: string): void {
    this.outputs.push(`[COMMAND] ${command}`);
    if (result) {
      this.outputs.push(`[RESULT] ${result}`);
    }
  }

  production(message: string): void {
    this.outputs.push(`[PRODUCTION] ${message}`);
  }

  assert(condition: boolean, successMessage: string, failMessage?: string): void {
    if (condition) {
      this.outputs.push(`[ASSERT PASS] ${successMessage}`);
    } else {
      const msg = failMessage || successMessage;
      this.errors.push(`Assertion failed: ${msg}`);
      this.outputs.push(`[ASSERT FAIL] ${msg}`);
    }
  }

  section(title: string): void {
    this.outputs.push(`\n${'='.repeat(60)}`);
    this.outputs.push(title);
    this.outputs.push('='.repeat(60));
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): string[] {
    return [...this.errors];
  }

  getOutput(): string {
    return this.outputs.join('\n');
  }

  reset(): void {
    this.errors = [];
    this.outputs = [];
  }
}

describe('Elasticsearch Examples Integration Tests', () => {
  let client: Client;
  let logger: TestLogger;
  const TEST_TIMEOUT = 30000; // 30 seconds per test

  beforeAll(async () => {
    // Create Elasticsearch client
    client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    });

    // Wait for Elasticsearch to be ready
    await waitForElasticsearch(client, 30000);
  }, 60000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  beforeEach(() => {
    // Create fresh logger for each test
    logger = new TestLogger();
  });

  // Test each example individually
  for (const example of ELASTICSEARCH_EXAMPLES) {
    it(
      `should run ${example.name} without errors`,
      async () => {
        try {
          // Run the example in non-interactive mode
          await example.run(client, logger, { nonInteractive: true });

          // Check for errors
          if (logger.hasErrors()) {
            const errors = logger.getErrors();
            console.error(`\n❌ ${example.name} failed with errors:`);
            console.error(errors.join('\n'));
            console.error('\nFull output:');
            console.error(logger.getOutput());

            expect(logger.hasErrors()).toBe(false);
          }

          // Verify example completed
          expect(logger.hasErrors()).toBe(false);
        } catch (error: any) {
          console.error(`\n❌ ${example.name} threw an exception:`);
          console.error(error.message);
          console.error('\nFull output:');
          console.error(logger.getOutput());

          throw error;
        } finally {
          // Always run cleanup
          if (example.cleanup) {
            try {
              await example.cleanup(client);
            } catch (cleanupError: any) {
              console.warn(`Warning: Cleanup failed for ${example.name}:`, cleanupError.message);
            }
          }
        }
      },
      TEST_TIMEOUT
    );
  }

  // Summary test
  it('should have 10 examples total', () => {
    expect(ELASTICSEARCH_EXAMPLES.length).toBe(10);
  });

  it('all examples should have required properties', () => {
    for (const example of ELASTICSEARCH_EXAMPLES) {
      expect(example).toHaveProperty('name');
      expect(example).toHaveProperty('description');
      expect(example).toHaveProperty('run');
      expect(typeof example.name).toBe('string');
      expect(typeof example.description).toBe('string');
      expect(typeof example.run).toBe('function');

      // Cleanup is optional but should be a function if present
      if (example.cleanup) {
        expect(typeof example.cleanup).toBe('function');
      }
    }
  });
});

/**
 * Wait for Elasticsearch to be ready
 */
async function waitForElasticsearch(client: Client, timeout: number): Promise<void> {
  const start = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - start < timeout) {
    try {
      const health = await client.cluster.health();

      // Consider yellow and green as healthy (yellow is normal for single-node)
      if (health.status === 'green' || health.status === 'yellow') {
        console.log(`✅ Elasticsearch is ready (status: ${health.status})`);
        return;
      }

      console.log(`⏳ Elasticsearch status: ${health.status}, waiting...`);
    } catch (error: any) {
      lastError = error;
      // Connection errors are expected while ES is starting
    }

    // Wait 1 second before retry
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Elasticsearch not ready after ${timeout}ms. Last error: ${lastError?.message || 'Unknown'}`
  );
}
