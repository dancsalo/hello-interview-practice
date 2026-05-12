import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const productionPatternsExample = {
  name: 'Production Patterns: CDC, Sync, Performance',
  description: 'Change data capture, bulk indexing, and production best practices',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Production Patterns: CDC, Sync, Performance');
    logger.info('Real-world patterns for keeping Elasticsearch in sync with primary database\n');

    // Create products index
    logger.step('Step 1: Create products index with optimized settings');
    await client.indices.create({
      index: 'products',
      body: {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          refresh_interval: '30s',
          index: {
            max_result_window: 10000,
          },
        },
        mappings: {
          properties: {
            product_id: { type: 'keyword' },
            name: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            description: { type: 'text' },
            category: { type: 'keyword' },
            price: { type: 'float' },
            stock: { type: 'integer' },
            last_updated: { type: 'date' },
            source_db_timestamp: { type: 'date' },
          },
        },
      },
    });
    logger.command('PUT /products', JSON.stringify({
      settings: {
        refresh_interval: '30s',
      },
    }, null, 2));
    logger.success('Index created with production settings');
    logger.production('refresh_interval: 30s reduces indexing load (default 1s)\n');

    // Simulate bulk indexing from CDC
    logger.step('Step 2: Simulate CDC bulk indexing');
    const bulkOperations = [];
    for (let i = 1; i <= 1000; i++) {
      bulkOperations.push({ index: { _index: 'products', _id: `PROD-${i}` } });
      bulkOperations.push({
        product_id: `PROD-${i}`,
        name: `Product ${i}`,
        description: `Description for product ${i}`,
        category: ['Electronics', 'Books', 'Clothing', 'Home'][i % 4],
        price: Math.round((10 + Math.random() * 90) * 100) / 100,
        stock: Math.floor(Math.random() * 1000),
        last_updated: new Date().toISOString(),
        source_db_timestamp: new Date().toISOString(),
      });
    }

    const startTime = Date.now();
    const bulkResult = await client.bulk({
      body: bulkOperations,
      refresh: false,
    });
    const indexTime = Date.now() - startTime;

    logger.command('POST /_bulk', '1000 products indexed');
    logger.info(`Bulk indexing took ${indexTime}ms`);
    logger.info(`Errors: ${bulkResult.errors ? 'Yes' : 'No'}`);
    logger.assert(!bulkResult.errors, 'Bulk indexing succeeded');
    logger.production('Bulk API batches 500-1000 docs for optimal throughput\n');

    // Explicit refresh
    logger.step('Step 3: Explicit refresh for immediate search');
    await client.indices.refresh({ index: 'products' });
    logger.command('POST /products/_refresh', 'force refresh');

    const countResult = await client.count({ index: 'products' });
    logger.info(`Products indexed: ${countResult.count}`);
    logger.assert(countResult.count === 1000, 'All products searchable');
    logger.production('Use refresh: wait_for or manual refresh when immediate visibility needed\n');

    // Simulate CDC updates
    logger.step('Step 4: Simulate CDC updates (price changes)');
    const updates = [];
    for (let i = 1; i <= 50; i++) {
      updates.push({ update: { _index: 'products', _id: `PROD-${i}` } });
      updates.push({
        doc: {
          price: Math.round((10 + Math.random() * 90) * 100) / 100,
          last_updated: new Date().toISOString(),
        },
      });
    }

    const updateResult = await client.bulk({
      body: updates,
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '50 price updates from CDC');
    logger.info(`Updates processed: ${!updateResult.errors ? '50' : 'with errors'}`);
    logger.assert(!updateResult.errors, 'CDC updates applied');
    logger.production('CDC streams database changes to Elasticsearch in near real-time\n');

    // Demonstrate monitoring
    logger.step('Step 5: Check index stats and health');
    const stats = await client.indices.stats({ index: 'products' });
    const indexStats = stats.indices?.products;

    logger.command('GET /products/_stats', 'index statistics');
    logger.info(`Total docs: ${indexStats?.total?.docs?.count || 0}`);
    logger.info(`Deleted docs: ${indexStats?.total?.docs?.deleted || 0}`);
    logger.info(`Store size: ${Math.round((indexStats?.total?.store?.size_in_bytes || 0) / 1024)} KB`);
    logger.info(`Indexing operations: ${indexStats?.total?.indexing?.index_total || 0}`);
    logger.info(`Search operations: ${indexStats?.total?.search?.query_total || 0}`);
    logger.assert((indexStats?.total?.docs?.count || 0) === 1000, 'Stats available');
    logger.production('Monitor index stats for capacity planning and performance tuning\n');

    // Demonstrate search performance
    logger.step('Step 6: Test search performance with filters');
    const searchStart = Date.now();
    const searchResult = await client.search({
      index: 'products',
      body: {
        query: {
          bool: {
            must: [
              { match: { description: 'product' } },
            ],
            filter: [
              { term: { category: 'Electronics' } },
              { range: { price: { gte: 20, lte: 80 } } },
              { range: { stock: { gte: 100 } } },
            ],
          },
        },
        size: 20,
        track_total_hits: true,
      },
    });
    const searchTime = Date.now() - searchStart;

    logger.command('GET /products/_search', 'filtered search query');
    const searchTotal = typeof searchResult.hits.total === 'number' ? searchResult.hits.total : searchResult.hits.total?.value || 0;
    logger.info(`Found ${searchTotal} matching products`);
    logger.info(`Search took ${searchTime}ms`);
    logger.info(`Elasticsearch took ${searchResult.took}ms`);
    logger.assert(searchTime < 1000, 'Search performance acceptable');
    logger.production('Filter context is cached and faster than query context\n');

    // Demonstrate eventual consistency
    logger.step('Step 7: Demonstrate eventual consistency pattern');
    const newProduct = {
      product_id: 'PROD-NEW',
      name: 'New Product',
      description: 'Just added from database',
      category: 'Electronics',
      price: 99.99,
      stock: 50,
      last_updated: new Date().toISOString(),
      source_db_timestamp: new Date().toISOString(),
    };

    await client.index({
      index: 'products',
      id: 'PROD-NEW',
      body: newProduct,
      refresh: false,
    });
    logger.command('POST /products/_doc/PROD-NEW', 'async indexing (refresh: false)');
    logger.info('Product indexed asynchronously');

    const immediateSearch = await client.search({
      index: 'products',
      body: {
        query: { term: { product_id: 'PROD-NEW' } },
      },
    });
    logger.info(`Immediate search found: ${immediateSearch.hits.hits.length} results`);

    await client.indices.refresh({ index: 'products' });
    const afterRefresh = await client.search({
      index: 'products',
      body: {
        query: { term: { product_id: 'PROD-NEW' } },
      },
    });
    logger.info(`After refresh found: ${afterRefresh.hits.hits.length} results`);
    logger.assert(afterRefresh.hits.hits.length === 1, 'Eventually consistent');
    logger.production('Accept eventual consistency for better write performance, use refresh selectively\n');

    logger.success('\n✓ Production patterns demonstrated!');
    logger.info('\nKey Takeaways:');
    logger.info('1. Elasticsearch is NOT the source of truth - use CDC to sync from database');
    logger.info('2. Bulk API for high throughput (500-1000 docs per batch)');
    logger.info('3. Tune refresh_interval based on latency requirements (30s for write-heavy)');
    logger.info('4. Monitor index stats for capacity planning');
    logger.info('5. Use filter context for better caching and performance');
    logger.info('6. Accept eventual consistency for scalability');
    logger.info('7. Test disaster recovery: can you rebuild from source of truth?');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'products', ignore_unavailable: true });
  },
};
