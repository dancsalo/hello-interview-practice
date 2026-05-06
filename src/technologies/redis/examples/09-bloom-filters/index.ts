import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const bloomFiltersExample: Example = {
  name: 'Bloom Filters',
  description: 'Probabilistic data structure for membership testing',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Example: Bloom Filters');
    logger.info('Check if username is taken (space-efficient membership test)\n');

    const bloomKey = 'usernames:bloom';
    const setKey = 'usernames:set';

    // Check if RedisBloom module is available
    try {
      await client.sendCommand(['BF.RESERVE', bloomKey, '0.01', '10000']);
      logger.command('BF.RESERVE usernames:bloom 0.01 10000');
      logger.info('Created bloom filter: 0.01 error rate, 10000 expected items\n');
    } catch (error: any) {
      if (error.message.includes('unknown command') || error.message.includes('WRONGTYPE')) {
        logger.warning('⚠️  RedisBloom module not available');
        logger.info('Install with: docker run -p 6379:6379 redis/redis-stack-server');
        logger.info('\nContinuing with simulated bloom filter behavior...\n');

        // Simulate with regular set for demonstration
        await demonstrateBloomConcept(client, logger);
        return;
      } else if (!error.message.includes('item exists')) {
        throw error;
      }
      logger.info('Bloom filter already exists\n');
    }

    // Step 1: Add usernames to bloom filter
    logger.step('Step 1: Add Usernames to Bloom Filter (BF.ADD)');

    const usernames = ['alice', 'bob', 'charlie', 'david', 'emma', 'frank', 'grace', 'henry'];

    for (const username of usernames) {
      const added = await client.sendCommand(['BF.ADD', bloomKey, username]);
      if (added === 1) {
        logger.command(`BF.ADD ${bloomKey} ${username}`, 'true');
      }
    }

    logger.success(`Added ${usernames.length} usernames to bloom filter\n`);

    // Also add to regular set for comparison
    await client.sAdd(setKey, usernames);

    // Step 2: Check for existing usernames
    logger.step('Step 2: Check Existing Usernames (BF.EXISTS)');

    for (const username of ['alice', 'bob', 'zack']) {
      const exists = await client.sendCommand(['BF.EXISTS', bloomKey, username]);
      logger.command(`BF.EXISTS ${bloomKey} ${username}`, exists ? 'true' : 'false');

      if (username === 'alice' || username === 'bob') {
        logger.assert(exists === 1, `${username} correctly found in filter`);
      }
    }
    logger.success('');

    // Step 3: False Positive Demonstration
    logger.step('Step 3: False Positive Rate');
    logger.info('Bloom filters can have false positives (says "maybe in set")');
    logger.info('But NEVER false negatives (always correct for "not in set")\n');

    const testUsernames = Array.from({ length: 1000 }, (_, i) => `user${i}`);
    let falsePositives = 0;

    for (const username of testUsernames) {
      const bloomResult = await client.sendCommand(['BF.EXISTS', bloomKey, username]);
      const actualExists = await client.sIsMember(setKey, username);

      if (bloomResult === 1 && !actualExists) {
        falsePositives++;
      }
    }

    const falsePositiveRate = (falsePositives / testUsernames.length) * 100;
    logger.info(`False positives: ${falsePositives}/${testUsernames.length} (${falsePositiveRate.toFixed(2)}%)`);
    logger.info(`Expected rate: ~1% (configured with 0.01 error rate)`);
    logger.production('Trade-off: Space savings for occasional false positives\n');

    // Step 4: Memory Comparison
    logger.step('Step 4: Memory Usage Comparison');

    try {
      const bloomInfo = await client.sendCommand(['BF.INFO', bloomKey]);
      if (Array.isArray(bloomInfo) && bloomInfo.length > 7) {
        const bloomMemory = bloomInfo[7]; // Size field

        const setMemory = await client.memoryUsage(setKey);

        logger.info(`Bloom filter: ~${bloomMemory} bytes`);
        logger.info(`Regular set: ~${setMemory} bytes`);
        if (setMemory) {
          logger.info(`Space savings: ${((1 - Number(bloomMemory) / Number(setMemory)) * 100).toFixed(1)}%\n`);
        }
      }
    } catch (error) {
      logger.info('Memory comparison unavailable\n');
    }

    // Step 5: Bulk Operations
    logger.step('Step 5: Bulk Add (BF.MADD)');

    const newUsernames = ['iris', 'jack', 'kate'];
    const results = await client.sendCommand(['BF.MADD', bloomKey, ...newUsernames]);
    logger.command(`BF.MADD ${bloomKey} ${newUsernames.join(' ')}`);
    if (Array.isArray(results)) {
      logger.info(`Added: ${results.filter((r: any) => r === 1).length} new items\n`);
    }

    // Step 6: Bulk Check
    logger.step('Step 6: Bulk Check (BF.MEXISTS)');

    const checkNames = ['alice', 'iris', 'unknown'];
    const existsResults = await client.sendCommand(['BF.MEXISTS', bloomKey, ...checkNames]);
    logger.command(`BF.MEXISTS ${bloomKey} ${checkNames.join(' ')}`);

    checkNames.forEach((name, index) => {
      const exists = (existsResults as number[])[index] === 1;
      logger.info(`  ${name}: ${exists ? 'exists' : 'not found'}`);
    });
    logger.success('');

    // Step 7: Scaling Bloom Filter
    logger.step('Step 7: Scalable Bloom Filter (BF.RESERVE with expansion)');

    const scalableKey = 'usernames:scalable';

    try {
      // EXPANSION 2 means each new filter is 2x larger
      await client.sendCommand(['BF.RESERVE', scalableKey, '0.01', '100', 'EXPANSION', '2']);
      logger.command('BF.RESERVE usernames:scalable 0.01 100 EXPANSION 2');
      logger.info('Created scalable bloom filter that auto-expands\n');

      // Add more items than initial capacity
      const manyItems = Array.from({ length: 300 }, (_, i) => `user${i}`);
      for (let i = 0; i < manyItems.length; i += 100) {
        const batch = manyItems.slice(i, i + 100);
        await client.sendCommand(['BF.MADD', scalableKey, ...batch]);
      }

      logger.success('Added 300 items (3x initial capacity) - filter auto-expanded\n');
    } catch (error: any) {
      if (!error.message.includes('item exists')) {
        logger.info('Scalable bloom filter already exists\n');
      }
    }

    logger.production('\nProduction Considerations:');
    logger.production('- Bloom filters: O(k) time, where k = number of hash functions');
    logger.production('- Space: ~1.44 bytes per item per 0.1% error rate');
    logger.production('- False positives increase as filter fills up');
    logger.production('- Cannot remove items (use Cuckoo filters instead)');
    logger.production('- Perfect for: duplicate detection, cache filtering, malware detection');
    logger.production('- Use BF.RESERVE to pre-allocate capacity (faster than auto-scaling)');
    logger.production('- Monitor false positive rate in production');
    logger.production('- Consider Counting Bloom Filters if you need deletion\n');

    logger.success('✓ Bloom filter patterns demonstrated!');
  },
};

