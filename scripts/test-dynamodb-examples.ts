import chalk from 'chalk';
import { DynamoDBClientWrapper } from '../src/technologies/dynamodb/client.js';
import { Logger } from '../src/lib/logger.js';

// Import all examples (will add as we create them)
import { basicsExample } from '../src/technologies/dynamodb/examples/01-basics/index.js';

const EXAMPLES = [
  basicsExample,
  // Will add more as we implement them
];

async function testDynamoDBExamples() {
  console.log(chalk.blue.bold('
🧪 Testing DynamoDB Examples
'));

  const client = new DynamoDBClientWrapper();
  const logger = new Logger();

  try {
    // Connect
    await client.connect();
    console.log(chalk.green('✓ Connected to DynamoDB
'));

    // Run each example
    let passed = 0;
    let failed = 0;

    for (const example of EXAMPLES) {
      try {
        console.log(chalk.cyan('
Running: ' + example.name));
        const clients = client.getClients();
        await example.run(clients, logger);
        passed++;
        console.log(chalk.green('✓ ' + example.name + ' passed'));
      } catch (error) {
        failed++;
        console.error(chalk.red('✗ ' + example.name + ' failed: ' + error));
      }

      // Reset after each example
      await client.reset();
    }

    // Summary
    console.log(chalk.blue.bold('
📊 Test Summary
'));
    console.log(chalk.green('  Passed: ' + passed + '/' + EXAMPLES.length));
    if (failed > 0) {
      console.log(chalk.red('  Failed: ' + failed + '/' + EXAMPLES.length));
    }

    await client.disconnect();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red('
Fatal error: ' + error));
    await client.disconnect();
    process.exit(1);
  }
}

testDynamoDBExamples();
