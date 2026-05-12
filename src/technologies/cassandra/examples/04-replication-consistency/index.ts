import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const replicationConsistencyExample: CassandraExample = {
  name: 'Replication & Consistency Levels',
  description: 'CAP theorem in practice, consistency vs availability tradeoffs',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('🔄 Cassandra Example: Replication & Consistency');
    logger.info('RF configurations, consistency levels, CAP theorem tradeoffs\n');

    // Step 1: Replication Factor configurations
    logger.step('Step 1: Replication Factor (RF) Configurations');
    logger.info('The replication factor determines how many copies of data exist in the cluster.\n');

    // RF=1: No fault tolerance
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS demo_rf1
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);
    logger.command(
      "CREATE KEYSPACE demo_rf1 WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}"
    );
    logger.warning('RF=1: Data exists on only 1 node. If that node fails, data is LOST.');
    logger.info('Use case: Development/testing only\n');

    // RF=3: Production standard
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS demo_rf3
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 3}
    `);
    logger.command(
      "CREATE KEYSPACE demo_rf3 WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 3}"
    );
    logger.success('RF=3: Data copied to 3 nodes. Can tolerate 1-2 node failures.');
    logger.info('Use case: Production deployments (most common)\n');

    // NetworkTopologyStrategy for multi-DC
    logger.step('Step 2: NetworkTopologyStrategy (Multi-Datacenter)');
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS demo_multi_dc
      WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 3}
    `);
    logger.command(
      "CREATE KEYSPACE demo_multi_dc WITH replication = {'class': 'NetworkTopologyStrategy', 'datacenter1': 3}"
    );
    logger.info('NetworkTopologyStrategy: Specify RF per datacenter');
    logger.info('Production config: dc1: 3, dc2: 2 (3 copies in primary DC, 2 in DR)');
    logger.info('Benefits: Data locality, disaster recovery, cross-region reads\n');

    // Step 3: Consistency Levels explained
    logger.step('Step 3: Consistency Levels');
    logger.info('Consistency level = how many replicas must respond before acknowledging.\n');

    logger.info('Available consistency levels:');
    logger.info('  ONE        - 1 replica responds (fastest, least consistent)');
    logger.info('  TWO        - 2 replicas respond');
    logger.info('  THREE      - 3 replicas respond');
    logger.info('  QUORUM     - majority responds: floor(RF/2) + 1');
    logger.info('  ALL        - all replicas respond (slowest, most consistent)');
    logger.info('  LOCAL_QUORUM - quorum within local datacenter only');
    logger.info('  EACH_QUORUM  - quorum in each datacenter\n');

    // Step 4: Demonstrate consistency levels in code
    logger.step('Step 4: Consistency Level Configuration in Code');

    // Create a table for demonstration
    await client.execute(`
      CREATE TABLE IF NOT EXISTS demo_rf1.consistency_demo (
        id UUID PRIMARY KEY,
        value TEXT,
        updated_at TIMESTAMP
      )
    `);

    const testId = types.Uuid.random();
    const now = new Date();

    // Write with different consistency levels
    logger.info('Writing with consistency level ONE:');
    await client.execute(
      'INSERT INTO demo_rf1.consistency_demo (id, value, updated_at) VALUES (?, ?, ?)',
      [testId, 'hello', now],
      { prepare: true, consistency: types.consistencies.one }
    );
    logger.command('INSERT ... WITH consistency = ONE', 'Acknowledged by 1 replica');
    logger.info('Fastest write: only 1 node must acknowledge\n');

    // Read with different consistency levels
    logger.info('Reading with consistency level ONE:');
    const resultOne = await client.execute(
      'SELECT * FROM demo_rf1.consistency_demo WHERE id = ?',
      [testId],
      { prepare: true, consistency: types.consistencies.one }
    );
    logger.command('SELECT ... WITH consistency = ONE', `Got value: "${resultOne.rows[0].value}"`);
    logger.info('Fastest read: returns first replica response (may be stale)\n');

    // Step 5: QUORUM math
    logger.step('Step 5: QUORUM Math (R + W > RF = Strong Consistency)');
    logger.info('With RF=3:');
    logger.info('  QUORUM = floor(3/2) + 1 = 2 nodes must respond\n');

    logger.info('The formula: R + W > RF guarantees strong consistency');
    logger.info('  R = read consistency level (number of nodes that must respond to reads)');
    logger.info('  W = write consistency level (number of nodes that must respond to writes)');
    logger.info('  RF = replication factor\n');

    logger.info('Examples with RF=3:');
    logger.success('  QUORUM write (W=2) + QUORUM read (R=2): 2+2=4 > 3 = STRONG');
    logger.success('  ALL write (W=3) + ONE read (R=1): 3+1=4 > 3 = STRONG');
    logger.warning('  ONE write (W=1) + ONE read (R=1): 1+1=2 < 3 = EVENTUAL');
    logger.warning('  ONE write (W=1) + QUORUM read (R=2): 1+2=3 = 3, NOT > 3 = EVENTUAL');
    logger.info('');

    // Step 6: Consistency/Availability Matrix
    logger.step('Step 6: Consistency vs Availability Tradeoff Matrix');
    logger.info('');
    logger.info('Write CL  | Read CL   | Consistency  | Availability | Latency');
    logger.info('----------|-----------|--------------|--------------|--------');
    logger.info('ONE       | ONE       | Eventual     | Highest      | Lowest');
    logger.info('ONE       | QUORUM    | Eventual     | High         | Medium');
    logger.info('QUORUM    | ONE       | Eventual     | High         | Medium');
    logger.info('QUORUM    | QUORUM    | Strong       | Medium       | Medium');
    logger.info('ALL       | ONE       | Strong       | Low          | High');
    logger.info('ALL       | ALL       | Strong       | Lowest       | Highest');
    logger.info('');

    logger.info('Key insight: Higher consistency = more nodes must respond = higher latency');
    logger.info('Key insight: Higher consistency = less tolerance for node failures\n');

    // Step 7: CAP Theorem
    logger.step('Step 7: CAP Theorem and Cassandra');
    logger.info('CAP Theorem: A distributed system can only guarantee 2 of 3:');
    logger.info('  C - Consistency: All nodes see the same data at the same time');
    logger.info('  A - Availability: Every request receives a response');
    logger.info('  P - Partition tolerance: System operates despite network failures\n');

    logger.info('Cassandra is an AP system (Availability + Partition Tolerance):');
    logger.info('  - Prioritizes availability over strict consistency');
    logger.info('  - During network partition, nodes continue serving requests');
    logger.info('  - Can TUNE toward consistency using QUORUM levels');
    logger.info('  - With QUORUM reads + QUORUM writes, behaves like CP system\n');

    // Step 8: Production scenarios
    logger.step('Step 8: Production Recommendations');
    logger.production('Scenario: E-commerce product catalog');
    logger.production('  Write: ONE (product updates are rare, eventual is fine)');
    logger.production('  Read: ONE (stale product info acceptable for milliseconds)');
    logger.info('');
    logger.production('Scenario: Financial transactions');
    logger.production('  Write: QUORUM (must be durable across majority)');
    logger.production('  Read: QUORUM (must see latest committed value)');
    logger.info('');
    logger.production('Scenario: Multi-region social media');
    logger.production('  Write: LOCAL_QUORUM (fast local writes, async replication to other DCs)');
    logger.production('  Read: LOCAL_QUORUM (read from local DC, avoid cross-DC latency)');
    logger.info('');
    logger.production('General guidance:');
    logger.production('  - QUORUM/QUORUM for strong consistency with good availability');
    logger.production('  - LOCAL_QUORUM in multi-DC (avoid cross-DC round trips)');
    logger.production('  - ONE for max availability, accept eventual consistency');
    logger.production('  - ALL rarely used: single node failure = request failure');
    logger.production('  - Tune per-query based on requirements (not per-cluster)\n');

    // Step 9: Repair mechanisms
    logger.step('Step 9: How Cassandra Achieves Eventual Consistency');
    logger.info('When replicas diverge, Cassandra has mechanisms to converge:');
    logger.info('');
    logger.info('1. Read Repair: During reads, compare replicas, fix stale ones');
    logger.info('   - Happens automatically on read path');
    logger.info('   - Only repairs the specific row read');
    logger.info('');
    logger.info('2. Hinted Handoff: If replica is down, coordinator stores hints');
    logger.info('   - When node comes back, hints are replayed');
    logger.info('   - Limited by hinted_handoff_throttle_in_kb');
    logger.info('');
    logger.info('3. Anti-Entropy Repair (nodetool repair):');
    logger.info('   - Full comparison using Merkle trees');
    logger.info('   - Run periodically (recommended: within gc_grace_seconds)');
    logger.info('   - Ensures all replicas converge');
    logger.info('');

    // Step 10: Assertions
    logger.step('Step 10: Verification');

    // Verify write was successful
    const verifyResult = await client.execute(
      'SELECT * FROM demo_rf1.consistency_demo WHERE id = ?',
      [testId],
      { prepare: true }
    );

    logger.assert(
      verifyResult.rows.length === 1,
      'Write with CL=ONE succeeded and is readable',
      'Write failed'
    );

    logger.assert(
      verifyResult.rows[0].value === 'hello',
      'Correct value returned after write',
      'Incorrect value returned'
    );

    // Verify keyspace creation
    const keyspaces = await client.execute(
      "SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name IN ('demo_rf1', 'demo_rf3', 'demo_multi_dc')"
    );
    logger.assert(
      keyspaces.rows.length === 3,
      'All 3 keyspaces created (RF=1, RF=3, NetworkTopologyStrategy)',
      `Expected 3 keyspaces, got ${keyspaces.rows.length}`
    );

    logger.info('\n');
    logger.production('Key Interview Takeaways:');
    logger.production('1. Cassandra is AP in CAP (tunable toward CP with QUORUM)');
    logger.production('2. R + W > RF = strong consistency');
    logger.production('3. QUORUM = floor(RF/2) + 1');
    logger.production('4. LOCAL_QUORUM for multi-DC deployments');
    logger.production('5. Consistency is per-query, not per-cluster');
  },

  async cleanup(client: Client): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS demo_rf1');
    await client.execute('DROP KEYSPACE IF EXISTS demo_rf3');
    await client.execute('DROP KEYSPACE IF EXISTS demo_multi_dc');
  },
};
