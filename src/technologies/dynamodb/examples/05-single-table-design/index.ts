import type { DynamoDBExample, Logger, DynamoDBClients } from '../../../../lib/types.js';

export const singleTableExample: DynamoDBExample = {
  name: 'Single-Table Design',
  description: 'Composite keys and overloaded GSIs',

  async run(clients: DynamoDBClients, logger: Logger): Promise<void> {
    logger.section('🗂️ DynamoDB Single-Table Design');
    logger.warning('This example is coming soon!\n');
    logger.info('Will demonstrate:');
    logger.info('  • Store multiple entity types in one table');
    logger.info('  • Composite keys (USER#123, ORDER#456)');
    logger.info('  • Overloaded GSIs for multiple access patterns');
    logger.info('  • Adjacency list pattern\n');
  },
};
