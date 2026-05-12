import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const fullTextSearchExample = {
  name: 'Full-Text Search: Text Analysis',
  description: 'Match queries, phrase matching, and fuzzy search',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Example: Full-Text Search');
    logger.info('Book catalog search with relevance scoring\n');

    // Create index
    logger.step('Step 1: Create index with text fields');
    await client.indices.create({
      index: 'books',
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            author: { type: 'keyword' },
            description: { type: 'text' },
            price: { type: 'float' },
          },
        },
      },
    });
    logger.command('PUT /books');
    logger.success('Index created with text analysis fields\n');

    // Add sample documents
    logger.step('Step 2: Index sample books');
    await client.bulk({
      body: [
        { index: { _index: 'books' } },
        {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          description: 'A novel about the American Dream in the Jazz Age',
          price: 10.99,
        },
        { index: { _index: 'books' } },
        {
          title: 'Great Expectations',
          author: 'Charles Dickens',
          description: 'A coming-of-age story set in Victorian England',
          price: 12.99,
        },
        { index: { _index: 'books' } },
        {
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          description: 'A powerful novel about racial injustice in the American South',
          price: 11.99,
        },
        { index: { _index: 'books' } },
        {
          title: '1984',
          author: 'George Orwell',
          description: 'A dystopian novel about totalitarianism',
          price: 13.99,
        },
      ],
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '4 documents indexed');
    logger.success('Sample books indexed\n');

    // Match query
    logger.step('Step 3: Match query - find books with "great" in title');
    const matchResult = await client.search({
      index: 'books',
      body: {
        query: {
          match: {
            title: 'great',
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { match: { title: 'great' } } }, null, 2));
    logger.info(`Found ${matchResult.hits.hits.length} book(s)`);
    for (const hit of matchResult.hits.hits) {
      logger.info(`  - ${(hit._source as any).title} (score: ${hit._score})`);
    }
    logger.assert(matchResult.hits.hits.length === 2, 'Found books with "great"');
    logger.production('match query tokenizes input and finds any matching token\n');

    // Match phrase query
    logger.step('Step 4: Match phrase - exact phrase "american dream"');
    const phraseResult = await client.search({
      index: 'books',
      body: {
        query: {
          match_phrase: {
            description: 'american dream',
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { match_phrase: { description: 'american dream' } } }, null, 2));
    logger.info(`Found ${phraseResult.hits.hits.length} book(s)`);
    for (const hit of phraseResult.hits.hits) {
      logger.info(`  - ${(hit._source as any).title}`);
    }
    logger.assert(phraseResult.hits.hits.length === 1, 'Found exact phrase match');
    logger.production('match_phrase requires tokens to appear in order\n');

    // Fuzzy query
    logger.step('Step 5: Fuzzy search - handle typos');
    const fuzzyResult = await client.search({
      index: 'books',
      body: {
        query: {
          fuzzy: {
            title: {
              value: 'expctations',
              fuzziness: 'AUTO',
            },
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { fuzzy: { title: { value: 'expctations', fuzziness: 'AUTO' } } } }, null, 2));
    logger.info(`Found ${fuzzyResult.hits.hits.length} book(s) despite typo`);
    for (const hit of fuzzyResult.hits.hits) {
      logger.info(`  - ${(hit._source as any).title} (score: ${hit._score})`);
    }
    logger.assert(fuzzyResult.hits.hits.length >= 1, 'Fuzzy search handled typo');
    logger.production('fuzziness: AUTO allows 1-2 character edits based on term length\n');

    // Multi-match query
    logger.step('Step 6: Multi-match - search across multiple fields');
    const multiResult = await client.search({
      index: 'books',
      body: {
        query: {
          multi_match: {
            query: 'american',
            fields: ['title', 'description'],
          },
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { multi_match: { query: 'american', fields: ['title', 'description'] } } }, null, 2));
    logger.info(`Found ${multiResult.hits.hits.length} book(s) with "american"`);
    for (const hit of multiResult.hits.hits) {
      logger.info(`  - ${(hit._source as any).title} (score: ${hit._score})`);
    }
    logger.assert(multiResult.hits.hits.length >= 2, 'Search across multiple fields');
    logger.production('multi_match searches multiple fields with combined scoring\n');

    logger.success('\n✓ Full-text search patterns demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'books', ignore_unavailable: true });
  },
};
