import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const basicsExample: CassandraExample = {
  name: 'Basics: Keyspaces, Tables & CQL',
  description: 'Core Cassandra operations and data types',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('🔷 Cassandra Example: Basics & CQL');
    logger.info('Keyspaces, tables, CRUD operations, collections, UDTs\n');

    // Step 1: Create keyspace
    logger.step('Step 1: Create keyspace with SimpleStrategy');
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS demo
      WITH replication = {
        'class': 'SimpleStrategy',
        'replication_factor': 1
      }
    `);
    logger.command(
      "CREATE KEYSPACE demo WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
    );
    logger.success('Keyspace "demo" created\n');

    // Step 2: Create table with various data types
    logger.step('Step 2: Create users table with various data types');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS demo.users (
        id UUID PRIMARY KEY,
        name TEXT,
        email TEXT,
        age INT,
        balance DECIMAL,
        is_active BOOLEAN,
        created_at TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE demo.users (id UUID PRIMARY KEY, name TEXT, ...)');
    logger.success('Table "users" created with multiple data types\n');

    // Step 3: Insert data
    logger.step('Step 3: Insert sample users');
    const userId1 = types.Uuid.random();
    const userId2 = types.Uuid.random();

    await client.execute(
      `INSERT INTO demo.users (id, name, email, age, balance, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, toTimestamp(now()))`,
      [userId1, 'Alice', 'alice@example.com', 30, 1000.50, true],
      { prepare: true }
    );

    await client.execute(
      `INSERT INTO demo.users (id, name, email, age, balance, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, toTimestamp(now()))`,
      [userId2, 'Bob', 'bob@example.com', 25, 500.00, true],
      { prepare: true }
    );

    logger.command('INSERT INTO demo.users ...', 'Alice inserted');
    logger.command('INSERT INTO demo.users ...', 'Bob inserted');
    logger.success('2 users inserted\n');

    // Step 4: SELECT query
    logger.step('Step 4: Query all users');
    const selectResult = await client.execute('SELECT * FROM demo.users');
    logger.command('SELECT * FROM demo.users', `${selectResult.rows.length} rows returned`);
    selectResult.rows.forEach((row) => {
      logger.info(`  - ${row.name} (${row.email}) - Balance: $${row.balance}`);
    });
    logger.assert(selectResult.rows.length === 2, 'Found 2 users');
    logger.info('');

    // Step 5: UPDATE operation
    logger.step('Step 5: Update Alice\'s balance');
    await client.execute(
      'UPDATE demo.users SET balance = ? WHERE id = ?',
      [1500.75, userId1],
      { prepare: true }
    );
    logger.command('UPDATE demo.users SET balance = 1500.75 WHERE id = ?');

    const updatedUser = await client.execute(
      'SELECT balance FROM demo.users WHERE id = ?',
      [userId1],
      { prepare: true }
    );
    logger.command('SELECT balance FROM demo.users WHERE id = ?', `$${updatedUser.rows[0].balance}`);
    logger.assert(
      Math.abs(updatedUser.rows[0].balance - 1500.75) < 0.01,
      'Balance updated successfully'
    );
    logger.info('');

    // Step 6: Collections (list, set, map)
    logger.step('Step 6: Collections - list, set, map');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS demo.user_profiles (
        user_id UUID PRIMARY KEY,
        tags SET<TEXT>,
        recent_logins LIST<TIMESTAMP>,
        preferences MAP<TEXT, TEXT>
      )
    `);
    logger.command('CREATE TABLE demo.user_profiles (tags SET, recent_logins LIST, preferences MAP)');

    await client.execute(
      `INSERT INTO demo.user_profiles (user_id, tags, recent_logins, preferences)
       VALUES (?, {'premium', 'verified'}, [toTimestamp(now())], {'theme': 'dark', 'language': 'en'})`,
      [userId1],
      { prepare: true }
    );
    logger.command('INSERT with collections', 'Set, list, and map inserted');

    const profileResult = await client.execute(
      'SELECT * FROM demo.user_profiles WHERE user_id = ?',
      [userId1],
      { prepare: true }
    );
    logger.command('SELECT * FROM demo.user_profiles WHERE user_id = ?');
    logger.info(`  Tags: ${JSON.stringify(Array.from(profileResult.rows[0].tags))}`);
    logger.info(`  Preferences: ${JSON.stringify(profileResult.rows[0].preferences)}`);
    logger.success('Collections work as expected\n');

    // Step 7: User-defined type (UDT)
    logger.step('Step 7: User-defined types (UDTs)');
    await client.execute(`
      CREATE TYPE IF NOT EXISTS demo.address (
        street TEXT,
        city TEXT,
        state TEXT,
        zip TEXT
      )
    `);
    logger.command('CREATE TYPE demo.address (street, city, state, zip)');

    await client.execute(`
      CREATE TABLE IF NOT EXISTS demo.user_addresses (
        user_id UUID PRIMARY KEY,
        home_address FROZEN<address>,
        work_address FROZEN<address>
      )
    `);
    logger.command('CREATE TABLE demo.user_addresses (home_address FROZEN<address>, ...)');

    await client.execute(
      `INSERT INTO demo.user_addresses (user_id, home_address)
       VALUES (?, {street: '123 Main St', city: 'Seattle', state: 'WA', zip: '98101'})`,
      [userId1],
      { prepare: true }
    );
    logger.command('INSERT with UDT', 'Address UDT inserted');
    logger.success('UDT created and used successfully\n');

    // Step 8: DELETE operation
    logger.step('Step 8: Delete Bob');
    await client.execute(
      'DELETE FROM demo.users WHERE id = ?',
      [userId2],
      { prepare: true }
    );
    logger.command('DELETE FROM demo.users WHERE id = ?');

    const afterDelete = await client.execute('SELECT COUNT(*) as count FROM demo.users');
    logger.command('SELECT COUNT(*) FROM demo.users', `${afterDelete.rows[0].count} rows`);
    logger.assert(afterDelete.rows[0].count.toNumber() === 1, 'Bob deleted, only Alice remains');
    logger.info('');

    // Production considerations
    logger.production('Production Considerations:');
    logger.production('- SimpleStrategy for single DC only; use NetworkTopologyStrategy for production');
    logger.production('- UUID vs timeuuid: timeuuid includes timestamp for chronological sorting');
    logger.production('- Collections should be small (<100 elements); large collections hurt performance');
    logger.production('- UDTs are immutable; updating requires full replacement');
    logger.production('- Prepared statements (prepare: true) improve performance by caching queries');
  },

  async cleanup(client: Client): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS demo');
  },
};
