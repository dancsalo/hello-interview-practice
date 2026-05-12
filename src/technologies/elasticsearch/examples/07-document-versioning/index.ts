import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const documentVersioningExample = {
  name: 'Document Versioning: Concurrent Updates',
  description: 'Optimistic concurrency control with version checks',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Document Versioning: Concurrent Updates');
    logger.info('Product inventory management with conflict handling\n');

    // Create index
    logger.step('Step 1: Create products index');
    await client.indices.create({
      index: 'products',
      body: {
        mappings: {
          properties: {
            name: { type: 'text' },
            sku: { type: 'keyword' },
            price: { type: 'float' },
            inventory: { type: 'integer' },
            last_updated: { type: 'date' },
          },
        },
      },
    });
    logger.command('PUT /products', 'with inventory tracking');
    logger.success('Products index created\n');

    // Index a product
    logger.step('Step 2: Index a product and observe version');
    const indexResult = await client.index({
      index: 'products',
      body: {
        name: 'Wireless Mouse',
        sku: 'MOUSE-001',
        price: 29.99,
        inventory: 100,
        last_updated: new Date().toISOString(),
      },
      refresh: 'wait_for',
    });
    const productId = indexResult._id;
    logger.command('POST /products/_doc', 'index product');
    logger.info(`Product ID: ${productId}`);
    logger.info(`Initial version: ${indexResult._version}`);
    logger.assert(indexResult._version === 1, 'Initial version is 1');
    logger.production('Every document has a _version that increments on updates\n');

    // Update without version check
    logger.step('Step 3: Update without version check');
    const updateResult = await client.update({
      index: 'products',
      id: productId,
      body: {
        doc: {
          price: 24.99,
          last_updated: new Date().toISOString(),
        },
      },
      refresh: 'wait_for',
    });
    logger.command(`POST /products/_update/${productId}`, 'update without version check');
    logger.info(`New version: ${updateResult._version}`);
    logger.assert(updateResult._version === 2, 'Version incremented to 2');
    logger.production('Updates without version check always succeed (last write wins)\n');

    // Simulate concurrent update conflict
    logger.step('Step 4: Detect concurrent update conflict');

    // Get current document and version
    const getResult = await client.get({
      index: 'products',
      id: productId,
    });
    const currentVersion = getResult._version;
    const currentSeqNo = getResult._seq_no;
    const currentPrimaryTerm = getResult._primary_term;

    logger.info(`Current version: ${currentVersion}`);
    logger.info(`Seq no: ${currentSeqNo}, Primary term: ${currentPrimaryTerm}`);

    // Simulate another process updating the document
    await client.update({
      index: 'products',
      id: productId,
      body: {
        doc: {
          inventory: 95,
        },
      },
      refresh: 'wait_for',
    });
    logger.info('Another process updated inventory to 95');

    // Try to update with stale version (should fail)
    try {
      await client.update({
        index: 'products',
        id: productId,
        body: {
          doc: {
            price: 19.99,
          },
        },
        if_seq_no: currentSeqNo,
        if_primary_term: currentPrimaryTerm,
        refresh: 'wait_for',
      });
      logger.info('Update succeeded (unexpected)');
    } catch (error: any) {
      logger.info('Update failed with version conflict (expected)');
      logger.assert(error.meta?.statusCode === 409, 'Conflict detected with 409 status');
    }
    logger.production('if_seq_no and if_primary_term enable optimistic concurrency control\n');

    // Retry with current version
    logger.step('Step 5: Retry with correct version');
    const latestDoc = await client.get({
      index: 'products',
      id: productId,
    });
    const latestSeqNo = latestDoc._seq_no;
    const latestPrimaryTerm = latestDoc._primary_term;

    const retryResult = await client.update({
      index: 'products',
      id: productId,
      body: {
        doc: {
          price: 19.99,
          last_updated: new Date().toISOString(),
        },
      },
      if_seq_no: latestSeqNo,
      if_primary_term: latestPrimaryTerm,
      refresh: 'wait_for',
    });
    logger.command(`POST /products/_update/${productId}`, 'with correct if_seq_no/if_primary_term');
    logger.info(`Update succeeded with version ${retryResult._version}`);
    logger.assert(retryResult.result === 'updated', 'Retry with correct version succeeded');
    logger.production('Read-modify-write pattern: get version, modify, update with version check\n');

    // Script-based atomic update
    logger.step('Step 6: Atomic update with script');
    const scriptResult = await client.update({
      index: 'products',
      id: productId,
      body: {
        script: {
          source: 'ctx._source.inventory -= params.quantity',
          params: {
            quantity: 5,
          },
        },
      },
      refresh: 'wait_for',
    });
    logger.command(`POST /products/_update/${productId}`, JSON.stringify({
      script: {
        source: 'ctx._source.inventory -= params.quantity',
        params: { quantity: 5 },
      },
    }, null, 2));

    const finalDoc = await client.get({
      index: 'products',
      id: productId,
    });
    const finalSource = finalDoc._source as any;
    logger.info(`Final inventory: ${finalSource.inventory}`);
    logger.assert(finalSource.inventory === 90, 'Script-based update is atomic');
    logger.production('Scripts are atomic - no lost updates from concurrent operations\n');

    logger.success('\n✓ Document versioning and concurrency control demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'products', ignore_unavailable: true });
  },
};
