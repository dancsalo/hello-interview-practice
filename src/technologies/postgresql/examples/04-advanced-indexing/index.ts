import type { Client } from 'pg';
import type { Logger, PostgreSQLExample } from '../../../../lib/types.js';

export const advancedIndexingExample: PostgreSQLExample = {
  name: 'Advanced Indexing: GIN, GiST, Full-Text, JSONB, PostGIS',
  description: 'Specialized indexes for full-text search, JSONB, and geospatial queries',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('🔬 PostgreSQL Advanced Indexing: GIN, GiST & Specialized Use Cases');
    logger.info('Social media posts with search, metadata, and location\n');

    // Setup: Enable extensions
    logger.step('Setup: Enable PostgreSQL extensions');
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    logger.command('CREATE EXTENSION pg_trgm (trigram matching)');

    await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
    logger.command('CREATE EXTENSION postgis (geospatial)');

    // Create posts table
    logger.step('Step 1: Create posts table with tsvector, JSONB, and geography');
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        content_tsv tsvector,
        metadata JSONB,
        location geography(POINT),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE posts (id, username, content, content_tsv, metadata, location)');
    logger.production('tsvector: Optimized text search with stemming and ranking');
    logger.production('JSONB: Binary JSON with indexable operators');
    logger.production('geography: PostGIS type for lat/lon coordinates\n');

    // Insert sample data
    logger.step('Step 2: Insert sample posts with diverse content');
    const samplePosts = [
      {
        username: 'alice',
        content: 'Learning PostgreSQL indexing strategies for performance optimization',
        metadata: { tags: ['database', 'postgresql', 'performance'], mentions: ['@bob'], likes: 42 },
        lat: 37.7749,
        lon: -122.4194, // San Francisco
      },
      {
        username: 'bob',
        content: 'Building scalable systems with distributed databases and caching',
        metadata: { tags: ['database', 'distributed', 'scalability'], mentions: ['@alice'], likes: 38 },
        lat: 37.7849,
        lon: -122.4094, // Near SF
      },
      {
        username: 'charlie',
        content: 'Exploring full-text search capabilities in PostgreSQL vs Elasticsearch',
        metadata: { tags: ['search', 'postgresql', 'elasticsearch'], mentions: [], likes: 55 },
        lat: 40.7128,
        lon: -74.0060, // New York
      },
      {
        username: 'diana',
        content: 'Optimizing database queries for better application performance',
        metadata: { tags: ['database', 'optimization', 'performance'], mentions: ['@charlie'], likes: 31 },
        lat: 40.7228,
        lon: -73.9960, // Near NYC
      },
      {
        username: 'eve',
        content: 'Geospatial queries with PostGIS for location-based services',
        metadata: { tags: ['postgis', 'geospatial', 'location'], mentions: [], likes: 47 },
        lat: 34.0522,
        lon: -118.2437, // Los Angeles
      },
    ];

    for (const post of samplePosts) {
      await client.query(`
        INSERT INTO posts (username, content, content_tsv, metadata, location)
        VALUES (
          $1,
          $2,
          to_tsvector('english', $2),
          $3,
          ST_MakePoint($5, $4)::geography
        )
      `, [
        post.username,
        post.content,
        JSON.stringify(post.metadata),
        post.lat,
        post.lon,
      ]);
    }
    logger.command('INSERT 5 posts with to_tsvector, JSONB metadata, and geography points');
    logger.production('to_tsvector: Converts text to normalized, stemmed tokens');
    logger.production('ST_MakePoint: Creates PostGIS point from lon, lat (note order!)\n');

    const count = await client.query('SELECT COUNT(*) FROM posts');
    logger.assert(count.rows[0].count === '5', '5 posts inserted');

    // Step 3: Full-text search without index
    logger.step('Step 3: Full-text search without GIN index');
    const searchQuery = 'postgresql';
    const noIndexSearch = await client.query(`
      SELECT id, username, content, ts_rank(content_tsv, to_tsquery('english', $1)) as rank
      FROM posts
      WHERE content_tsv @@ to_tsquery('english', $1)
      ORDER BY rank DESC
    `, [searchQuery]);
    logger.command(`SELECT ... WHERE content_tsv @@ to_tsquery('postgresql')`);
    logger.command('Results:', JSON.stringify(noIndexSearch.rows, null, 2));
    logger.production('@@: Text search match operator');
    logger.production('ts_rank: Relevance score based on term frequency\n');

    const explainNoGIN = await client.query(`
      EXPLAIN SELECT id, username, content
      FROM posts
      WHERE content_tsv @@ to_tsquery('english', $1)
    `, [searchQuery]);
    logger.command('EXPLAIN (no index):', explainNoGIN.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Step 4: Create GIN index for full-text search
    logger.step('Step 4: Create GIN index for full-text search');
    await client.query(`
      CREATE INDEX idx_posts_content_tsv ON posts USING GIN(content_tsv)
    `);
    logger.command('CREATE INDEX ... USING GIN(content_tsv)');
    logger.production('GIN (Generalized Inverted Index): Maps tokens to row IDs');
    logger.production('Perfect for tsvector, JSONB, arrays, and full-text search\n');

    const explainWithGIN = await client.query(`
      EXPLAIN SELECT id, username, content
      FROM posts
      WHERE content_tsv @@ to_tsquery('english', $1)
    `, [searchQuery]);
    logger.command('EXPLAIN (with GIN):', explainWithGIN.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Step 5: Advanced full-text search queries
    logger.step('Step 5: Advanced full-text search operators');

    // AND query
    const andSearch = await client.query(`
      SELECT username, content
      FROM posts
      WHERE content_tsv @@ to_tsquery('english', 'postgresql & performance')
      ORDER BY ts_rank(content_tsv, to_tsquery('english', 'postgresql & performance')) DESC
    `);
    logger.command("to_tsquery('postgresql & performance') - AND operator:", andSearch.rows.length + ' results');
    logger.info(JSON.stringify(andSearch.rows, null, 2));

    // OR query
    const orSearch = await client.query(`
      SELECT username, content
      FROM posts
      WHERE content_tsv @@ to_tsquery('english', 'elasticsearch | postgis')
    `);
    logger.command("to_tsquery('elasticsearch | postgis') - OR operator:", orSearch.rows.length + ' results');

    // Prefix query
    const prefixSearch = await client.query(`
      SELECT username, content
      FROM posts
      WHERE content_tsv @@ to_tsquery('english', 'optim:*')
    `);
    logger.command("to_tsquery('optim:*') - Prefix match:", prefixSearch.rows.length + ' results');
    logger.production('Supports AND (&), OR (|), NOT (!), and prefix matching (:*)\n');

    // Step 6: JSONB queries without index
    logger.step('Step 6: JSONB queries without GIN index');
    const noIndexJSONB = await client.query(`
      SELECT username, content, metadata->'tags' as tags
      FROM posts
      WHERE metadata @> '{"tags": ["postgresql"]}'
    `);
    logger.command("SELECT ... WHERE metadata @> '{\"tags\": [\"postgresql\"]}'");
    logger.command('Results:', JSON.stringify(noIndexJSONB.rows, null, 2));
    logger.production('@>: JSONB containment operator (left contains right)\n');

    const explainNoJSONB = await client.query(`
      EXPLAIN SELECT username, content
      FROM posts
      WHERE metadata @> '{"tags": ["postgresql"]}'
    `);
    logger.command('EXPLAIN (no JSONB index):', explainNoJSONB.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Step 7: Create GIN index for JSONB
    logger.step('Step 7: Create GIN index for JSONB queries');
    await client.query(`
      CREATE INDEX idx_posts_metadata ON posts USING GIN(metadata)
    `);
    logger.command('CREATE INDEX ... USING GIN(metadata)');
    logger.production('GIN index on JSONB enables fast queries on nested structures\n');

    const explainWithJSONB = await client.query(`
      EXPLAIN SELECT username, content
      FROM posts
      WHERE metadata @> '{"tags": ["postgresql"]}'
    `);
    logger.command('EXPLAIN (with JSONB GIN):', explainWithJSONB.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Step 8: More JSONB query patterns
    logger.step('Step 8: Additional JSONB query operators');

    // Key existence
    const keyExists = await client.query(`
      SELECT username, metadata->'mentions' as mentions
      FROM posts
      WHERE metadata ? 'mentions' AND jsonb_array_length(metadata->'mentions') > 0
    `);
    logger.command("SELECT ... WHERE metadata ? 'mentions' (key exists):", keyExists.rows.length + ' results');

    // Path query
    const pathQuery = await client.query(`
      SELECT username, metadata->'likes' as likes
      FROM posts
      WHERE (metadata->>'likes')::int > 40
      ORDER BY (metadata->>'likes')::int DESC
    `);
    logger.command("SELECT ... WHERE (metadata->>'likes')::int > 40:");
    logger.info(JSON.stringify(pathQuery.rows, null, 2));
    logger.production('?: Key exists; @>: Contains; ->: Get JSON object; ->>: Get text\n');

    // Step 9: Geospatial queries without index
    logger.step('Step 9: PostGIS geospatial queries without GiST index');
    const sfLat = 37.7749;
    const sfLon = -122.4194;
    const radiusMeters = 10000; // 10km

    const noIndexGeo = await client.query(`
      SELECT
        username,
        content,
        ST_Distance(location, ST_MakePoint($2, $1)::geography) / 1000 as distance_km
      FROM posts
      WHERE ST_DWithin(location, ST_MakePoint($2, $1)::geography, $3)
      ORDER BY location <-> ST_MakePoint($2, $1)::geography
    `, [sfLat, sfLon, radiusMeters]);
    logger.command(`SELECT ... WHERE ST_DWithin(location, SF_point, 10km)`);
    logger.command('Results:', JSON.stringify(noIndexGeo.rows, null, 2));
    logger.production('ST_DWithin: Distance within radius filter');
    logger.production('ST_Distance: Calculate actual distance between points');
    logger.production('<->: Distance operator for ordering\n');

    const explainNoGiST = await client.query(`
      EXPLAIN SELECT username, content
      FROM posts
      WHERE ST_DWithin(location, ST_MakePoint($2, $1)::geography, $3)
    `, [sfLat, sfLon, radiusMeters]);
    logger.command('EXPLAIN (no GiST index):', explainNoGiST.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Step 10: Create GiST index for geospatial queries
    logger.step('Step 10: Create GiST index for geospatial queries');
    await client.query(`
      CREATE INDEX idx_posts_location ON posts USING GIST(location)
    `);
    logger.command('CREATE INDEX ... USING GIST(location)');
    logger.production('GiST (Generalized Search Tree): For geometric and spatial data');
    logger.production('Supports PostGIS types, ranges, and custom distance operators\n');

    const explainWithGiST = await client.query(`
      EXPLAIN SELECT username, content
      FROM posts
      WHERE ST_DWithin(location, ST_MakePoint($2, $1)::geography, $3)
    `, [sfLat, sfLon, radiusMeters]);
    logger.command('EXPLAIN (with GiST):', explainWithGiST.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Step 11: Combined query using all indexes
    logger.step('Step 11: Combined query using all specialized indexes');
    const combined = await client.query(`
      SELECT
        username,
        content,
        metadata->'tags' as tags,
        ST_Distance(location, ST_MakePoint($3, $2)::geography) / 1000 as distance_km,
        ts_rank(content_tsv, to_tsquery('english', $1)) as relevance
      FROM posts
      WHERE
        content_tsv @@ to_tsquery('english', $1)
        AND metadata @> '{"tags": ["database"]}'
        AND ST_DWithin(location, ST_MakePoint($3, $2)::geography, $4)
      ORDER BY relevance DESC, distance_km ASC
    `, ['database', sfLat, sfLon, 50000]); // 50km radius
    logger.command('Combined query: full-text + JSONB + geospatial filters');
    logger.command('Results:', JSON.stringify(combined.rows, null, 2));
    logger.production('Query optimizer can use multiple specialized indexes efficiently\n');

    // Show all specialized indexes
    logger.step('Step 12: Review all specialized indexes');
    const indexesResult = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'posts'
      ORDER BY indexname
    `);
    logger.command('Show all indexes on posts table:');
    for (const row of indexesResult.rows) {
      logger.info(`  ${row.indexname}: ${row.indexdef}`);
    }

    logger.production('\nProduction Considerations:');
    logger.production('\nFull-Text Search:');
    logger.production('- PostgreSQL FTS: Good for < 10M documents, simple queries');
    logger.production('- Elasticsearch: Better for complex queries, faceting, aggregations');
    logger.production('- Consider search volume, query complexity, and team expertise');
    logger.production('- pg_trgm extension adds fuzzy matching (similarity, LIKE %)');

    logger.production('\nJSONB:');
    logger.production('- Use JSONB for flexible schemas and semi-structured data');
    logger.production('- Avoid for data that should be normalized (use separate columns)');
    logger.production('- GIN index size grows with document complexity');
    logger.production('- Consider jsonb_path_ops for containment-only queries (smaller index)');

    logger.production('\nPostGIS:');
    logger.production('- PostgreSQL PostGIS: Good for most geospatial needs');
    logger.production('- Specialized geo DBs (MongoDB, Elasticsearch): For massive scale');
    logger.production('- GiST index maintenance cost increases with data volume');
    logger.production('- Consider partitioning by geographic region for large datasets');

    logger.production('\nIndex Maintenance:');
    logger.production('- GIN indexes are larger and slower to build than B-tree');
    logger.production('- GIN updates can be batched with fastupdate=on (default)');
    logger.production('- VACUUM is critical for GIN/GiST index health');
    logger.production('- Monitor index bloat with pg_stat_user_indexes');

    logger.production('\nWhen to Use PostgreSQL vs Specialized Tools:');
    logger.production('- PostgreSQL sufficient: < 100M rows, moderate query complexity');
    logger.production('- Elasticsearch: Complex text queries, aggregations, analytics');
    logger.production('- Dedicated geo DB: Billions of points, complex spatial operations');
    logger.production('- Start simple, migrate when PostgreSQL becomes a bottleneck\n');

    logger.success('✓ Advanced indexing strategies demonstrated!');

    // Cleanup
    await client.query('DROP TABLE IF EXISTS posts CASCADE');
  },
};
