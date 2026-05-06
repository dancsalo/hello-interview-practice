import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const eventSourcingExample: Example = {
  name: 'Event Sourcing',
  description: 'Event streams with consumer groups for event-driven architecture',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Example: Event Sourcing with Streams');
    logger.info('Order processing system with event log\n');

    const streamKey = 'events:orders';
    const consumerGroup = 'order-processors';
    const consumer1 = 'worker-1';
    const consumer2 = 'worker-2';

    // Step 1: Create Stream with Events
    logger.step('Step 1: Append Events to Stream (XADD)');

    const events = [
      { type: 'OrderCreated', orderId: 'ORD-001', userId: 'user:1001', amount: '99.99' },
      { type: 'PaymentReceived', orderId: 'ORD-001', paymentId: 'PAY-001', method: 'credit_card' },
      { type: 'OrderShipped', orderId: 'ORD-001', trackingId: 'TRK-001', carrier: 'FedEx' },
      { type: 'OrderCreated', orderId: 'ORD-002', userId: 'user:1002', amount: '149.99' },
      { type: 'PaymentReceived', orderId: 'ORD-002', paymentId: 'PAY-002', method: 'paypal' },
    ];

    const eventIds: string[] = [];
    for (const event of events) {
      const id = await client.xAdd(streamKey, '*', event as any);
      eventIds.push(id);
      logger.command(`XADD ${streamKey} * type ${event.type} orderId ${event.orderId} ...`, id);
    }

    logger.success(`Added ${events.length} events to stream\n`);

    // Step 2: Read Stream History
    logger.step('Step 2: Read Event History (XRANGE)');

    const history = await client.xRange(streamKey, '-', '+', { COUNT: 10 });
    logger.command(`XRANGE ${streamKey} - + COUNT 10`);

    logger.info('Event history:');
    history.forEach(entry => {
      logger.info(`  [${entry.id}] ${entry.message.type}: ${entry.message.orderId}`);
    });
    logger.success(`Read ${history.length} events\n`);

    // Step 3: Create Consumer Group
    logger.step('Step 3: Create Consumer Group (XGROUP CREATE)');

    try {
      await client.xGroupCreate(streamKey, consumerGroup, '0', { MKSTREAM: true });
      logger.command(`XGROUP CREATE ${streamKey} ${consumerGroup} 0 MKSTREAM`);
      logger.success(`Consumer group '${consumerGroup}' created\n`);
    } catch (error: any) {
      if (error.message.includes('BUSYGROUP')) {
        logger.info(`Consumer group '${consumerGroup}' already exists\n`);
      } else {
        throw error;
      }
    }

    // Step 4: Consume Events (Worker 1)
    logger.step('Step 4: Worker 1 Consumes Events (XREADGROUP)');

    const messages1 = await client.xReadGroup(consumerGroup, consumer1, { key: streamKey, id: '>' }, {
      COUNT: 2,
      BLOCK: 100,
    });

    if (messages1 && messages1.length > 0) {
      logger.command(`XREADGROUP GROUP ${consumerGroup} ${consumer1} COUNT 2 BLOCK 100 STREAMS ${streamKey} >`);

      for (const stream of messages1) {
        logger.info(`Worker 1 received ${stream.messages.length} messages:`);
        for (const msg of stream.messages) {
          logger.info(`  [${msg.id}] ${msg.message.type}: ${msg.message.orderId}`);

          // Simulate processing
          logger.info(`  Processing ${msg.message.type}...`);

          // Acknowledge message
          await client.xAck(streamKey, consumerGroup, msg.id);
          logger.command(`XACK ${streamKey} ${consumerGroup} ${msg.id}`);
        }
      }
      logger.success('Worker 1 acknowledged messages\n');
    }

    // Step 5: Consume Events (Worker 2)
    logger.step('Step 5: Worker 2 Consumes Different Events');

    const messages2 = await client.xReadGroup(consumerGroup, consumer2, { key: streamKey, id: '>' }, {
      COUNT: 2,
      BLOCK: 100,
    });

    if (messages2 && messages2.length > 0) {
      logger.command(`XREADGROUP GROUP ${consumerGroup} ${consumer2} COUNT 2 BLOCK 100 STREAMS ${streamKey} >`);

      for (const stream of messages2) {
        logger.info(`Worker 2 received ${stream.messages.length} messages:`);
        for (const msg of stream.messages) {
          logger.info(`  [${msg.id}] ${msg.message.type}: ${msg.message.orderId}`);
        }
      }
      logger.success('Workers consume in parallel (load balancing)\n');
    }

    // Step 6: Pending Messages
    logger.step('Step 6: Check Pending Messages (XPENDING)');

    const pending = await client.xPending(streamKey, consumerGroup);
    logger.command(`XPENDING ${streamKey} ${consumerGroup}`);
    logger.info(`Pending messages: ${pending.pending}`);
    logger.info(`Consumers: ${JSON.stringify(pending.consumers)}`);
    logger.production('Track pending messages to detect slow/failed consumers\n');

    // Step 7: Claim Stale Messages
    if (pending.pending > 0) {
      logger.step('Step 7: Claim Stale Messages (XCLAIM)');
      logger.info('If a worker crashes, another worker can claim its messages\n');

      const detailedPending = await client.xPendingRange(streamKey, consumerGroup, '-', '+', 10);

      if (Array.isArray(detailedPending) && detailedPending.length > 0) {
        const oldestMessage = detailedPending[0];
        logger.info(`Oldest pending: ${oldestMessage.id} (idle: ${oldestMessage.millisecondsSinceLastDelivery}ms)`);

        // Claim if idle > 1000ms (simulated)
        if (oldestMessage.millisecondsSinceLastDelivery > 0) {
          const claimed = await client.xClaim(
            streamKey,
            consumerGroup,
            consumer2,
            1, // min idle time in ms
            [oldestMessage.id]
          );

          logger.command(
            `XCLAIM ${streamKey} ${consumerGroup} ${consumer2} 1 ${oldestMessage.id}`,
            `Claimed ${claimed.length} messages`
          );
          logger.success('Message reclaimed by another worker\n');
        }
      }
    }

    // Step 8: Stream Info
    logger.step('Step 8: Stream Information (XINFO STREAM)');

    const info = await client.xInfoStream(streamKey);
    logger.command(`XINFO STREAM ${streamKey}`);
    logger.info(`Stream length: ${info.length}`);
    logger.info(`Consumer groups: ${info.groups}`);
    logger.info(`First entry: ${info.firstEntry?.id}`);
    logger.info(`Last entry: ${info.lastEntry?.id}\n`);

    // Step 9: Trimming Old Events
    logger.step('Step 9: Trim Old Events (XTRIM)');

    const trimmed = await client.xTrim(streamKey, 'MAXLEN', 1000, { strategyModifier: '~' });
    logger.command(`XTRIM ${streamKey} MAXLEN ~ 1000`, `${trimmed} entries trimmed`);
    logger.production('Use XTRIM to prevent unbounded memory growth');
    logger.production('~ allows approximate trimming (more efficient)\n');

    // Step 10: Read from Specific Time
    logger.step('Step 10: Time-Based Queries');

    const timestamp = Date.now() - 60000; // 1 minute ago
    const recentEvents = await client.xRange(streamKey, timestamp.toString(), '+');
    logger.command(`XRANGE ${streamKey} ${timestamp} +`);
    logger.info(`Events from last minute: ${recentEvents.length}`);
    logger.production('Stream IDs encode timestamp: <millisecondsTime>-<sequenceNumber>\n');

    logger.production('\nProduction Considerations:');
    logger.production('- Streams provide persistent event log with at-least-once delivery');
    logger.production('- Consumer groups enable parallel processing with load balancing');
    logger.production('- XACK confirms processing (idempotency important!)');
    logger.production('- XCLAIM handles worker failures and rebalancing');
    logger.production('- XTRIM prevents unbounded growth (set retention policy)');
    logger.production('- Use XAUTOCLAIM for automatic claiming of stale messages');
    logger.production('- For high throughput, consider Kafka or Pulsar');
    logger.production('- Streams are single-partition - shard for horizontal scaling');
    logger.production('- Monitor pending message count and consumer lag\n');

    logger.success('✓ Event sourcing with Redis Streams demonstrated!');
  },
};
