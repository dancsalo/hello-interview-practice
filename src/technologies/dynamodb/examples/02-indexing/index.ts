import type { DynamoDBExample, Logger, DynamoDBClients } from '../../../../lib/types.js';

export const indexingExample: DynamoDBExample = {
  name: 'Indexing: GSIs and LSIs',
  description: 'Global and Local Secondary Indexes',

  async run(clients: DynamoDBClients, logger: Logger): Promise<void> {
    logger.section('🔍 DynamoDB Indexing: GSIs and LSIs');
    logger.warning('This example is coming soon!\n');
    logger.info('Will demonstrate:');
    logger.info('  • Creating Global Secondary Indexes (GSI)');
    logger.info('  • Creating Local Secondary Indexes (LSI)');
    logger.info('  • Projection strategies (ALL, KEYS_ONLY, INCLUDE)');
    logger.info('  • Query patterns with indexes\n');
  },
};
