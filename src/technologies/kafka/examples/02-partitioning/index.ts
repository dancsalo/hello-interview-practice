import type { KafkaClient } from '../../client.js';
import type { KafkaExample, Logger } from '../../../../lib/types.js';

export const partitioningExample: KafkaExample = {
  name: 'Partitioning Strategies',
  description: 'How keys affect partition assignment and message distribution',

  async run(client: KafkaClient, logger: Logger): Promise<void> {
    const producer = client.getProducer();
    const admin = client.getAdmin();

    logger.section('🔀 Kafka Partitioning Strategies');
    logger.info('Demonstrating how different keys affect partition distribution\n');

    const topics = ['orders-by-customer', 'orders-by-order', 'orders-no-key'];
    await client.resetTopics(topics);

    logger.step('Step 1: Create 3 topics with 4 partitions each');
    await admin.createTopics({
      topics: topics.map((topic) => ({
        topic,
        numPartitions: 4,
        replicationFactor: 1,
      })),
    });
    logger.command('admin.createTopics({ topics: [...], numPartitions: 4 })');
    logger.production('Partition count determines max parallelism\n');

    // Generate test orders
    const orders = [
      { orderId: 'ORD-001', customerId: 'CUST-A', amount: 50 },
      { orderId: 'ORD-002', customerId: 'CUST-B', amount: 75 },
      { orderId: 'ORD-003', customerId: 'CUST-A', amount: 120 },
      { orderId: 'ORD-004', customerId: 'CUST-C', amount: 200 },
      { orderId: 'ORD-005', customerId: 'CUST-A', amount: 30 },
      { orderId: 'ORD-006', customerId: 'CUST-B', amount: 95 },
      { orderId: 'ORD-007', customerId: 'CUST-C', amount: 180 },
      { orderId: 'ORD-008', customerId: 'CUST-A', amount: 60 },
    ];

    // Strategy 1: Partition by customer ID
    logger.step('Step 2: Strategy 1 - Partition by Customer ID');
    logger.info('Same customer always goes to same partition (ordering guarantee)\n');

    const customerPartitions: Record<string, number[]> = {};
    for (const order of orders) {
      const [result] = await producer.send({
        topic: 'orders-by-customer',
        messages: [
          {
            key: order.customerId,
            value: JSON.stringify(order),
          },
        ],
      });

      const partition = result.baseOffset
        ? Number(result.baseOffset) % 4
        : 0;

      if (!customerPartitions[order.customerId]) {
        customerPartitions[order.customerId] = [];
      }
      customerPartitions[order.customerId].push(partition);

      logger.command(
        `send(key: "${order.customerId}", order: ${order.orderId})`,
        `→ partition from topic metadata`
      );
    }
    logger.production('Customer ID as key ensures per-customer ordering\n');

    // Strategy 2: Partition by order ID
    logger.step('Step 3: Strategy 2 - Partition by Order ID');
    logger.info('Each order gets distributed independently\n');

    for (const order of orders) {
      await producer.send({
        topic: 'orders-by-order',
        messages: [
          {
            key: order.orderId,
            value: JSON.stringify(order),
          },
        ],
      });
      logger.command(
        `send(key: "${order.orderId}", order: ${order.orderId})`,
        `→ distributed by order ID hash`
      );
    }
    logger.production('Order ID as key spreads load but loses customer ordering\n');

    // Strategy 3: No key (round-robin)
    logger.step('Step 4: Strategy 3 - No Key (Round-Robin)');
    logger.info('Messages distributed evenly across partitions\n');

    for (const order of orders) {
      await producer.send({
        topic: 'orders-no-key',
        messages: [
          {
            value: JSON.stringify(order),
          },
        ],
      });
      logger.command(
        `send(key: null, order: ${order.orderId})`,
        `→ round-robin distribution`
      );
    }
    logger.production('No key = round-robin; best throughput but no ordering\n');

    // Analyze distribution
    logger.step('Step 5: Analyze partition distribution');

    const topicOffsets = await admin.fetchTopicOffsets('orders-by-customer');
    logger.info('\norders-by-customer partition distribution:');
    for (const partInfo of topicOffsets) {
      const count = Number(partInfo.high) - Number(partInfo.low);
      const bar = '█'.repeat(count);
      logger.info(`  Partition ${partInfo.partition}: ${bar} (${count} messages)`);
    }

    const orderOffsets = await admin.fetchTopicOffsets('orders-by-order');
    logger.info('\norders-by-order partition distribution:');
    for (const partInfo of orderOffsets) {
      const count = Number(partInfo.high) - Number(partInfo.low);
      const bar = '█'.repeat(count);
      logger.info(`  Partition ${partInfo.partition}: ${bar} (${count} messages)`);
    }

    const noKeyOffsets = await admin.fetchTopicOffsets('orders-no-key');
    logger.info('\norders-no-key partition distribution:');
    for (const partInfo of noKeyOffsets) {
      const count = Number(partInfo.high) - Number(partInfo.low);
      const bar = '█'.repeat(count);
      logger.info(`  Partition ${partInfo.partition}: ${bar} (${count} messages)`);
    }

    logger.success('\n✓ Partitioning strategies demonstrated!');
    logger.info('Key Takeaways:');
    logger.info('  • Same key → same partition (ordering guarantee per key)');
    logger.info('  • Different keys → different distribution patterns');
    logger.info('  • No key → round-robin (even distribution, no ordering)');
    logger.info('  • Choose key based on ordering vs. distribution needs');
    logger.info('  • Hot keys can cause partition skew (uneven load)\n');
  },
};
