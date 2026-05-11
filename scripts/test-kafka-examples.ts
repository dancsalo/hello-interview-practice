import { KafkaClient } from '../src/technologies/kafka/client.js';
import { Logger } from '../src/lib/logger.js';
import { basicsExample } from '../src/technologies/kafka/examples/01-basics/index.js';
import { partitioningExample } from '../src/technologies/kafka/examples/02-partitioning/index.js';

const EXAMPLES = [
  basicsExample,
  partitioningExample,
];

async function testKafkaExamples() {
  console.log('🧪 Testing Kafka Examples\n');

  const client = new KafkaClient();
  const logger = new Logger();
  const results: { name: string; success: boolean; error?: string }[] = [];

  try {
    await client.connect();
    console.log('✓ Connected to Kafka\n');

    for (const example of EXAMPLES) {
      console.log(`Testing: ${example.name}`);

      try {
        await example.run(client, logger);
        results.push({ name: example.name, success: true });
        console.log(`✓ ${example.name} passed\n`);
      } catch (error) {
        results.push({
          name: example.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(`✗ ${example.name} failed: ${error}\n`);
      }

      await client.reset();
    }

    console.log('\n=== Test Results ===');
    console.log(`Total: ${results.length}`);
    console.log(`Passed: ${results.filter((r) => r.success).length}`);
    console.log(`Failed: ${results.filter((r) => !r.success).length}\n`);

    if (results.some((r) => !r.success)) {
      console.log('Failed tests:');
      results
        .filter((r) => !r.success)
        .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
      process.exit(1);
    } else {
      console.log('✓ All tests passed!');
    }
  } catch (error) {
    console.error('✗ Test suite failed:', error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

testKafkaExamples();
