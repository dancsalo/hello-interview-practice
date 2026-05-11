import type { KafkaClient } from '../../client.js';
import type { KafkaExample, Logger } from '../../../../lib/types.js';

export const basicsExample: KafkaExample = {
  name: 'Basics: Topics & Messages',
  description: 'Core Kafka concepts - topics, producers, consumers',

  async run(client: KafkaClient, logger: Logger): Promise<void> {
    const producer = client.getProducer();
    const admin = client.getAdmin();
    const consumer = client.createConsumer('basics-group');

    logger.section('📨 Kafka Basics: Topics, Producers & Consumers');
    logger.info('E-commerce order creation events\n');

    await client.resetTopics(['orders']);

    logger.step('Step 1: Create topic with 3 partitions');
    await admin.createTopics({
      topics: [
        {
          topic: 'orders',
          numPartitions: 3,
          replicationFactor: 1,
        },
      ],
    });
    logger.command('admin.createTopics({ topic: "orders", numPartitions: 3 })');
    logger.production('Topics are logical groupings; partitions enable parallelism\n');

    logger.step('Step 2: Produce order events with keys');
    const orders = [
      { orderId: 'order-1001', customerId: 'customer-1', amount: 99.99 },
      { orderId: 'order-1002', customerId: 'customer-2', amount: 149.50 },
      { orderId: 'order-1003', customerId: 'customer-1', amount: 249.00 },
    ];

    for (const order of orders) {
      await producer.send({
        topic: 'orders',
        messages: [
          {
            key: order.customerId,
            value: JSON.stringify(order),
            headers: {
              'event-type': 'order-created',
              'timestamp': new Date().toISOString(),
            },
          },
        ],
      });
      logger.command(
        `producer.send({ key: "${order.customerId}", value: ${order.orderId} })`
      );
    }
    logger.assert(true, 'All order events produced successfully');
    logger.production('Keys determine partition assignment; same key = same partition\n');

    logger.step('Step 3: Consume messages from beginning');
    await consumer.connect();
    await consumer.subscribe({ topic: 'orders', fromBeginning: true });

    const messages: any[] = [];
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const order = {
          key: message.key?.toString(),
          value: JSON.parse(message.value?.toString() || '{}'),
          partition,
          offset: message.offset,
        };
        messages.push(order);
        logger.command(
          `Consumed from partition ${partition}`,
          `offset: ${message.offset}, key: ${order.key}, order: ${order.value.orderId}`
        );
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await consumer.disconnect();

    logger.assert(
      messages.length === 3,
      'All 3 messages consumed successfully'
    );
    logger.production('Offsets track consumer position; enable resume after failure\n');

    logger.success('\n✓ Kafka basics demonstrated!');
    logger.info('Key Concepts:');
    logger.info('  • Topics group related messages logically');
    logger.info('  • Partitions distribute messages physically');
    logger.info('  • Keys determine partition assignment (same key → same partition)');
    logger.info('  • Offsets track position in partition');
    logger.info('  • Messages contain: key, value, timestamp, headers\n');
  },
};
