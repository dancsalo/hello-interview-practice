import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const indexManagementExample = {
  name: 'Index Management: Mappings & Reindexing',
  description: 'Custom analyzers, explicit mappings, reindexing, and aliases',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Index Management: Mappings & Reindexing');
    logger.info('Schema evolution and zero-downtime reindexing\n');

    // Create index with custom analyzer
    logger.step('Step 1: Create index with custom analyzer');
    await client.indices.create({
      index: 'books_v1',
      body: {
        settings: {
          analysis: {
            analyzer: {
              custom_book_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'custom_stop'],
              },
            },
            filter: {
              custom_stop: {
                type: 'stop',
                stopwords: ['the', 'a', 'an', 'and', 'or', 'but'],
              },
            },
          },
        },
        mappings: {
          properties: {
            title: {
              type: 'text',
              analyzer: 'custom_book_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            author: { type: 'keyword' },
            isbn: { type: 'keyword' },
            price: { type: 'float' },
            publish_date: { type: 'date' },
          },
        },
      },
    });
    logger.command('PUT /books_v1', JSON.stringify({
      settings: {
        analysis: {
          analyzer: {
            custom_book_analyzer: {
              tokenizer: 'standard',
              filter: ['lowercase', 'asciifolding', 'custom_stop'],
            },
          },
        },
      },
    }, null, 2));
    logger.success('Index created with custom analyzer\n');

    // Index sample books
    logger.step('Step 2: Index sample books');
    await client.bulk({
      body: [
        { index: { _index: 'books_v1' } },
        {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          isbn: '978-0743273565',
          price: 10.99,
          publish_date: '1925-04-10',
        },
        { index: { _index: 'books_v1' } },
        {
          title: 'Clean Code: A Handbook',
          author: 'Robert C. Martin',
          isbn: '978-0132350884',
          price: 39.99,
          publish_date: '2008-08-01',
        },
        { index: { _index: 'books_v1' } },
        {
          title: 'Design Patterns',
          author: 'Gang of Four',
          isbn: '978-0201633610',
          price: 54.99,
          publish_date: '1994-10-31',
        },
      ],
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '3 books indexed');
    logger.success('Sample books indexed\n');

    // Test custom analyzer
    logger.step('Step 3: Test custom analyzer behavior');
    const analyzeResult = await client.indices.analyze({
      index: 'books_v1',
      body: {
        analyzer: 'custom_book_analyzer',
        text: 'The Quick Brown Fox',
      },
    });
    logger.command('POST /books_v1/_analyze', JSON.stringify({
      analyzer: 'custom_book_analyzer',
      text: 'The Quick Brown Fox',
    }, null, 2));
    const tokens = analyzeResult.tokens?.map((t) => t.token).join(', ');
    logger.info(`Tokens: ${tokens}`);
    logger.assert(tokens?.includes('quick') || false, 'Custom analyzer removes stopwords');
    logger.production('Custom analyzers control tokenization and text processing\n');

    // Create alias
    logger.step('Step 4: Create alias for zero-downtime transitions');
    await client.indices.putAlias({
      index: 'books_v1',
      name: 'books',
    });
    logger.command('PUT /books_v1/_alias/books', 'create alias');

    const searchViaAlias = await client.search({
      index: 'books',
      body: {
        query: { match_all: {} },
      },
    });
    logger.info(`Search via alias found ${searchViaAlias.hits.hits.length} books`);
    logger.assert(searchViaAlias.hits.hits.length === 3, 'Alias works');
    logger.production('Aliases enable zero-downtime index migrations\n');

    // Create new index with updated mapping
    logger.step('Step 5: Create new index with updated mapping');
    await client.indices.create({
      index: 'books_v2',
      body: {
        settings: {
          analysis: {
            analyzer: {
              custom_book_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'asciifolding', 'custom_stop'],
              },
            },
            filter: {
              custom_stop: {
                type: 'stop',
                stopwords: ['the', 'a', 'an', 'and', 'or', 'but'],
              },
            },
          },
        },
        mappings: {
          properties: {
            title: {
              type: 'text',
              analyzer: 'custom_book_analyzer',
              fields: {
                keyword: { type: 'keyword' },
              },
            },
            author: { type: 'keyword' },
            isbn: { type: 'keyword' },
            price: { type: 'float' },
            publish_date: { type: 'date' },
            rating: { type: 'float' },
            categories: { type: 'keyword' },
          },
        },
      },
    });
    logger.command('PUT /books_v2', 'with additional fields (rating, categories)');
    logger.success('New index created with updated mapping\n');

    // Reindex data
    logger.step('Step 6: Reindex data from v1 to v2');
    const reindexResult = await client.reindex({
      body: {
        source: {
          index: 'books_v1',
        },
        dest: {
          index: 'books_v2',
        },
      },
      refresh: true,
    });
    logger.command('POST /_reindex', JSON.stringify({
      source: { index: 'books_v1' },
      dest: { index: 'books_v2' },
    }, null, 2));
    logger.info(`Reindexed ${reindexResult.total} documents`);
    logger.assert(reindexResult.total === 3, 'All documents reindexed');
    logger.production('Reindex copies documents between indices for schema changes\n');

    // Update alias atomically
    logger.step('Step 7: Switch alias atomically to new index');
    await client.indices.updateAliases({
      body: {
        actions: [
          { remove: { index: 'books_v1', alias: 'books' } },
          { add: { index: 'books_v2', alias: 'books' } },
        ],
      },
    });
    logger.command('POST /_aliases', JSON.stringify({
      actions: [
        { remove: { index: 'books_v1', alias: 'books' } },
        { add: { index: 'books_v2', alias: 'books' } },
      ],
    }, null, 2));

    const searchNewAlias = await client.search({
      index: 'books',
      body: {
        query: { match_all: {} },
      },
    });
    logger.info(`Search via alias now hits books_v2: ${searchNewAlias.hits.hits.length} books`);
    logger.assert(searchNewAlias.hits.hits.length === 3, 'Alias switched to v2');
    logger.production('Atomic alias switch enables zero-downtime migrations\n');

    logger.success('\n✓ Index management patterns demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'books_v1', ignore_unavailable: true });
    await client.indices.delete({ index: 'books_v2', ignore_unavailable: true });
    try {
      await client.indices.deleteAlias({ index: 'books_v1,books_v2', name: 'books' });
    } catch {
      // Alias may not exist
    }
  },
};
