import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const leaderboardsExample: Example = {
  name: 'Leaderboards',
  description: 'Sorted sets for ranking and scoring',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Example: Leaderboards');
    logger.info('Game leaderboard with player scores\n');

    const leaderboardKey = 'game:leaderboard:global';

    logger.step('Step 1: Add player scores');
    await client.zAdd(leaderboardKey, [
      { score: 8500, value: 'player:alice' },
      { score: 7200, value: 'player:bob' },
      { score: 9800, value: 'player:charlie' },
      { score: 6100, value: 'player:diana' },
      { score: 8900, value: 'player:eve' },
      { score: 5400, value: 'player:frank' },
      { score: 7800, value: 'player:grace' },
      { score: 9200, value: 'player:henry' },
      { score: 6700, value: 'player:ivy' },
      { score: 8100, value: 'player:jack' },
    ]);
    logger.command(`ZADD ${leaderboardKey} 8500 player:alice 7200 player:bob ...`);
    logger.success('10 players added to leaderboard\n');

    logger.step('Step 2: Get top 3 players');
    const topPlayers = await client.zRangeWithScores(leaderboardKey, 0, 2, { REV: true });
    logger.command(`ZREVRANGE ${leaderboardKey} 0 2 WITHSCORES`);
    topPlayers.forEach((player, idx) => {
      logger.info(`  ${idx + 1}. ${player.value}: ${player.score} points`);
    });
    logger.assert(topPlayers[0].value === 'player:charlie', 'Highest scorer is first');
    logger.assert(topPlayers[0].score === 9800, 'Correct score for top player\n');

    logger.step('Step 3: Find a specific player\'s rank');
    const aliceRank = await client.zRevRank(leaderboardKey, 'player:alice');
    const aliceScore = await client.zScore(leaderboardKey, 'player:alice');
    logger.command(`ZREVRANK ${leaderboardKey} player:alice`, aliceRank?.toString() || 'null');
    logger.command(`ZSCORE ${leaderboardKey} player:alice`, aliceScore?.toString() || 'null');
    logger.info(`  Alice is rank #${(aliceRank || 0) + 1} with ${aliceScore} points`);
    logger.assert(aliceRank !== null, 'Player rank retrieved\n');

    logger.step('Step 4: Increment player score');
    const newScore = await client.zIncrBy(leaderboardKey, 500, 'player:alice');
    logger.command(`ZINCRBY ${leaderboardKey} 500 player:alice`, newScore.toString());
    logger.success(`Alice's new score: ${newScore} points`);

    const newRank = await client.zRevRank(leaderboardKey, 'player:alice');
    logger.info(`  Alice's new rank: #${(newRank || 0) + 1}\n`);

    logger.step('Step 5: Get players in score range');
    const midTierPlayers = await client.zRangeByScoreWithScores(
      leaderboardKey,
      7000,
      8000
    );
    logger.command(`ZRANGEBYSCORE ${leaderboardKey} 7000 8000 WITHSCORES`);
    logger.info('  Players with 7000-8000 points:');
    midTierPlayers.forEach(player => {
      logger.info(`    ${player.value}: ${player.score}`);
    });

    logger.step('Step 6: Pagination - Get ranks 4-6');
    const midRankers = await client.zRangeWithScores(leaderboardKey, 3, 5, { REV: true });
    logger.command(`ZREVRANGE ${leaderboardKey} 3 5 WITHSCORES`);
    logger.info('  Ranks 4-6:');
    midRankers.forEach((player, idx) => {
      logger.info(`    ${idx + 4}. ${player.value}: ${player.score}`);
    });

    logger.step('Step 7: Keep only top 100 (cleanup)');
    const removed = await client.zRemRangeByRank(leaderboardKey, 0, -101);
    logger.command(`ZREMRANGEBYRANK ${leaderboardKey} 0 -101`, `${removed} players removed`);
    logger.production('In production, periodically clean up to save memory\n');

    logger.production('Production Considerations:');
    logger.production('- Sorted sets use skip lists: O(log N) for most operations');
    logger.production('- Time-based leaderboards: Use timestamp as score, or separate sorted sets per period');
    logger.production('- Global vs regional: Multiple sorted sets with ZUNIONSTORE for aggregation');
    logger.production('- Pagination: Use ZRANGE with offset and limit for large leaderboards');
    logger.production('- Ties: Redis uses lexicographical order when scores are equal');
    logger.production('- Memory: Each entry is ~40 bytes, 1M entries ≈ 40MB\n');

    logger.success('✓ Leaderboard pattern demonstrated!');
  },
};
