import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const pubSubExample: Example = {
  name: 'Pub/Sub',
  description: 'Real-time messaging with publish/subscribe pattern',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Example: Pub/Sub Messaging');
    logger.info('Real-time notifications system\n');

    // Create separate subscriber clients (required for pub/sub)
    const subscriber1 = client.duplicate();
    const subscriber2 = client.duplicate();

    await subscriber1.connect();
    await subscriber2.connect();

    logger.step('Step 1: Subscribe to Channels');

    // Track received messages
    const receivedMessages: any[] = [];

    // Subscriber 1: Listen to user notifications
    subscriber1.subscribe('notifications:user:1001', (message, channel) => {
      logger.info(`[Subscriber 1] Received on ${channel}: ${message}`);
      receivedMessages.push({ subscriber: 1, channel, message });
    });

    logger.command('SUBSCRIBE notifications:user:1001');
    logger.success('Subscriber 1 listening to user:1001 notifications\n');

    // Subscriber 2: Listen to all user notifications (pattern)
    subscriber2.pSubscribe('notifications:user:*', (message, channel) => {
      logger.info(`[Subscriber 2] Received on ${channel}: ${message}`);
      receivedMessages.push({ subscriber: 2, channel, message });
    });

    logger.command('PSUBSCRIBE notifications:user:*');
    logger.success('Subscriber 2 listening to all user notifications (pattern)\n');

    // Give subscribers time to connect
    await new Promise(resolve => setTimeout(resolve, 100));

    // Step 2: Publish Messages
    logger.step('Step 2: Publish Messages');

    const message1 = 'New order #12345 placed';
    const count1 = await client.publish('notifications:user:1001', message1);
    logger.command(`PUBLISH notifications:user:1001 "${message1}"`, `${count1} subscribers received`);

    await new Promise(resolve => setTimeout(resolve, 100));

    const message2 = 'Payment confirmed for order #12345';
    const count2 = await client.publish('notifications:user:1001', message2);
    logger.command(`PUBLISH notifications:user:1001 "${message2}"`, `${count2} subscribers received`);

    await new Promise(resolve => setTimeout(resolve, 100));

    const message3 = 'Friend request from user:2002';
    const count3 = await client.publish('notifications:user:2002', message3);
    logger.command(`PUBLISH notifications:user:2002 "${message3}"`, `${count3} subscribers received`);

    await new Promise(resolve => setTimeout(resolve, 100));

    logger.success(`\nPublished ${3} messages, delivered to ${count1 + count2 + count3} subscribers total\n`);

    // Step 3: Channel Patterns
    logger.step('Step 3: Pattern Matching');
    logger.info('Subscriber 2 used PSUBSCRIBE with pattern "notifications:user:*"');
    logger.info('It received messages from both user:1001 and user:2002\n');

    // Step 4: Sharded Pub/Sub (Redis 7.0+)
    logger.step('Step 4: Sharded Pub/Sub (SPUBLISH)');
    logger.info('Sharded pub/sub for better scalability in clusters\n');

    try {
      // Create sharded subscriber
      const shardedSubscriber = client.duplicate();
      await shardedSubscriber.connect();

      let shardedReceived = false;

      shardedSubscriber.sSubscribe('chat:room:1', message => {
        logger.info(`[Sharded Subscriber] ${message}`);
        shardedReceived = true;
      });

      logger.command('SSUBSCRIBE chat:room:1');

      await new Promise(resolve => setTimeout(resolve, 100));

      const shardCount = await client.sPublish('chat:room:1', 'Hello from sharded channel!');
      logger.command('SPUBLISH chat:room:1 "Hello from sharded channel!"', `${shardCount} subscribers`);

      await new Promise(resolve => setTimeout(resolve, 100));

      if (shardedReceived) {
        logger.success('Sharded pub/sub working!\n');
      }

      logger.production('Sharded pub/sub (SPUBLISH/SSUBSCRIBE):');
      logger.production('- Scales better in Redis Cluster (messages stay on same shard)');
      logger.production('- No pattern matching support');
      logger.production('- Lower latency in clustered environments\n');

      await shardedSubscriber.quit();
    } catch (error: any) {
      logger.info('Sharded pub/sub requires Redis 7.0+ or cluster mode\n');
    }

    // Step 5: Active Channels
    logger.step('Step 5: Check Active Channels (PUBSUB CHANNELS)');

    const activeChannels = await client.pubSubChannels();
    logger.command('PUBSUB CHANNELS');
    logger.info(`Active channels: ${activeChannels.join(', ') || 'none'}\n`);

    // Step 6: Subscriber Count
    logger.step('Step 6: Check Subscriber Count (PUBSUB NUMSUB)');

    const numSub = await client.pubSubNumSub(['notifications:user:1001', 'notifications:user:2002']);
    logger.command('PUBSUB NUMSUB notifications:user:1001 notifications:user:2002');

    for (const [channel, count] of Object.entries(numSub)) {
      logger.info(`${channel}: ${count} subscribers`);
    }
    logger.success('');

    // Cleanup
    logger.step('Step 7: Unsubscribe');

    await subscriber1.unsubscribe('notifications:user:1001');
    logger.command('UNSUBSCRIBE notifications:user:1001');

    await subscriber2.pUnsubscribe('notifications:user:*');
    logger.command('PUNSUBSCRIBE notifications:user:*');

    logger.success('Unsubscribed from all channels\n');

    await subscriber1.quit();
    await subscriber2.quit();

    // Summary
    logger.info('\nMessage Summary:');
    logger.info(`Total messages received: ${receivedMessages.length}`);
    receivedMessages.forEach(msg => {
      logger.info(`  Subscriber ${msg.subscriber}: [${msg.channel}] ${msg.message}`);
    });

    logger.production('\n\nProduction Considerations:');
    logger.production('- At-most-once delivery: Messages lost if no subscribers');
    logger.production('- No persistence: Messages not stored');
    logger.production('- No acknowledgment: Cannot confirm delivery');
    logger.production('- Connection required: Subscribers must stay connected');
    logger.production('- Use Streams for guaranteed delivery');
    logger.production('- Use dedicated message queue (RabbitMQ, SQS) for critical messages');
    logger.production('- Separate Redis client per subscriber (blocking operation)');
    logger.production('- Consider backpressure and slow subscribers');
    logger.production('- Pattern matching has performance cost\n');

    logger.production('Good Use Cases:');
    logger.production('- Real-time notifications (chat, alerts)');
    logger.production('- Cache invalidation signals');
    logger.production('- Live dashboards and metrics');
    logger.production('- Broadcasting to online users');
    logger.production('- Event notifications (non-critical)\n');

    logger.production('Bad Use Cases (use Streams instead):');
    logger.production('- Job queues (need persistence)');
    logger.production('- Financial transactions (need guarantees)');
    logger.production('- Audit logs (must not lose data)');
    logger.production('- Task distribution (need acknowledgment)\n');

    logger.success('✓ Pub/Sub messaging demonstrated!');
  },
};
