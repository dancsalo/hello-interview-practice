import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const ecommerceCatalogExample: CassandraExample = {
  name: 'E-Commerce Catalog: Multi-Access Patterns',
  description: 'SAI vs denormalization tradeoffs for product catalog queries',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('🛒 Cassandra Example: E-Commerce Product Catalog');
    logger.info('Multiple access patterns, SAI vs denormalization tradeoffs\n');

    // Create keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS ecommerce_demo
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);

    // Step 1: Identify access patterns
    logger.step('Step 1: Identify All Access Patterns');
    logger.info('E-commerce product catalog has multiple query patterns:\n');
    logger.info('  1. Lookup by product_id (product detail page)     - HIGH frequency');
    logger.info('  2. Browse by category (category listing page)     - HIGH frequency');
    logger.info('  3. Filter by price range (price filter sidebar)   - MEDIUM frequency');
    logger.info('  4. Category + price range (combined filter)       - MEDIUM frequency');
    logger.info('  5. Search by name (search bar)                    - LOW frequency');
    logger.info('');
    logger.info('Decision: Which patterns deserve denormalized tables vs SAI?\n');

    // Step 2: Primary table
    logger.step('Step 2: Primary Table (Product by ID)');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ecommerce_demo.products (
        product_id UUID PRIMARY KEY,
        name TEXT,
        description TEXT,
        category TEXT,
        price DECIMAL,
        inventory INT,
        created_at TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE products (product_id UUID PRIMARY KEY, ...)');
    logger.success('Pattern 1: Lookup by product_id = primary key query (fastest possible)');
    logger.info('');

    // Step 3: SAI for price range queries
    logger.step('Step 3: SAI for Price Range Queries (Infrequent)');
    await client.execute(`
      CREATE INDEX IF NOT EXISTS ON ecommerce_demo.products(price) USING 'sai'
    `);
    logger.command("CREATE INDEX ON products(price) USING 'sai'");
    logger.info('SAI (Storage Attached Index) for price range filtering');
    logger.info('  - No separate table needed');
    logger.info('  - Flexible: supports range queries (>=, <=, BETWEEN)');
    logger.info('  - Trade-off: Slower than partition key lookup (scans multiple partitions)');
    logger.warning('  - Use for infrequent queries where flexibility > performance\n');

    // Step 4: Denormalized table for category queries
    logger.step('Step 4: Denormalized Table for Category Browsing (Frequent)');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ecommerce_demo.products_by_category (
        category TEXT,
        price DECIMAL,
        product_id UUID,
        name TEXT,
        inventory INT,
        PRIMARY KEY (category, price, product_id)
      ) WITH CLUSTERING ORDER BY (price ASC, product_id ASC)
    `);
    logger.command('CREATE TABLE products_by_category (PRIMARY KEY (category, price, product_id)) WITH CLUSTERING ORDER BY (price ASC)');
    logger.success('Pattern 2: Browse by category = single partition read (fast)');
    logger.success('Pattern 4: Category + price range = partition read with clustering range');
    logger.info('  - Sorted by price (enables efficient price filtering within category)');
    logger.info('  - Denormalized: duplicates product data for read efficiency\n');

    // Step 5: Insert product data
    logger.step('Step 5: Insert Product Catalog');

    const products = [
      { name: 'MacBook Pro 16"', category: 'electronics', price: 2499.99, inventory: 50 },
      { name: 'AirPods Pro', category: 'electronics', price: 249.99, inventory: 200 },
      { name: 'iPhone 15', category: 'electronics', price: 999.99, inventory: 150 },
      { name: 'USB-C Cable', category: 'electronics', price: 19.99, inventory: 1000 },
      { name: 'Running Shoes', category: 'sports', price: 129.99, inventory: 75 },
      { name: 'Yoga Mat', category: 'sports', price: 39.99, inventory: 300 },
      { name: 'Dumbbell Set', category: 'sports', price: 89.99, inventory: 100 },
      { name: 'Novel: The Algorithm', category: 'books', price: 24.99, inventory: 500 },
      { name: 'Cassandra Definitive Guide', category: 'books', price: 49.99, inventory: 80 },
      { name: 'System Design Interview', category: 'books', price: 39.99, inventory: 250 },
    ];

    const productIds: types.Uuid[] = [];
    for (const product of products) {
      const productId = types.Uuid.random();
      productIds.push(productId);
      const now = new Date();

      // Write to primary table
      await client.execute(
        'INSERT INTO ecommerce_demo.products (product_id, name, description, category, price, inventory, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [productId, product.name, `Description for ${product.name}`, product.category, product.price, product.inventory, now],
        { prepare: true }
      );

      // Write to denormalized table
      await client.execute(
        'INSERT INTO ecommerce_demo.products_by_category (category, price, product_id, name, inventory) VALUES (?, ?, ?, ?, ?)',
        [product.category, product.price, productId, product.name, product.inventory],
        { prepare: true }
      );
    }
    logger.command(`INSERT ${products.length} products`, 'Written to BOTH tables (denormalization)');
    logger.info('  Each product insert = 2 writes (products + products_by_category)');
    logger.info('  Write amplification: 2x (acceptable for frequent read patterns)\n');

    // Step 6: Query by product_id (primary key)
    logger.step('Step 6: Query by Product ID (Primary Key Lookup)');
    const productResult = await client.execute(
      'SELECT name, category, price, inventory FROM ecommerce_demo.products WHERE product_id = ?',
      [productIds[0]],
      { prepare: true }
    );
    logger.command('SELECT * FROM products WHERE product_id = ?', `Found: ${productResult.rows[0].name}`);
    logger.info(`  Category: ${productResult.rows[0].category}`);
    logger.info(`  Price: $${productResult.rows[0].price}`);
    logger.info(`  Inventory: ${productResult.rows[0].inventory}`);
    logger.success('Performance: Single partition, single row lookup = fastest possible\n');

    // Step 7: Query by category (denormalized table)
    logger.step('Step 7: Query by Category (Denormalized Table)');
    const electronicsResult = await client.execute(
      'SELECT name, price, inventory FROM ecommerce_demo.products_by_category WHERE category = ?',
      ['electronics'],
      { prepare: true }
    );
    logger.command("SELECT * FROM products_by_category WHERE category = 'electronics'", `${electronicsResult.rows.length} products`);
    for (const row of electronicsResult.rows) {
      logger.info(`  $${Number(row.price).toFixed(2)} - ${row.name} (${row.inventory} in stock)`);
    }
    logger.success('Performance: Single partition read, pre-sorted by price ASC\n');

    // Step 8: Query by price range (SAI)
    logger.step('Step 8: Query by Price Range (SAI)');
    const priceRangeResult = await client.execute(
      'SELECT name, category, price FROM ecommerce_demo.products WHERE price >= ? AND price <= ?',
      [25.0, 100.0],
      { prepare: true }
    );
    logger.command('SELECT * FROM products WHERE price >= 25 AND price <= 100', `${priceRangeResult.rows.length} products`);
    for (const row of priceRangeResult.rows) {
      logger.info(`  $${Number(row.price).toFixed(2)} - ${row.name} [${row.category}]`);
    }
    logger.info('');
    logger.warning('Performance: SAI scans multiple partitions (slower than partition key query)');
    logger.info('Acceptable for: admin reports, analytics, infrequent user queries\n');

    // Step 9: Query by category + price range (denormalized with clustering)
    logger.step('Step 9: Query by Category + Price Range (Denormalized, Best of Both)');
    const categoryPriceResult = await client.execute(
      'SELECT name, price FROM ecommerce_demo.products_by_category WHERE category = ? AND price >= ? AND price <= ?',
      ['electronics', 100.0, 1000.0],
      { prepare: true }
    );
    logger.command(
      "SELECT * FROM products_by_category WHERE category = 'electronics' AND price >= 100 AND price <= 1000",
      `${categoryPriceResult.rows.length} products`
    );
    for (const row of categoryPriceResult.rows) {
      logger.info(`  $${Number(row.price).toFixed(2)} - ${row.name}`);
    }
    logger.success('Performance: Single partition + clustering key range = fast!');
    logger.info('  Partition key (category) narrows to one partition');
    logger.info('  Clustering key (price) enables efficient range scan within partition\n');

    // Step 10: Performance comparison
    logger.step('Step 10: Performance Comparison');
    logger.info('');
    logger.info('Access Pattern              | Approach           | Partitions Hit | Performance');
    logger.info('---------------------------|--------------------|--------------|-----------');
    logger.info('By product_id              | Primary key        | 1            | Fastest');
    logger.info('By category                | Denormalized table | 1            | Fast');
    logger.info('By price range             | SAI                | Many         | Slower');
    logger.info('By category + price range  | Denormalized table | 1            | Fast');
    logger.info('');

    // Decision matrix
    logger.step('Step 11: Decision Matrix - When to Use Each Approach');
    logger.info('');
    logger.info('Query Pattern              | Frequency | Approach');
    logger.info('--------------------------|-----------|-------------------');
    logger.info('Lookup by ID              | High      | Primary key');
    logger.info('Browse by category        | High      | Denormalized table');
    logger.info('Filter by price           | Low       | SAI');
    logger.info('Category + price filter   | Medium    | Denormalized table');
    logger.info('Full-text search          | Low       | External (Elasticsearch)');
    logger.info('');
    logger.info('Rules of thumb:');
    logger.production('  - Frequent + latency-sensitive: DENORMALIZE (create new table)');
    logger.production('  - Infrequent + flexible: SAI (add index to existing table)');
    logger.production('  - Complex search: External search engine (Elasticsearch, Solr)');
    logger.production('  - Never: ALLOW FILTERING in production\n');

    // Step 12: Tradeoffs discussion
    logger.step('Step 12: Tradeoffs Discussion');
    logger.info('');
    logger.info('DENORMALIZATION tradeoffs:');
    logger.success('  + Fastest reads (single partition, pre-sorted)');
    logger.success('  + Predictable latency (always same path)');
    logger.warning('  - Write amplification (2x-5x writes per mutation)');
    logger.warning('  - Application manages consistency across tables');
    logger.warning('  - Schema rigidity (new query pattern = new table + backfill)');
    logger.info('');
    logger.info('SAI tradeoffs:');
    logger.success('  + No extra table (less write amplification)');
    logger.success('  + Flexible (range queries, equality, CONTAINS)');
    logger.success('  + Easy to add/remove');
    logger.warning('  - Slower than partition key queries');
    logger.warning('  - Scans multiple partitions (coordinator-heavy)');
    logger.warning('  - Not suitable for high-frequency hot-path queries');
    logger.info('');

    // Step 13: Assertions
    logger.step('Step 13: Verification');

    logger.assert(
      productResult.rows.length === 1,
      'Primary key lookup returns exactly 1 product',
      `Expected 1 product, got ${productResult.rows.length}`
    );

    logger.assert(
      electronicsResult.rows.length === 4,
      'Category query returns all 4 electronics products',
      `Expected 4 electronics, got ${electronicsResult.rows.length}`
    );

    logger.assert(
      priceRangeResult.rows.length > 0,
      'SAI price range query returns results',
      'SAI query returned no results'
    );

    logger.assert(
      categoryPriceResult.rows.length === 2,
      'Category + price range returns 2 products ($100-$1000 electronics)',
      `Expected 2 products, got ${categoryPriceResult.rows.length}`
    );

    // Verify price ordering in category table
    if (electronicsResult.rows.length >= 2) {
      const price1 = Number(electronicsResult.rows[0].price);
      const price2 = Number(electronicsResult.rows[1].price);
      logger.assert(
        price1 <= price2,
        'Products sorted by price ASC in category table',
        'Price ordering incorrect'
      );
    }

    logger.info('\n');
    logger.production('Key Interview Takeaways:');
    logger.production('1. Identify ALL access patterns before designing schema');
    logger.production('2. Denormalize for frequent, latency-sensitive queries');
    logger.production('3. SAI for infrequent, flexible queries (acceptable latency)');
    logger.production('4. One table per high-frequency query pattern');
    logger.production('5. Clustering keys enable efficient range scans within partition');
    logger.production('6. Write amplification is the cost of read efficiency');
    logger.production('7. External search engines for complex full-text search');
  },

  async cleanup(client: Client): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS ecommerce_demo');
  },
};
