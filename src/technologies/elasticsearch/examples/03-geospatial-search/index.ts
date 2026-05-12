import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const geospatialSearchExample = {
  name: 'Geospatial Search: Location Queries',
  description: 'geo_point fields and proximity search for location-based services',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Example: Geospatial Search');
    logger.info('Restaurant discovery (Yelp-style proximity search)\n');

    // Create index with geo_point
    logger.step('Step 1: Create index with geo_point field');
    await client.indices.create({
      index: 'restaurants',
      body: {
        mappings: {
          properties: {
            name: { type: 'text' },
            cuisine: { type: 'keyword' },
            location: { type: 'geo_point' },
            rating: { type: 'float' },
            price_range: { type: 'keyword' },
          },
        },
      },
    });
    logger.command('PUT /restaurants');
    logger.success('Index created with geo_point field\n');

    // Add sample restaurants (NYC locations)
    logger.step('Step 2: Index restaurants with locations');
    await client.bulk({
      body: [
        { index: { _index: 'restaurants' } },
        {
          name: "Joe's Pizza",
          cuisine: 'Italian',
          location: { lat: 40.7300, lon: -73.9950 },
          rating: 4.5,
          price_range: '$',
        },
        { index: { _index: 'restaurants' } },
        {
          name: 'Katz\'s Delicatessen',
          cuisine: 'Deli',
          location: { lat: 40.7223, lon: -73.9873 },
          rating: 4.6,
          price_range: '$$',
        },
        { index: { _index: 'restaurants' } },
        {
          name: 'Le Bernardin',
          cuisine: 'French',
          location: { lat: 40.7614, lon: -73.9776 },
          rating: 4.8,
          price_range: '$$$$',
        },
        { index: { _index: 'restaurants' } },
        {
          name: 'Shake Shack',
          cuisine: 'Burgers',
          location: { lat: 40.7414, lon: -73.9883 },
          rating: 4.3,
          price_range: '$$',
        },
        { index: { _index: 'restaurants' } },
        {
          name: 'Xi\'an Famous Foods',
          cuisine: 'Chinese',
          location: { lat: 40.7228, lon: -73.9969 },
          rating: 4.4,
          price_range: '$',
        },
      ],
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '5 restaurants indexed');
    logger.success('Sample restaurants indexed\n');

    // Find restaurants within 1km of a location
    logger.step('Step 3: Find restaurants within 1km radius');
    const userLocation = { lat: 40.7300, lon: -73.9900 };
    const radiusResult = await client.search({
      index: 'restaurants',
      body: {
        query: {
          geo_distance: {
            distance: '1km',
            location: userLocation,
          },
        },
        sort: [
          {
            _geo_distance: {
              location: userLocation,
              order: 'asc',
              unit: 'km',
            },
          },
        ],
      },
    });
    logger.command('GET /restaurants/_search', JSON.stringify({
      query: {
        geo_distance: {
          distance: '1km',
          location: userLocation,
        },
      },
    }, null, 2));
    logger.info(`Found ${radiusResult.hits.hits.length} restaurant(s) within 1km`);
    for (const hit of radiusResult.hits.hits) {
      const source = hit._source as any;
      const distance = hit.sort?.[0] as number;
      logger.info(`  - ${source.name} (${distance.toFixed(2)} km)`);
    }
    logger.assert(radiusResult.hits.hits.length >= 2, 'Found nearby restaurants');
    logger.production('geo_distance uses BKD trees for efficient spatial queries\n');

    // Find restaurants within 2km with cuisine filter
    logger.step('Step 4: Combine proximity with filters');
    const filteredResult = await client.search({
      index: 'restaurants',
      body: {
        query: {
          bool: {
            must: {
              geo_distance: {
                distance: '2km',
                location: userLocation,
              },
            },
            filter: [
              { term: { price_range: '$' } },
              { range: { rating: { gte: 4.0 } } },
            ],
          },
        },
        sort: [
          {
            _geo_distance: {
              location: userLocation,
              order: 'asc',
              unit: 'km',
            },
          },
        ],
      },
    });
    logger.command('GET /restaurants/_search', 'with cuisine and price filters');
    logger.info(`Found ${filteredResult.hits.hits.length} restaurant(s)`);
    for (const hit of filteredResult.hits.hits) {
      const source = hit._source as any;
      const distance = hit.sort?.[0] as number;
      logger.info(`  - ${source.name} - ${source.cuisine} - ${source.price_range} (${distance.toFixed(2)} km)`);
    }
    logger.assert(filteredResult.hits.hits.length >= 1, 'Combined geospatial and filters');
    logger.production('Combine geo queries with filters for multi-faceted search\n');

    // Bounding box query
    logger.step('Step 5: Bounding box search');
    const bboxResult = await client.search({
      index: 'restaurants',
      body: {
        query: {
          geo_bounding_box: {
            location: {
              top_left: { lat: 40.75, lon: -74.00 },
              bottom_right: { lat: 40.72, lon: -73.98 },
            },
          },
        },
      },
    });
    logger.command('GET /restaurants/_search', JSON.stringify({
      query: {
        geo_bounding_box: {
          location: {
            top_left: { lat: 40.75, lon: -74.00 },
            bottom_right: { lat: 40.72, lon: -73.98 },
          },
        },
      },
    }, null, 2));
    logger.info(`Found ${bboxResult.hits.hits.length} restaurant(s) in bounding box`);
    logger.assert(bboxResult.hits.hits.length >= 1, 'Bounding box query works');
    logger.production('Bounding box queries useful for map viewport searches\n');

    logger.success('\n✓ Geospatial search patterns demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'restaurants', ignore_unavailable: true });
  },
};
