import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const basicsExample = {
  name: 'Basics: Core Concepts',
  description: 'Documents, indices, mappings, and CRUD operations',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Basics: Core Concepts');
    logger.info('E-commerce book catalog management\n');

    // Create index
    logger.step('Step 1: Create index with explicit mapping');
    await client.indices.create({
      index: 'books',
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            author: { type: 'keyword' },
            price: { type: 'float' },
            publish_date: { type: 'date' },
          },
        },
      },
    });
    logger.command('PUT /books', JSON.stringify({
      mappings: {
        properties: {
          title: { type: 'text' },
          author: { type: 'keyword' },
          price: { type: 'float' },
          publish_date: { type: 'date' },
        },
      },
    }, null, 2));
    logger.success('Index created with mapping\n');

    // Add document
    logger.step('Step 2: Index a document');
    const indexResult = await client.index({
      index: 'books',
      body: {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        price: 10.99,
        publish_date: '1925-04-10',
      },
      refresh: 'wait_for',
    });
    logger.command('POST /books/_doc', JSON.stringify({
      title: 'The Great Gatsby',
      author: 'F. Scott Fitzgerald',
      price: 10.99,
      publish_date: '1925-04-10',
    }, null, 2));
    logger.info(`Document ID: ${indexResult._id}`);
    logger.assert(indexResult.result === 'created', 'Document indexed successfully');
    logger.production('refresh: wait_for ensures document is immediately searchable\n');

    // Retrieve document
    logger.step('Step 3: Retrieve document by ID');
    const getResult = await client.get({
      index: 'books',
      id: indexResult._id,
    });
    logger.command(`GET /books/_doc/${indexResult._id}`, JSON.stringify(getResult._source, null, 2));
    logger.assert(getResult.found === true, 'Document retrieved successfully\n');

    // Update document
    logger.step('Step 4: Update document');
    const updateResult = await client.update({
      index: 'books',
      id: indexResult._id,
      body: {
        doc: {
          price: 12.99,
        },
      },
      refresh: 'wait_for',
    });
    logger.command(`POST /books/_update/${indexResult._id}`, JSON.stringify({ doc: { price: 12.99 } }, null, 2));
    logger.info(`Version: ${updateResult._version}`);
    logger.assert(updateResult.result === 'updated', 'Document updated successfully');
    logger.production('Partial updates modify only specified fields\n');

    // Search all documents
    logger.step('Step 5: Search all documents');
    const searchResult = await client.search({
      index: 'books',
      body: {
        query: {
          match_all: {},
        },
      },
    });
    logger.command('GET /books/_search', JSON.stringify({ query: { match_all: {} } }, null, 2));
    logger.info(`Found ${searchResult.hits.hits.length} document(s)`);
    logger.assert(searchResult.hits.hits.length === 1, 'Search returned documents\n');

    // Delete document
    logger.step('Step 6: Delete document');
    const deleteResult = await client.delete({
      index: 'books',
      id: indexResult._id,
    });
    logger.command(`DELETE /books/_doc/${indexResult._id}`);
    logger.assert(deleteResult.result === 'deleted', 'Document deleted successfully');
    logger.production('Deletes are soft until segment merge\n');

    logger.success('\n✓ All basic CRUD operations demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'books', ignore_unavailable: true });
  },
};
