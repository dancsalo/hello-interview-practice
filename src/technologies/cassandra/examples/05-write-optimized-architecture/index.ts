import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const writeOptimizedArchitectureExample: CassandraExample = {
  name: 'Write-Optimized Architecture: LSM Trees & SSTables',
  description: 'Why Cassandra excels at writes, commit log, memtable, compaction',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('⚡ Cassandra Example: Write-Optimized Architecture');
    logger.info('Commit log, memtable, SSTable, compaction, tombstones\n');

    // Create keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS write_demo
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);

    // Step 1: Write path explanation
    logger.step('Step 1: The Write Path (Why Writes Are Fast)');
    logger.info('Cassandra uses Log-Structured Merge (LSM) trees for writes:\n');
    logger.info('  1. Write arrives at coordinator node');
    logger.info('  2. Append to COMMIT LOG (sequential disk write, durable)');
    logger.info('  3. Write to MEMTABLE (in-memory sorted structure)');
    logger.info('  4. Acknowledge to client (write complete!)');
    logger.info('  5. When memtable full: flush to SSTABLE on disk');
    logger.info('  6. SSTables are IMMUTABLE (no random disk writes ever)');
    logger.info('  7. Background COMPACTION merges SSTables\n');
    logger.info('Key insight: Steps 2-4 are the write path. Only 1 sequential disk write.');
    logger.info('Compare to B-tree (PostgreSQL): Must find page, write in place, update index.');
    logger.success('Result: Cassandra writes are O(1) - constant time regardless of data size.\n');

    // Step 2: Demonstrate writes
    logger.step('Step 2: Bulk Inserts (All Go Through Write Path)');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS write_demo.events (
        id UUID PRIMARY KEY,
        value TEXT,
        counter INT,
        created_at TIMESTAMP
      )
    `);
    logger.command('CREATE TABLE events (id UUID PRIMARY KEY, value TEXT, counter INT, created_at TIMESTAMP)');

    // Insert multiple records
    const ids: types.Uuid[] = [];
    for (let i = 0; i < 10; i++) {
      const id = types.Uuid.random();
      ids.push(id);
      await client.execute(
        'INSERT INTO write_demo.events (id, value, counter, created_at) VALUES (?, ?, ?, ?)',
        [id, `value_${i}`, i, new Date()],
        { prepare: true }
      );
    }
    logger.command('INSERT 10 events', 'Each write: commit log append + memtable insert');
    logger.info('In memory: Memtable now has 10 sorted entries');
    logger.info('On disk: Commit log has 10 sequential append entries');
    logger.info('No disk seeks, no page splits, no index updates\n');

    // Step 3: Updates create NEW entries
    logger.step('Step 3: Updates Are Writes (Not In-Place Modifications)');
    logger.info('In Cassandra, UPDATE does NOT find and modify existing data.');
    logger.info('Instead, it creates a NEW entry with a newer timestamp.\n');

    const updateId = ids[0];
    await client.execute(
      'UPDATE write_demo.events SET value = ?, counter = ? WHERE id = ?',
      ['updated_value', 999, updateId],
      { prepare: true }
    );
    logger.command('UPDATE events SET value = "updated_value" WHERE id = ?', 'New entry created');

    // Read to show latest value wins
    const result = await client.execute(
      'SELECT * FROM write_demo.events WHERE id = ?',
      [updateId],
      { prepare: true }
    );
    logger.command('SELECT * WHERE id = ?', `value="${result.rows[0].value}", counter=${result.rows[0].counter}`);
    logger.info('');
    logger.info('What happened internally:');
    logger.info('  Memtable entry 1: {id: X, value: "value_0", counter: 0, ts: T1}');
    logger.info('  Memtable entry 2: {id: X, value: "updated_value", counter: 999, ts: T2}');
    logger.info('  On read: T2 > T1, so "updated_value" wins (Last Write Wins)');
    logger.info('');
    logger.warning('Implication: Updates are as fast as inserts (same path)');
    logger.warning('Implication: Old versions exist until compaction removes them\n');

    // Step 4: Timestamps and Last Write Wins
    logger.step('Step 4: Timestamps and Last Write Wins (LWW)');
    logger.info('Every cell in Cassandra has a timestamp (microseconds since epoch).');
    logger.info('When multiple writes exist for same cell, highest timestamp wins.\n');

    const lwwId = types.Uuid.random();
    // Write initial value
    await client.execute(
      'INSERT INTO write_demo.events (id, value, counter) VALUES (?, ?, ?)',
      [lwwId, 'first', 1],
      { prepare: true }
    );
    // Overwrite with newer timestamp
    await client.execute(
      'INSERT INTO write_demo.events (id, value, counter) VALUES (?, ?, ?)',
      [lwwId, 'second', 2],
      { prepare: true }
    );
    const lwwResult = await client.execute(
      'SELECT value, counter FROM write_demo.events WHERE id = ?',
      [lwwId],
      { prepare: true }
    );
    logger.command('INSERT (value="first"), then INSERT (value="second")', `Result: value="${lwwResult.rows[0].value}"`);
    logger.success('Last Write Wins: "second" has newer timestamp, so it wins');
    logger.info('No locks, no read-before-write, no conflict resolution needed\n');

    // Step 5: Tombstones (How Deletes Work)
    logger.step('Step 5: Tombstones (Deletes Are Also Writes)');
    logger.info('DELETE in Cassandra does NOT remove data immediately.');
    logger.info('Instead, it writes a TOMBSTONE marker (a "death certificate").\n');

    const deleteId = ids[1];

    // Verify data exists
    const beforeDelete = await client.execute(
      'SELECT * FROM write_demo.events WHERE id = ?',
      [deleteId],
      { prepare: true }
    );
    logger.command('SELECT * WHERE id = ?', `Before delete: value="${beforeDelete.rows[0].value}"`);

    // Delete the record
    await client.execute(
      'DELETE FROM write_demo.events WHERE id = ?',
      [deleteId],
      { prepare: true }
    );
    logger.command('DELETE FROM events WHERE id = ?', 'Tombstone marker written');

    // Verify data is "gone"
    const afterDelete = await client.execute(
      'SELECT * FROM write_demo.events WHERE id = ?',
      [deleteId],
      { prepare: true }
    );
    logger.command('SELECT * WHERE id = ?', `After delete: ${afterDelete.rows.length} rows`);
    logger.info('');
    logger.info('What happened internally:');
    logger.info('  Original entry: {id: Y, value: "value_1", ts: T1}');
    logger.info('  Tombstone entry: {id: Y, TOMBSTONE, ts: T2}');
    logger.info('  On read: Tombstone found with T2 > T1, so row appears deleted');
    logger.info('');
    logger.warning('Tombstone remains until compaction (default gc_grace_seconds: 864000 = 10 days)');
    logger.warning('Too many tombstones degrade read performance (must skip over them)');
    logger.warning('Anti-pattern: Frequent delete + reinsert patterns create tombstone buildup\n');

    // Step 6: Compaction
    logger.step('Step 6: Compaction (Background Maintenance)');
    logger.info('Compaction merges multiple SSTables into fewer, removing:');
    logger.info('  - Overwritten values (older timestamps)');
    logger.info('  - Expired tombstones (past gc_grace_seconds)');
    logger.info('  - Expired TTL data\n');

    logger.info('Compaction strategies:');
    logger.info('  Size-Tiered (STCS): Default. Good for write-heavy workloads.');
    logger.info('    - Merges similarly-sized SSTables');
    logger.info('    - Temporary 2x disk space during compaction');
    logger.info('');
    logger.info('  Leveled (LCS): Better for read-heavy workloads.');
    logger.info('    - Organizes SSTables into levels (L0, L1, L2...)');
    logger.info('    - 90% of reads hit 1 SSTable (vs potentially many with STCS)');
    logger.info('    - More I/O during compaction');
    logger.info('');
    logger.info('  Time-Window (TWCS): Best for time-series with TTL.');
    logger.info('    - Groups SSTables by time window');
    logger.info('    - Entire SSTables drop when all data expires');
    logger.info('    - Most efficient for time-series IoT data\n');

    // Step 7: Read path
    logger.step('Step 7: The Read Path (Why Reads Can Be Slower)');
    logger.info('Reading in Cassandra requires checking multiple places:\n');
    logger.info('  1. Check MEMTABLE (in-memory, fastest)');
    logger.info('  2. Check BLOOM FILTERS (probabilistic: "definitely not here" or "maybe here")');
    logger.info('  3. Check PARTITION INDEX (find SSTable offset)');
    logger.info('  4. Read from SSTABLE(s) on disk');
    logger.info('  5. Merge results from all sources (latest timestamp wins)');
    logger.info('');
    logger.info('Why reads can be slow:');
    logger.warning('  - Multiple SSTables may contain data for same partition');
    logger.warning('  - Must check bloom filter for each SSTable');
    logger.warning('  - Tombstones must be skipped over');
    logger.warning('  - Compaction reduces SSTable count (improves reads over time)');
    logger.info('');
    logger.info('Optimization: Bloom filters avoid most unnecessary disk reads');
    logger.info('Optimization: Key cache and row cache reduce disk I/O');
    logger.info('Optimization: Compaction reduces number of SSTables to check\n');

    // Step 8: Write vs Read performance comparison
    logger.step('Step 8: Write vs Read Performance Comparison');
    logger.info('');
    logger.info('Operation | Disk Pattern     | Speed   | Complexity');
    logger.info('----------|-----------------|---------|----------');
    logger.info('Write     | Sequential append| O(1)   | Always fast');
    logger.info('Read      | Seek + merge     | O(log n)| Depends on SSTable count');
    logger.info('Update    | Sequential append| O(1)   | Same as write');
    logger.info('Delete    | Sequential append| O(1)   | Creates tombstone');
    logger.info('');
    logger.info('Traditional DB (B-tree):');
    logger.info('  Write: Find page, modify in place, update index = O(log n), random I/O');
    logger.info('  Read: B-tree traversal = O(log n), but predictable');
    logger.info('');
    logger.success('Cassandra tradeoff: Faster writes at cost of potentially slower reads');
    logger.success('Best for: Write-heavy workloads (IoT, logging, messaging, analytics)\n');

    // Step 9: Assertions
    logger.step('Step 9: Verification');

    // Verify update worked
    logger.assert(
      result.rows[0].value === 'updated_value',
      'Update created new entry with latest timestamp (LWW)',
      'Update did not reflect latest value'
    );

    logger.assert(
      result.rows[0].counter === 999,
      'Counter updated via new entry (not in-place modification)',
      'Counter not updated correctly'
    );

    // Verify delete worked
    logger.assert(
      afterDelete.rows.length === 0,
      'Delete created tombstone, row no longer visible',
      'Delete did not work as expected'
    );

    // Verify LWW
    logger.assert(
      lwwResult.rows[0].value === 'second',
      'Last Write Wins: newer timestamp value returned',
      'LWW resolution failed'
    );

    logger.info('\n');
    logger.production('Key Interview Takeaways:');
    logger.production('1. Writes are O(1): commit log append + memtable insert');
    logger.production('2. Updates and deletes are also writes (new entries/tombstones)');
    logger.production('3. Last Write Wins (LWW) conflict resolution via timestamps');
    logger.production('4. SSTables are immutable (no random disk I/O)');
    logger.production('5. Compaction is critical: merges SSTables, removes tombstones');
    logger.production('6. Read path: memtable -> bloom filter -> SSTables -> merge');
    logger.production('7. Trade-off: write speed for eventual read complexity');
  },

  async cleanup(client: Client): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS write_demo');
  },
};