// Simulated bloom filter demonstration when RedisBloom is not available
async function demonstrateBloomConcept(client: RedisClientType, logger: Logger): Promise<void> {
  logger.step('Simulated Bloom Filter Demonstration');
  logger.info('Using regular Redis set to demonstrate concept\n');

  const setKey = 'usernames:demo';

  // Add usernames
  const usernames = ['alice', 'bob', 'charlie', 'david', 'emma'];
  await client.sAdd(setKey, usernames);
  logger.info(`Added usernames: ${usernames.join(', ')}\n`);

  // Check membership
  logger.step('Membership Checks');
  const checks = ['alice', 'zack', 'bob'];

  for (const username of checks) {
    const exists = await client.sIsMember(setKey, username);
    logger.info(`  ${username}: ${exists ? 'exists' : 'not found'}`);
  }

  logger.production('\n\nReal Bloom Filter Benefits (when module available):');
  logger.production('- 10x-100x less memory than regular set');
  logger.production('- Constant O(k) time regardless of set size');
  logger.production('- Trade-off: Small chance of false positives\n');

  logger.production('Example Space Savings:');
  logger.production('- 1 million usernames in set: ~100 MB');
  logger.production('- Same in bloom filter (1% error): ~1.2 MB');
  logger.production('- Savings: 98.8% less memory\n');

  logger.success('✓ Bloom filter concept demonstrated!');
}
