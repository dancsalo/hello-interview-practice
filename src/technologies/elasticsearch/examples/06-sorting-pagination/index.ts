import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const sortingPaginationExample = {
  name: 'Sorting & Pagination: Result Navigation',
  description: 'Field sorting, multi-field sort, from/size, search_after, and PIT',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Sorting & Pagination: Result Navigation');
    logger.info('Book catalog browsing with efficient pagination\n');

    // Create index
    logger.step('Step 1: Create books index');
    await client.indices.create({
      index: 'books',
      body: {
        mappings: {
          properties: {
            title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
            author: { type: 'keyword' },
            price: { type: 'float' },
            publish_date: { type: 'date' },
            rating: { type: 'float' },
            sales: { type: 'integer' },
          },
        },
      },
    });
    logger.command('PUT /books', 'with sortable fields');
    logger.success('Index created\n');

    // Index sample books
    logger.step('Step 2: Index sample books');
    await client.bulk({
      body: [
        { index: { _index: 'books' } },
        {
          title: 'Elasticsearch Basics',
          author: 'Jane Doe',
          price: 29.99,
          publish_date: '2023-01-15',
          rating: 4.2,
          sales: 1500,
        },
        { index: { _index: 'books' } },
        {
          title: 'Advanced Search Techniques',
          author: 'John Smith',
          price: 49.99,
          publish_date: '2024-03-20',
          rating: 4.8,
          sales: 3200,
        },
        { index: { _index: 'books' } },
        {
          title: 'Data Structures 101',
          author: 'Alice Johnson',
          price: 39.99,
          publish_date: '2022-06-10',
          rating: 4.5,
          sales: 2100,
        },
        { index: { _index: 'books' } },
        {
          title: 'System Design Patterns',
          author: 'Bob Wilson',
          price: 54.99,
          publish_date: '2024-01-05',
          rating: 4.9,
          sales: 4500,
        },
        { index: { _index: 'books' } },
        {
          title: 'Database Fundamentals',
          author: 'Carol White',
          price: 34.99,
          publish_date: '2023-08-12',
          rating: 4.3,
          sales: 1800,
        },
        { index: { _index: 'books' } },
        {
          title: 'Cloud Architecture',
          author: 'David Brown',
          price: 59.99,
          publish_date: '2024-05-01',
          rating: 4.7,
          sales: 2900,
        },
        { index: { _index: 'books' } },
        {
          title: 'Microservices Guide',
          author: 'Eve Davis',
          price: 44.99,
          publish_date: '2023-11-20',
          rating: 4.6,
          sales: 2500,
        },
        { index: { _index: 'books' } },
        {
          title: 'API Design Best Practices',
          author: 'Frank Miller',
          price: 42.99,
          publish_date: '2024-02-14',
          rating: 4.4,
          sales: 2200,
        },
        { index: { _index: 'books' } },
        {
          title: 'Performance Optimization',
          author: 'Grace Lee',
          price: 47.99,
          publish_date: '2023-05-30',
          rating: 4.5,
          sales: 2700,
        },
        { index: { _index: 'books' } },
        {
          title: 'Security Essentials',
          author: 'Henry Clark',
          price: 52.99,
          publish_date: '2024-04-10',
          rating: 4.8,
          sales: 3100,
        },
      ],
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '10 books indexed');
    logger.success('Sample books indexed\n');

    // Single-field sort
    logger.step('Step 3: Sort by price (single field)');
    const priceResult = await client.search({
      index: 'books',
      body: {
        query: { match_all: {} },
        sort: [{ price: { order: 'asc' } }],
        size: 3,
      },
    });
    logger.command('GET /books/_search', JSON.stringify({
      query: { match_all: {} },
      sort: [{ price: { order: 'asc' } }],
      size: 3,
    }, null, 2));
    logger.info('Top 3 cheapest books:');
    for (const hit of priceResult.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title}: $${source.price}`);
    }
    logger.assert(priceResult.hits.hits.length === 3, 'Sort by price works\n');

    // Multi-field sort
    logger.step('Step 4: Multi-field sort (rating DESC, price ASC)');
    const multiResult = await client.search({
      index: 'books',
      body: {
        query: { match_all: {} },
        sort: [
          { rating: { order: 'desc' } },
          { price: { order: 'asc' } },
        ],
        size: 3,
      },
    });
    logger.command('GET /books/_search', JSON.stringify({
      sort: [
        { rating: { order: 'desc' } },
        { price: { order: 'asc' } },
      ],
      size: 3,
    }, null, 2));
    logger.info('Top 3 by rating (then price):');
    for (const hit of multiResult.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title}: ${source.rating} stars, $${source.price}`);
    }
    logger.assert(multiResult.hits.hits.length === 3, 'Multi-field sort works');
    logger.production('Multi-field sort breaks ties with secondary sort field\n');

    // from/size pagination
    logger.step('Step 5: Basic pagination with from/size');
    const page1 = await client.search({
      index: 'books',
      body: {
        query: { match_all: {} },
        sort: [{ publish_date: { order: 'desc' } }],
        from: 0,
        size: 3,
      },
    });
    const page2 = await client.search({
      index: 'books',
      body: {
        query: { match_all: {} },
        sort: [{ publish_date: { order: 'desc' } }],
        from: 3,
        size: 3,
      },
    });
    logger.command('GET /books/_search', 'from: 0, size: 3 (page 1)');
    logger.info('Page 1:');
    for (const hit of page1.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title} (${source.publish_date})`);
    }
    logger.info('\nPage 2:');
    for (const hit of page2.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title} (${source.publish_date})`);
    }
    logger.assert(page1.hits.hits.length === 3 && page2.hits.hits.length === 3, 'Basic pagination works');
    logger.production('from/size works but expensive for deep pagination (>10,000)\n');

    // search_after for efficient pagination
    logger.step('Step 6: Efficient pagination with search_after');
    const firstPage = await client.search({
      index: 'books',
      body: {
        query: { match_all: {} },
        sort: [
          { sales: { order: 'desc' } },
          { _id: { order: 'asc' } },
        ],
        size: 3,
      },
    });
    logger.command('GET /books/_search', JSON.stringify({
      sort: [
        { sales: { order: 'desc' } },
        { _id: { order: 'asc' } },
      ],
      size: 3,
    }, null, 2));
    logger.info('First page (top sellers):');
    for (const hit of firstPage.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title}: ${source.sales} sales`);
    }

    const lastHit = firstPage.hits.hits[firstPage.hits.hits.length - 1];
    const secondPage = await client.search({
      index: 'books',
      body: {
        query: { match_all: {} },
        sort: [
          { sales: { order: 'desc' } },
          { _id: { order: 'asc' } },
        ],
        search_after: lastHit.sort,
        size: 3,
      },
    });
    logger.command('GET /books/_search', 'search_after: [last_sort_values]');
    logger.info('\nSecond page:');
    for (const hit of secondPage.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title}: ${source.sales} sales`);
    }
    logger.assert(secondPage.hits.hits.length === 3, 'search_after pagination works');
    logger.production('search_after is stateless and efficient for deep pagination\n');

    // Point in Time (PIT) for consistent pagination
    logger.step('Step 7: Point-in-Time API for consistency');
    const pitResponse = await client.openPointInTime({
      index: 'books',
      keep_alive: '1m',
    });
    const pitId = pitResponse.id;

    const pitPage1 = await client.search({
      body: {
        query: { match_all: {} },
        sort: [{ title: { order: 'asc' } }],
        size: 3,
        pit: {
          id: pitId,
          keep_alive: '1m',
        },
      },
    });
    logger.command('POST /_search', 'with PIT for consistency');
    logger.info('Page 1 with PIT:');
    for (const hit of pitPage1.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title}`);
    }

    await client.closePointInTime({ id: pitId });
    logger.assert(pitPage1.hits.hits.length === 3, 'PIT pagination works');
    logger.production('PIT ensures consistent view even if index changes during pagination\n');

    logger.success('\n✓ Sorting and pagination patterns demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'books', ignore_unavailable: true });
  },
};
