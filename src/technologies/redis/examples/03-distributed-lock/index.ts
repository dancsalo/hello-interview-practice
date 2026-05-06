import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const distributedLockExample: Example = {
  name: 'Distributed Lock',
  description: 'Prevent concurrent modifications with Redis locks',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Example: Distributed Lock');
    logger.info('Concert ticket booking - prevent double-booking\n');

    const ticketKey = 'tickets:concert:1001:available';
    const lockKey = 'lock:tickets:concert:1001';

    // Setup: 100 tickets available
    await client.set(ticketKey, '100');
    logger.info('Setup: 100 concert tickets available\n');

    logger.step('Step 1: Attempt to acquire lock');
    const lockValue = Date.now().toString(); // Unique identifier for this lock holder
    const acquired = await client.incr(lockKey);
    logger.command(`INCR ${lockKey}`, acquired.toString());

    if (acquired === 1) {
      logger.success('Lock acquired! This process owns the lock');

      // Set TTL to prevent deadlock if process crashes
      await client.expire(lockKey, 10);
      logger.command(`EXPIRE ${lockKey} 10`, 'TTL set to 10 seconds');
      logger.production('TTL prevents deadlock if lock holder crashes\n');

      logger.step('Step 2: Perform critical section (book ticket)');
      const available = await client.get(ticketKey);
      logger.info(`Current tickets: ${available}`);

      if (available && parseInt(available) > 0) {
        // Simulate booking logic
        await new Promise(resolve => setTimeout(resolve, 100));
        await client.decr(ticketKey);
        logger.command(`DECR ${ticketKey}`);
        logger.success('Ticket booked successfully!');
      } else {
        logger.warning('No tickets available');
      }

      logger.step('Step 3: Release lock');
      await client.del(lockKey);
      logger.command(`DEL ${lockKey}`);
      logger.success('Lock released\n');
    } else {
      logger.warning(`Lock already held by another process (counter: ${acquired})`);
      logger.info('In production, would retry with exponential backoff\n');
    }

    // Demonstrate retry logic
    logger.step('Step 4: Retry with exponential backoff');
    logger.info('Simulating multiple attempts to acquire lock...');

    const maxRetries = 3;
    let retries = 0;
    let lockAcquired = false;

    while (retries < maxRetries && !lockAcquired) {
      const attempt = await client.incr(lockKey);

      if (attempt === 1) {
        await client.expire(lockKey, 10);
        lockAcquired = true;
        logger.success(`Lock acquired on attempt ${retries + 1}`);
        await client.del(lockKey);
      } else {
        retries++;
        const backoffMs = Math.min(100 * Math.pow(2, retries), 1000);
        logger.info(`Attempt ${retries} failed, waiting ${backoffMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    if (!lockAcquired) {
      logger.warning('Failed to acquire lock after maximum retries');
    }

    logger.production('\nProduction Considerations:');
    logger.production('- Simple INCR lock works for basic use cases');
    logger.production('- Redlock algorithm provides stronger guarantees across multiple Redis nodes');
    logger.production('- Fencing tokens prevent issues from delayed operations');
    logger.production('- Always use TTL to prevent deadlocks');
    logger.production('- Consider database-level locks if your DB supports them (simpler!)');
    logger.production('- Distributed locks add complexity - only use when necessary\n');

    logger.success('✓ Distributed lock pattern demonstrated!');
  },
};
