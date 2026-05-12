import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const facetedSearchExample = {
  name: 'Faceted Search: Multi-Dimensional Filtering',
  description: 'E-commerce-style faceted navigation with aggregations',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Faceted Search: Multi-Dimensional Filtering');
    logger.info('E-commerce book search with category, price, and rating facets\n');

    // Create index
    logger.step('Step 1: Create books index');
    await client.indices.create({
      index: 'books',
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            author: { type: 'keyword' },
            category: { type: 'keyword' },
            price: { type: 'float' },
            rating: { type: 'float' },
            publisher: { type: 'keyword' },
            in_stock: { type: 'boolean' },
          },
        },
      },
    });
    logger.command('PUT /books', 'with facetable fields');
    logger.success('Index created\n');

    // Index sample books
    logger.step('Step 2: Index sample books');
    await client.bulk({
      body: [
        { index: { _index: 'books' } },
        { title: 'Clean Code', author: 'Robert Martin', category: 'Programming', price: 39.99, rating: 4.7, publisher: 'Prentice Hall', in_stock: true },
        { index: { _index: 'books' } },
        { title: 'Design Patterns', author: 'Gang of Four', category: 'Programming', price: 54.99, rating: 4.8, publisher: 'Addison-Wesley', in_stock: true },
        { index: { _index: 'books' } },
        { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', category: 'Fiction', price: 12.99, rating: 4.4, publisher: 'Scribner', in_stock: true },
        { index: { _index: 'books' } },
        { title: '1984', author: 'George Orwell', category: 'Fiction', price: 14.99, rating: 4.6, publisher: 'Signet', in_stock: false },
        { index: { _index: 'books' } },
        { title: 'Database Systems', author: 'Ramez Elmasri', category: 'Computer Science', price: 89.99, rating: 4.3, publisher: 'Pearson', in_stock: true },
        { index: { _index: 'books' } },
        { title: 'Algorithms', author: 'Robert Sedgewick', category: 'Computer Science', price: 79.99, rating: 4.5, publisher: 'Addison-Wesley', in_stock: true },
        { index: { _index: 'books' } },
        { title: 'Sapiens', author: 'Yuval Noah Harari', category: 'History', price: 18.99, rating: 4.6, publisher: 'Harper', in_stock: true },
        { index: { _index: 'books' } },
        { title: 'Educated', author: 'Tara Westover', category: 'Biography', price: 16.99, rating: 4.7, publisher: 'Random House', in_stock: true },
        { index: { _index: 'books' } },
        { title: 'Thinking Fast and Slow', author: 'Daniel Kahneman', category: 'Psychology', price: 19.99, rating: 4.5, publisher: 'Farrar', in_stock: true },
        { index: { _index: 'books' } },
        { title: 'The Pragmatic Programmer', author: 'Andrew Hunt', category: 'Programming', price: 44.99, rating: 4.8, publisher: 'Addison-Wesley', in_stock: true },
        { index: { _index: 'books' } },
        { title: 'Introduction to Machine Learning', author: 'Ethem Alpaydin', category: 'Computer Science', price: 99.99, rating: 4.2, publisher: 'MIT Press', in_stock: false },
        { index: { _index: 'books' } },
        { title: 'Pride and Prejudice', author: 'Jane Austen', category: 'Fiction', price: 9.99, rating: 4.5, publisher: 'Penguin', in_stock: true },
      ],
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '12 books indexed');
    logger.success('Sample books indexed\n');

    // Build initial facets without filters
    logger.step('Step 3: Build facets for all books');
    const facetsResult = await client.search({
      index: 'books',
      body: {
        size: 0,
        aggs: {
          categories: {
            terms: { field: 'category', size: 10 },
          },
          price_ranges: {
            range: {
              field: 'price',
              ranges: [
                { key: '$0-$20', to: 20 },
                { key: '$20-$50', from: 20, to: 50 },
                { key: '$50-$100', from: 50, to: 100 },
                { key: '$100+', from: 100 },
              ],
            },
          },
          rating_ranges: {
            range: {
              field: 'rating',
              ranges: [
                { key: '4.5+ stars', from: 4.5 },
                { key: '4.0-4.5 stars', from: 4.0, to: 4.5 },
                { key: 'Below 4.0', to: 4.0 },
              ],
            },
          },
          publishers: {
            terms: { field: 'publisher', size: 10 },
          },
        },
      },
    });
    logger.command('GET /books/_search', 'build all facets');
    const aggs = facetsResult.aggregations as any;

    logger.info('Category Facets:');
    for (const bucket of aggs.categories.buckets) {
      logger.info(`  - ${bucket.key}: ${bucket.doc_count} books`);
    }

    logger.info('\nPrice Range Facets:');
    for (const bucket of aggs.price_ranges.buckets) {
      logger.info(`  - ${bucket.key}: ${bucket.doc_count} books`);
    }

    logger.info('\nRating Facets:');
    for (const bucket of aggs.rating_ranges.buckets) {
      logger.info(`  - ${bucket.key}: ${bucket.doc_count} books`);
    }

    logger.assert(aggs.categories.buckets.length >= 3, 'Facets generated');
    logger.production('Facets show distribution of products across dimensions\n');

    // Apply filter and maintain facets
    logger.step('Step 4: Apply category filter while maintaining facet counts');
    const filteredResult = await client.search({
      index: 'books',
      body: {
        query: {
          bool: {
            filter: [
              { term: { category: 'Programming' } },
            ],
          },
        },
        aggs: {
          categories: {
            terms: { field: 'category', size: 10 },
          },
          price_ranges: {
            range: {
              field: 'price',
              ranges: [
                { key: '$0-$20', to: 20 },
                { key: '$20-$50', from: 20, to: 50 },
                { key: '$50-$100', from: 50, to: 100 },
                { key: '$100+', from: 100 },
              ],
            },
          },
          rating_ranges: {
            range: {
              field: 'rating',
              ranges: [
                { key: '4.5+ stars', from: 4.5 },
                { key: '4.0-4.5 stars', from: 4.0, to: 4.5 },
                { key: 'Below 4.0', to: 4.0 },
              ],
            },
          },
        },
        size: 10,
      },
    });
    logger.command('GET /books/_search', 'filter by Programming category');
    const filteredTotal = typeof filteredResult.hits.total === 'number' ? filteredResult.hits.total : filteredResult.hits.total?.value || 0;
    logger.info(`Found ${filteredTotal} Programming books:`);
    for (const hit of filteredResult.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title} - $${source.price} (${source.rating} stars)`);
    }

    const filteredAggs = filteredResult.aggregations as any;
    logger.info('\nPrice facets for Programming books:');
    for (const bucket of filteredAggs.price_ranges.buckets) {
      logger.info(`  - ${bucket.key}: ${bucket.doc_count} books`);
    }
    logger.assert(filteredTotal >= 3, 'Filter applied');
    logger.production('Aggregations run on filtered results to show relevant facets\n');

    // Multi-faceted filtering
    logger.step('Step 5: Apply multiple filters (category + price + rating)');
    const multiFilterResult = await client.search({
      index: 'books',
      body: {
        query: {
          bool: {
            filter: [
              { terms: { category: ['Programming', 'Computer Science'] } },
              { range: { price: { lte: 80 } } },
              { range: { rating: { gte: 4.5 } } },
              { term: { in_stock: true } },
            ],
          },
        },
        aggs: {
          categories: {
            terms: { field: 'category', size: 10 },
          },
          avg_price: {
            avg: { field: 'price' },
          },
          avg_rating: {
            avg: { field: 'rating' },
          },
        },
        sort: [
          { rating: { order: 'desc' } },
          { price: { order: 'asc' } },
        ],
        size: 10,
      },
    });
    logger.command('GET /books/_search', 'multi-faceted filter (category + price + rating + in_stock)');
    const multiTotal = typeof multiFilterResult.hits.total === 'number' ? multiFilterResult.hits.total : multiFilterResult.hits.total?.value || 0;
    logger.info(`Found ${multiTotal} books matching all criteria:`);
    for (const hit of multiFilterResult.hits.hits) {
      const source = hit._source as any;
      logger.info(`  - ${source.title} - ${source.category} - $${source.price} (${source.rating} stars)`);
    }

    const multiAggs = multiFilterResult.aggregations as any;
    logger.info(`\nAverage price: $${multiAggs.avg_price.value.toFixed(2)}`);
    logger.info(`Average rating: ${multiAggs.avg_rating.value.toFixed(2)} stars`);
    logger.assert(multiTotal >= 1, 'Multi-faceted filtering works');
    logger.production('Combine multiple filters for precise product discovery\n');

    logger.success('\n✓ Faceted search patterns demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'books', ignore_unavailable: true });
  },
};
