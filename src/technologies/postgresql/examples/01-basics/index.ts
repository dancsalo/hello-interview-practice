import type { Client } from 'pg';
import type { Logger, PostgreSQLExample } from '../../../../lib/types.js';

export const basicsExample: PostgreSQLExample = {
  name: 'Basics: Core SQL Operations',
  description: 'CRUD, joins, relationships, foreign keys',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('📦 PostgreSQL Basics: Core SQL Operations');
    logger.info('E-commerce user profiles and orders\n');

    // Step 1: Create users table
    logger.step('Step 1: Create users table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE users (id, username, email, created_at)');
    logger.production('SERIAL is PostgreSQL\'s auto-increment type\n');

    // Step 2: Insert users
    logger.step('Step 2: Insert users (CREATE)');
    await client.query(`
      INSERT INTO users (username, email)
      VALUES
        ('alice', 'alice@example.com'),
        ('bob', 'bob@example.com'),
        ('charlie', 'charlie@example.com')
    `);
    logger.command('INSERT INTO users ...');

    // Step 3: Read users
    logger.step('Step 3: Read users (READ)');
    const usersResult = await client.query('SELECT * FROM users ORDER BY id');
    logger.command('SELECT * FROM users', JSON.stringify(usersResult.rows, null, 2));
    logger.assert(usersResult.rows.length === 3, 'Three users inserted');

    // Step 4: Update user
    logger.step('Step 4: Update user (UPDATE)');
    await client.query(`
      UPDATE users
      SET email = 'alice.new@example.com'
      WHERE username = 'alice'
    `);
    logger.command('UPDATE users SET email = ... WHERE username = alice');

    const aliceResult = await client.query(`
      SELECT email FROM users WHERE username = 'alice'
    `);
    logger.command('SELECT email FROM users WHERE username = alice', aliceResult.rows[0].email);
    logger.assert(
      aliceResult.rows[0].email === 'alice.new@example.com',
      'User email updated successfully'
    );

    // Step 5: Create orders table with foreign key
    logger.step('Step 5: Create orders table with foreign key relationship');
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        total DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE orders (id, user_id, total, status, created_at)');
    logger.production('REFERENCES enforces referential integrity');
    logger.production('ON DELETE CASCADE removes orders when user is deleted\n');

    // Step 6: Insert orders
    logger.step('Step 6: Insert orders');
    const aliceId = usersResult.rows[0].id;
    const bobId = usersResult.rows[1].id;

    await client.query(`
      INSERT INTO orders (user_id, total, status)
      VALUES
        ($1, 99.99, 'completed'),
        ($1, 149.50, 'pending'),
        ($2, 75.00, 'completed')
    `, [aliceId, bobId]);
    logger.command('INSERT INTO orders (user_id, total, status) ...');
    logger.production('Using parameterized queries prevents SQL injection\n');

    // Step 7: INNER JOIN
    logger.step('Step 7: Query with INNER JOIN');
    const joinResult = await client.query(`
      SELECT
        users.username,
        users.email,
        orders.id as order_id,
        orders.total,
        orders.status
      FROM users
      INNER JOIN orders ON users.id = orders.user_id
      ORDER BY users.id, orders.id
    `);
    logger.command(
      'SELECT users.*, orders.* FROM users INNER JOIN orders ...',
      JSON.stringify(joinResult.rows, null, 2)
    );
    logger.assert(joinResult.rows.length === 3, 'Three orders joined with users');

    // Step 8: LEFT JOIN
    logger.step('Step 8: Query with LEFT JOIN');
    const leftJoinResult = await client.query(`
      SELECT
        users.username,
        COUNT(orders.id) as order_count,
        COALESCE(SUM(orders.total), 0) as total_spent
      FROM users
      LEFT JOIN orders ON users.id = orders.user_id
      GROUP BY users.id, users.username
      ORDER BY users.id
    `);
    logger.command(
      'SELECT users.username, COUNT(orders.id) FROM users LEFT JOIN orders ...',
      JSON.stringify(leftJoinResult.rows, null, 2)
    );
    logger.assert(leftJoinResult.rows.length === 3, 'All users included, even without orders');
    logger.production('LEFT JOIN includes users with zero orders\n');

    // Step 9: Foreign key constraint violation
    logger.step('Step 9: Demonstrate foreign key constraint');
    try {
      await client.query(`
        INSERT INTO orders (user_id, total)
        VALUES (99999, 100.00)
      `);
      logger.assert(false, 'Should not reach here');
    } catch (error: any) {
      logger.command('INSERT INTO orders (user_id=99999, ...) → ERROR');
      logger.assert(
        error.code === '23503',
        'Foreign key constraint violation caught (invalid user_id)'
      );
    }

    // Step 10: Cascading delete
    logger.step('Step 10: Delete user (CASCADE)');
    await client.query(`DELETE FROM users WHERE username = 'charlie'`);
    logger.command('DELETE FROM users WHERE username = charlie');

    const remainingOrders = await client.query('SELECT COUNT(*) FROM orders');
    const remainingUsers = await client.query('SELECT COUNT(*) FROM users');
    logger.command('SELECT COUNT(*) FROM orders', remainingOrders.rows[0].count);
    logger.command('SELECT COUNT(*) FROM users', remainingUsers.rows[0].count);
    logger.assert(
      remainingUsers.rows[0].count === '2',
      'Charlie deleted (CASCADE removes associated orders)'
    );

    logger.production('\nProduction Considerations:');
    logger.production('- Foreign keys ensure data integrity but add overhead on writes');
    logger.production('- Use indexes on foreign key columns for join performance');
    logger.production('- CASCADE deletes can be dangerous - consider soft deletes');
    logger.production('- Normalize data to avoid duplication, denormalize for read performance\n');

    logger.success('✓ Basic SQL operations demonstrated!');

    // Cleanup
    await client.query('DROP TABLE IF EXISTS orders CASCADE');
    await client.query('DROP TABLE IF EXISTS users CASCADE');
  },
};
