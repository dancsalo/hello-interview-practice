import type { Client } from 'pg';
import type { Logger, PostgreSQLExample } from '../../../../lib/types.js';

export const indexingExample: PostgreSQLExample = {
  name: 'Indexing: B-tree, Covering, Partial',
  description: 'Index types, performance comparison, when to use indexes',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('🔍 PostgreSQL Indexing: Performance Optimization');
    logger.info('Product catalog with filtering and sorting\n');

    // Setup: Create products table
    logger.step('Setup: Create products table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        category VARCHAR(50) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        stock INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE products');

    // Insert sample data
    logger.step('Step 1: Insert 10,000 products');
    const categories = ['electronics', 'books', 'clothing', 'toys', 'food'];
    const batchSize = 1000;

    for (let i = 0; i < 10; i++) {
      const values = [];
      const params = [];
      let paramCount = 1;

      for (let j = 0; j < batchSize; j++) {
        const productNum = i * batchSize + j + 1;
        const category = categories[productNum % categories.length];
        const price = (Math.random() * 1000).toFixed(2);
        const stock = Math.floor(Math.random() * 100);

        values.push(`($${paramCount}, $${paramCount + 1}, $${paramCount + 2}, $${paramCount + 3})`);
        params.push(`Product ${productNum}`, category, price, stock);
        paramCount += 4;
      }

      await client.query(
        `INSERT INTO products (name, category, price, stock) VALUES ${values.join(', ')}`,
        params
      );
    }
    logger.command('INSERT 10,000 products in batches');

    const count = await client.query('SELECT COUNT(*) FROM products');
    logger.assert(count.rows[0].count === '10000', '10,000 products inserted');

    // Step 2: Query without index
    logger.step('Step 2: Query without index (slow)');
    const startNoIndex = Date.now();
    const noIndexResult = await client.query(`
      SELECT * FROM products
      WHERE category = 'electronics'
      ORDER BY price DESC
      LIMIT 10
    `);
    const noIndexTime = Date.now() - startNoIndex;
    logger.command('SELECT * FROM products WHERE category = electronics ORDER BY price DESC LIMIT 10');
    logger.command(`Execution time: ${noIndexTime}ms`);

    const explainNoIndex = await client.query(`
      EXPLAIN SELECT * FROM products
      WHERE category = 'electronics'
      ORDER BY price DESC
      LIMIT 10
    `);
    logger.command('EXPLAIN output:', explainNoIndex.rows.map(r => r['QUERY PLAN']).join('\n'));
    logger.production('Seq Scan = full table scan (slow for large tables)\n');

    // Step 3: Create B-tree index
    logger.step('Step 3: Create B-tree index on category');
    await client.query(`
      CREATE INDEX idx_products_category ON products(category)
    `);
    logger.command('CREATE INDEX idx_products_category ON products(category)');

    const startWithIndex = Date.now();
    const withIndexResult = await client.query(`
      SELECT * FROM products
      WHERE category = 'electronics'
      ORDER BY price DESC
      LIMIT 10
    `);
    const withIndexTime = Date.now() - startWithIndex;
    logger.command(`Execution time: ${withIndexTime}ms (${Math.round(noIndexTime / Math.max(withIndexTime, 1))}x faster)`);

    const explainWithIndex = await client.query(`
      EXPLAIN SELECT * FROM products
      WHERE category = 'electronics'
      ORDER BY price DESC
      LIMIT 10
    `);
    logger.command('EXPLAIN output:', explainWithIndex.rows.map(r => r['QUERY PLAN']).join('\n'));
    logger.assert(withIndexTime <= noIndexTime, 'Query with index is faster or same speed');

    // Step 4: Multi-column index
    logger.step('Step 4: Create multi-column index (category, price)');
    await client.query('DROP INDEX IF EXISTS idx_products_category');
    await client.query(`
      CREATE INDEX idx_products_category_price ON products(category, price DESC)
    `);
    logger.command('CREATE INDEX idx_products_category_price ON products(category, price DESC)');
    logger.production('Column order matters: filter columns first, sort columns last\n');

    const explainMultiCol = await client.query(`
      EXPLAIN SELECT * FROM products
      WHERE category = 'electronics'
      ORDER BY price DESC
      LIMIT 10
    `);
    logger.command('EXPLAIN with multi-column index:', explainMultiCol.rows.map(r => r['QUERY PLAN']).join('\n'));
    logger.production('Index can handle both WHERE and ORDER BY efficiently\n');

    // Step 5: Covering index
    logger.step('Step 5: Create covering index (INCLUDE)');
    await client.query('DROP INDEX IF EXISTS idx_products_category_price');
    await client.query(`
      CREATE INDEX idx_products_category_covering
      ON products(category)
      INCLUDE (name, price, stock)
    `);
    logger.command('CREATE INDEX ... INCLUDE (name, price, stock)');
    logger.production('Covering index includes all columns needed by query');
    logger.production('Avoids heap access = index-only scan\n');

    const explainCovering = await client.query(`
      EXPLAIN SELECT name, price, stock
      FROM products
      WHERE category = 'electronics'
      LIMIT 10
    `);
    logger.command('EXPLAIN covering index:', explainCovering.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Step 6: Partial index
    logger.step('Step 6: Create partial index (WHERE clause)');
    await client.query(`
      CREATE INDEX idx_products_in_stock
      ON products(category)
      WHERE stock > 0
    `);
    logger.command('CREATE INDEX ... WHERE stock > 0');
    logger.production('Partial indexes are smaller and faster');
    logger.production('Only indexes rows that match the WHERE condition\n');

    const inStockResult = await client.query(`
      SELECT COUNT(*) FROM products WHERE category = 'electronics' AND stock > 0
    `);
    logger.command('SELECT COUNT(*) WHERE category = electronics AND stock > 0', inStockResult.rows[0].count);

    const explainPartial = await client.query(`
      EXPLAIN SELECT * FROM products
      WHERE category = 'electronics' AND stock > 0
    `);
    logger.command('EXPLAIN partial index:', explainPartial.rows.map(r => r['QUERY PLAN']).join('\n'));

    // Step 7: When NOT to use indexes
    logger.step('Step 7: When indexes hurt performance');
    logger.production('Indexes slow down writes (INSERT, UPDATE, DELETE)');
    logger.production('Indexes take disk space');
    logger.production('Small tables: seq scan can be faster than index scan');
    logger.production('High cardinality good, low cardinality bad');
    logger.production('Example: indexing boolean column rarely helps\n');

    // Show all indexes
    const indexesResult = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'products'
      ORDER BY indexname
    `);
    logger.command('Show all indexes on products table:');
    for (const row of indexesResult.rows) {
      logger.info(`  ${row.indexname}: ${row.indexdef}`);
    }

    logger.production('\nProduction Considerations:');
    logger.production('- Create indexes based on query patterns, not speculation');
    logger.production('- Monitor index usage: pg_stat_user_indexes');
    logger.production('- REINDEX periodically to rebuild fragmented indexes');
    logger.production('- VACUUM regularly to clean up dead tuples');
    logger.production('- Each index slows writes - don\'t over-index\n');

    logger.success('✓ Indexing strategies demonstrated!');

    // Cleanup
    await client.query('DROP TABLE IF EXISTS products CASCADE');
  },
};
