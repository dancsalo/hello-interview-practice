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
<<<<<<< HEAD
  console.log(chalk.blue.bold('
🧪 Testing DynamoDB Examples
'));
=======
  console.log(chalk.blue.bold('\n🧪 Testing DynamoDB Examples\n'));
>>>>>>> 8edf9ffd2c0f58507a37d777ce08942b98fc327e

  const client = new DynamoDBClientWrapper();
  const logger = new Logger();

  try {
    // Connect
    await client.connect();
<<<<<<< HEAD
    console.log(chalk.green('✓ Connected to DynamoDB
'));
=======
    console.log(chalk.green('✓ Connected to DynamoDB\n'));
>>>>>>> 8edf9ffd2c0f58507a37d777ce08942b98fc327e

    // Run each example
    let passed = 0;
    let failed = 0;

    for (const example of EXAMPLES) {
      try {
<<<<<<< HEAD
        console.log(chalk.cyan('
Running: ' + example.name));
        const clients = client.getClients();
        await example.run(clients, logger);
        passed++;
        console.log(chalk.green('✓ ' + example.name + ' passed'));
      } catch (error) {
        failed++;
        console.error(chalk.red('✗ ' + example.name + ' failed: ' + error));
=======
        console.log(chalk.cyan(`\nRunning: ${example.name}`));
        const clients = client.getClients();
        await example.run(clients, logger);
        passed++;
        console.log(chalk.green(`✓ ${example.name} passed`));
      } catch (error) {
        failed++;
        console.error(chalk.red(`✗ ${example.name} failed: ${error}`));
>>>>>>> 8edf9ffd2c0f58507a37d777ce08942b98fc327e
      }

      // Reset after each example
      await client.reset();
    }

    // Summary
<<<<<<< HEAD
    console.log(chalk.blue.bold('
📊 Test Summary
'));
    console.log(chalk.green('  Passed: ' + passed + '/' + EXAMPLES.length));
    if (failed > 0) {
      console.log(chalk.red('  Failed: ' + failed + '/' + EXAMPLES.length));
=======
    console.log(chalk.blue.bold('\n📊 Test Summary\n'));
    console.log(chalk.green(`  Passed: ${passed}/${EXAMPLES.length}`));
    if (failed > 0) {
      console.log(chalk.red(`  Failed: ${failed}/${EXAMPLES.length}`));
>>>>>>> 8edf9ffd2c0f58507a37d777ce08942b98fc327e
    }

    await client.disconnect();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
<<<<<<< HEAD
    console.error(chalk.red('
Fatal error: ' + error));
=======
    console.error(chalk.red(`\nFatal error: ${error}`));
>>>>>>> 8edf9ffd2c0f58507a37d777ce08942b98fc327e
    await client.disconnect();
    process.exit(1);
  }
}

testDynamoDBExamples();
