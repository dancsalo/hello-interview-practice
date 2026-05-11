import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const complexQueriesExample = {
  name: 'Complex Queries: Bool, Nested, Filtering',
  description: 'Bool queries, nested documents, and query vs filter context',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Complex Queries: Bool, Nested, Filtering');
    logger.info('Advanced product search with multi-faceted conditions\n');

    // Create index with nested reviews
    logger.step('Step 1: Create books index with nested reviews');
    await client.indices.create({
      index: 'books',
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            author: { type: 'keyword' },
            description: { type: 'text' },
            price: { type: 'float' },
            categories: { type: 'keyword' },
            in_stock: { type: 'boolean' },
            reviews: {
              type: 'nested',
              properties: {
                user: { type: 'keyword' },
                rating: { type: 'integer' },
                comment: { type: 'text' },
              },
            },
          },
        },
      },
    });
    logger.command('PUT /books', 'with nested reviews mapping');
    logger.success('Index created with nested reviews\n');

    // Index books with reviews
    logger.step('Step 2: Index books with nested reviews');
    await client.bulk({
      body: [
        { index: { _index: 'books' } },
        {
          title: 'Elasticsearch in Action',
          author: 'Matthew Lee Hinman',
          description: 'Comprehensive guide to Elasticsearch with practical examples',
          price: 49.99,
          categories: ['Technology', 'Search'],
          in_stock: true,
          reviews: [
            { user: 'alice', rating: 5, comment: 'Excellent book for learning Elasticsearch!' },
            { user: 'bob', rating: 4, comment: 'Very detailed but could use more examples' },
          ],
        },
        { index: { _index: 'books' } },
        {
          title: 'Designing Data-Intensive Applications',
          author: 'Martin Kleppmann',
          description: 'Deep dive into distributed systems and database architectures',
          price: 54.99,
          categories: ['Technology', 'Databases'],
          in_stock: true,
          reviews: [
            { user: 'charlie', rating: 5, comment: 'Must-read for system design interviews' },
            { user: 'diana', rating: 5, comment: 'Best book on distributed systems' },
          ],
        },
        { index: { _index: 'books' } },
        {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          description: 'Classic American novel about the Jazz Age',
          price: 12.99,
          categories: ['Fiction', 'Classic'],
          in_stock: false,
          reviews: [
            { user: 'eve', rating: 4, comment: 'Beautiful prose and storytelling' },
            { user: 'frank', rating: 3, comment: 'Good but overrated' },
          ],
        },
        { index: { _index: 'books' } },
        {
          title: 'Clean Code',
          author: 'Robert C. Martin',
          description: 'Agile software craftsmanship principles',
          price: 39.99,
          categories: ['Technology', 'Programming'],
          in_stock: true,
          reviews: [
            { user: 'grace', rating: 5, comment: 'Essential for any developer' },
            { user: 'henry', rating: 4, comment: 'Some parts are Java-specific' },
            { user: 'iris', rating: 5, comment: 'Changed how I write code' },
          ],
        },
        { index: { _index: 'books' } },
        {
          title: '1984',
          author: 'George Orwell',
          description: 'Dystopian novel about totalitarian surveillance',
          price: 14.99,
          categories: ['Fiction', 'Classic'],
          in_stock: true,
          reviews: [
            { user: 'jack', rating: 5, comment: 'Chillingly relevant today' },
            { user: 'kate', rating: 4, comment: 'Dark but important read' },
          ],
        },
      ],
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '5 books with nested reviews indexed');
    logger.success('Sample books indexed\n');

    // Bool query: must + filter + should
    logger.step('Step 3: Bool query combining multiple conditions');
    const boolResult = await client.search({
      index: 'books',
      body: {
        query: {
          bool: {
            must: [
              { match: { description: 'technology' } },
            ],
            filter: [
              { term: { in_stock: true } },
              { range: { price: { lte: 50 } } },
            ],
            should: [
              { term: { categories: 'Programming' } },
            ],
            minimum_should_match: 0,
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({
      query: {
        bool: {
          must: [{ match: { description: 'technology' } }],
          filter: [
            { term: { in_stock: true } },
            { range: { price: { lte: 50 } } },
          ],
          should: [{ term: { categories: 'Programming' } }],
        },
      },
    }, null, 2));
    logger.info(`Found ${boolResult.hits.hits.length} book(s):`);
    for (const hit of boolResult.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title} ($${source.price}, score: ${hit._score})`);
    }
    logger.assert(boolResult.hits.hits.length >= 1, 'Bool query executed successfully');
    logger.production('must affects scoring, filter does not (faster, cacheable)\n');

    // Bool query: must_not
    logger.step('Step 4: Exclude documents with must_not');
    const excludeResult = await client.search({
      index: 'books',
      body: {
        query: {
          bool: {
            must: [
              { match: { categories: 'Technology' } },
            ],
            must_not: [
              { term: { categories: 'Search' } },
            ],
            filter: [
              { term: { in_stock: true } },
            ],
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({
      query: {
        bool: {
          must: [{ match: { categories: 'Technology' } }],
          must_not: [{ term: { categories: 'Search' } }],
          filter: [{ term: { in_stock: true } }],
        },
      },
    }, null, 2));
    logger.info(`Found ${excludeResult.hits.hits.length} book(s):`);
    for (const hit of excludeResult.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title}`);
    }
    logger.assert(excludeResult.hits.hits.length >= 1, 'must_not exclusion works');
    logger.production('must_not runs in filter context (no scoring)\n');

    // Nested query
    logger.step('Step 5: Query nested review documents');
    const nestedResult = await client.search({
      index: 'books',
      body: {
        query: {
          nested: {
            path: 'reviews',
            query: {
              bool: {
                must: [
                  { range: { 'reviews.rating': { gte: 5 } } },
                  { match: { 'reviews.comment': 'essential' } },
                ],
              },
            },
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({
      query: {
        nested: {
          path: 'reviews',
          query: {
            bool: {
              must: [
                { range: { 'reviews.rating': { gte: 5 } } },
                { match: { 'reviews.comment': 'essential' } },
              ],
            },
          },
        },
      },
    }, null, 2));
    logger.info(`Found ${nestedResult.hits.hits.length} book(s) with 5-star reviews mentioning "essential":`);
    for (const hit of nestedResult.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title} by ${source.author}`);
    }
    logger.assert(nestedResult.hits.hits.length >= 1, 'Nested query executed');
    logger.production('Nested queries maintain relationship between fields in nested objects\n');

    // Complex multi-condition query
    logger.step('Step 6: Combine bool, nested, and filters');
    const complexResult = await client.search({
      index: 'books',
      body: {
        query: {
          bool: {
            must: [
              {
                nested: {
                  path: 'reviews',
                  query: {
                    range: { 'reviews.rating': { gte: 4 } },
                  },
                },
              },
            ],
            filter: [
              { term: { in_stock: true } },
              { range: { price: { gte: 30, lte: 60 } } },
            ],
            should: [
              { match: { description: 'system' } },
              { match: { description: 'code' } },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [
          { price: { order: 'asc' } },
        ],
      },
    });
    logger.command('GET /books/_search', 'complex bool + nested + filters query');
    logger.info(`Found ${complexResult.hits.hits.length} book(s):`);
    for (const hit of complexResult.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title} - $${source.price}`);
    }
    logger.assert(complexResult.hits.hits.length >= 1, 'Complex query executed successfully');
    logger.production('Combine queries to express complex business logic\n');

    logger.success('\n✓ Complex query patterns demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'books', ignore_unavailable: true });
  },
};
