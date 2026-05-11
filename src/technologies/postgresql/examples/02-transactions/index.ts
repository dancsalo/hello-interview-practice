import type { Client } from 'pg';
import type { Logger, PostgreSQLExample } from '../../../../lib/types.js';

export const transactionsExample: PostgreSQLExample = {
  name: 'Transactions: ACID & Consistency',
  description: 'Atomicity, isolation levels, row-locking, concurrent operations',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('💳 PostgreSQL Transactions: ACID & Consistency');
    logger.info('Bank account transfers and auction bidding\n');

    // Setup: Create accounts table
    logger.step('Setup: Create accounts table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id SERIAL PRIMARY KEY,
        account_name VARCHAR(50) NOT NULL,
        balance DECIMAL(10, 2) NOT NULL CHECK (balance >= 0),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE accounts (id, account_name, balance)');

    await client.query(`
      INSERT INTO accounts (account_name, balance)
      VALUES ('Alice', 1000.00), ('Bob', 500.00)
    `);
    logger.command('INSERT INTO accounts ...');

    const initialResult = await client.query('SELECT * FROM accounts ORDER BY id');
    logger.command('SELECT * FROM accounts', JSON.stringify(initialResult.rows, null, 2));

    // Step 1: Demonstrate atomicity with successful transaction
    logger.step('Step 1: Transfer $100 from Alice to Bob (SUCCESS)');
    try {
      await client.query('BEGIN');
      logger.command('BEGIN');

      await client.query(`
        UPDATE accounts SET balance = balance - 100
        WHERE account_name = 'Alice'
      `);
      logger.command('UPDATE accounts SET balance = balance - 100 WHERE account_name = Alice');

      await client.query(`
        UPDATE accounts SET balance = balance + 100
        WHERE account_name = 'Bob'
      `);
      logger.command('UPDATE accounts SET balance = balance + 100 WHERE account_name = Bob');

      await client.query('COMMIT');
      logger.command('COMMIT');

      const afterTransfer = await client.query('SELECT * FROM accounts ORDER BY id');
      logger.command('SELECT * FROM accounts', JSON.stringify(afterTransfer.rows, null, 2));
      logger.assert(
        afterTransfer.rows[0].balance === '900.00' && afterTransfer.rows[1].balance === '600.00',
        'Transaction committed - both updates applied atomically'
      );
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed');
    }

    // Step 2: Demonstrate rollback on error
    logger.step('Step 2: Attempt invalid transfer (ROLLBACK)');
    try {
      await client.query('BEGIN');
      logger.command('BEGIN');

      await client.query(`
        UPDATE accounts SET balance = balance - 1000
        WHERE account_name = 'Alice'
      `);
      logger.command('UPDATE accounts SET balance = balance - 1000 WHERE account_name = Alice');

      // This will fail CHECK constraint (balance >= 0)
      await client.query(`
        UPDATE accounts SET balance = balance + 1000
        WHERE account_name = 'Bob'
      `);

      await client.query('COMMIT');
      logger.assert(false, 'Should not reach here');
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.command('ROLLBACK (CHECK constraint violation)');
      logger.assert(
        error.code === '23514',
        'Transaction rolled back - neither update applied'
      );

      const afterRollback = await client.query('SELECT * FROM accounts ORDER BY id');
      logger.command('SELECT * FROM accounts', JSON.stringify(afterRollback.rows, null, 2));
      logger.assert(
        afterRollback.rows[0].balance === '900.00',
        'Balances unchanged after rollback'
      );
    }

    // Step 3: Demonstrate isolation levels - auction bidding
    logger.step('Step 3: Auction bidding - race condition demo');

    await client.query(`
      CREATE TABLE IF NOT EXISTS auctions (
        id SERIAL PRIMARY KEY,
        item_name VARCHAR(100),
        max_bid DECIMAL(10, 2) DEFAULT 0,
        winner VARCHAR(50)
      )
    `);
    await client.query(`
      INSERT INTO auctions (item_name, max_bid)
      VALUES ('Vintage Watch', 90.00)
    `);
    logger.command('CREATE TABLE auctions; INSERT auction item with max_bid = $90');

    // Simulate race condition with Read Committed (default)
    logger.step('Step 4: Race condition with Read Committed isolation');
    const auctionId = 1;

    // Simulate User A reading max bid
    const bidResultA = await client.query(`
      SELECT max_bid FROM auctions WHERE id = $1
    `, [auctionId]);
    const currentMaxBidA = parseFloat(bidResultA.rows[0].max_bid);
    logger.command(`User A reads max_bid = $${currentMaxBidA}`);

    // Simulate User B reading max bid (same value)
    const bidResultB = await client.query(`
      SELECT max_bid FROM auctions WHERE id = $1
    `, [auctionId]);
    const currentMaxBidB = parseFloat(bidResultB.rows[0].max_bid);
    logger.command(`User B reads max_bid = $${currentMaxBidB}`);

    // Both place bids thinking max is still $90
    await client.query(`
      UPDATE auctions SET max_bid = 100.00, winner = 'User A'
      WHERE id = $1 AND max_bid < 100.00
    `, [auctionId]);
    logger.command('User A bids $100');

    // This could succeed with race condition (not properly locked)
    const updateResultB = await client.query(`
      UPDATE auctions SET max_bid = 95.00, winner = 'User B'
      WHERE id = $1 AND max_bid < 95.00
    `, [auctionId]);
    logger.command('User B bids $95 (should fail, but update count: ' + updateResultB.rowCount + ')');
    logger.production('Race condition possible without proper locking!\n');

    // Step 5: Fix with row-level locking
    logger.step('Step 5: Fix race condition with SELECT ... FOR UPDATE');

    await client.query(`
      UPDATE auctions SET max_bid = 90.00, winner = NULL WHERE id = $1
    `, [auctionId]);
    logger.command('Reset auction to $90');

    // User A with locking
    await client.query('BEGIN');
    logger.command('User A: BEGIN');

    const lockedBidA = await client.query(`
      SELECT max_bid FROM auctions WHERE id = $1 FOR UPDATE
    `, [auctionId]);
    logger.command('User A: SELECT max_bid FOR UPDATE (locks row)');

    const lockedMaxA = parseFloat(lockedBidA.rows[0].max_bid);
    if (100 > lockedMaxA) {
      await client.query(`
        UPDATE auctions SET max_bid = 100.00, winner = 'User A'
        WHERE id = $1
      `, [auctionId]);
      logger.command('User A: UPDATE max_bid = $100');
    }

    await client.query('COMMIT');
    logger.command('User A: COMMIT (releases lock)');

    // User B tries to bid (will wait if run concurrently, but here runs after)
    await client.query('BEGIN');
    logger.command('User B: BEGIN');

    const lockedBidB = await client.query(`
      SELECT max_bid FROM auctions WHERE id = $1 FOR UPDATE
    `, [auctionId]);
    logger.command('User B: SELECT max_bid FOR UPDATE');

    const lockedMaxB = parseFloat(lockedBidB.rows[0].max_bid);
    logger.command(`User B sees max_bid = $${lockedMaxB} (updated by User A)`);

    if (95 > lockedMaxB) {
      await client.query(`
        UPDATE auctions SET max_bid = 95.00, winner = 'User B'
        WHERE id = $1
      `, [auctionId]);
    } else {
      logger.command('User B: bid too low, skipping update');
    }

    await client.query('COMMIT');
    logger.command('User B: COMMIT');

    const finalAuction = await client.query(`
      SELECT * FROM auctions WHERE id = $1
    `, [auctionId]);
    logger.command('SELECT * FROM auctions', JSON.stringify(finalAuction.rows[0], null, 2));
    logger.assert(
      finalAuction.rows[0].max_bid === '100.00' && finalAuction.rows[0].winner === 'User A',
      'Row-level locking prevents race condition'
    );

    logger.production('\nProduction Considerations:');
    logger.production('- Default isolation (Read Committed) allows non-repeatable reads');
    logger.production('- Use SELECT ... FOR UPDATE for pessimistic locking');
    logger.production('- Repeatable Read prevents phantom reads in PostgreSQL');
    logger.production('- Serializable isolation prevents all anomalies but requires retry logic');
    logger.production('- Consider optimistic locking (version column) when conflicts are rare');
    logger.production('- Watch for deadlocks when locking multiple rows\n');

    logger.success('✓ Transactions and consistency demonstrated!');

    // Cleanup
    await client.query('DROP TABLE IF EXISTS accounts CASCADE');
    await client.query('DROP TABLE IF EXISTS auctions CASCADE');
  },
};
