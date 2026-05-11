import { KafkaClient } from '../src/technologies/kafka/client.js';

async function resetKafka() {
  console.log('Resetting Kafka...');

  const client = new KafkaClient();

  try {
    await client.connect();
    await client.reset();
    console.log('✓ Kafka topics reset successfully');
  } catch (error) {
    console.error('✗ Failed to reset Kafka:', error);
    process.exit(1);
  } finally {
    await client.disconnect();
  }
}

resetKafka();
