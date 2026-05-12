import type { Logger, ZooKeeperExample } from '../../../../lib/types.js';
import { ZooKeeperClient, CreateMode } from '../../client.js';

export const ensembleConsensusExample: ZooKeeperExample = {
  name: 'Ensemble & Consensus (Conceptual)',
  description: 'Understanding ZAB protocol and multi-node coordination',

  async run(client: ZooKeeperClient, logger: Logger): Promise<void> {
    logger.section('🌐 ZooKeeper Ensemble & Consensus: ZAB Protocol');
    logger.info('Conceptual understanding of multi-node ZooKeeper coordination\n');

    logger.info('NOTE: This example runs on single-node Docker setup.');
    logger.info('Multi-node behavior is explained conceptually for interview preparation.\n');

    const basePath = '/demo-ensemble-concepts';
    await client.ensurePath(basePath);

    logger.step('Step 1: ZooKeeper Ensemble Architecture');

    logger.info('ZooKeeper ensemble consists of multiple servers:\n');
    logger.command('Typical ensemble sizes:');
    logger.info('  • 3 servers → tolerates 1 failure');
    logger.info('  • 5 servers → tolerates 2 failures');
    logger.info('  • 7 servers → tolerates 3 failures\n');

    logger.command('Formula: Quorum = (N / 2) + 1');
    logger.info('  • 3 servers → quorum = 2');
    logger.info('  • 5 servers → quorum = 3');
    logger.info('  • 7 servers → quorum = 5\n');

    logger.production('Always use odd numbers - even numbers provide no additional fault tolerance\n');

    logger.step('Step 2: Leader Election (Internal to ZooKeeper)');

    logger.info('ZooKeeper ensemble elects a leader among servers:\n');
    logger.command('Leader responsibilities:');
    logger.info('  • Process all write requests');
    logger.info('  • Coordinate state updates across followers');
    logger.info('  • Maintain transaction log\n');

    logger.command('Follower responsibilities:');
    logger.info('  • Process read requests');
    logger.info('  • Forward writes to leader');
    logger.info('  • Participate in quorum votes\n');

    logger.production('Leader election happens automatically when ensemble starts or leader fails\n');

    logger.step('Step 3: ZooKeeper Atomic Broadcast (ZAB) Protocol');

    logger.info('ZAB ensures consistency across ensemble:\n');
    logger.command('Phase 1: Leader election');
    logger.info('  1. Servers vote for leader (highest transaction ID wins)');
    logger.info('  2. Candidate with majority votes becomes leader');
    logger.info('  3. Leader establishes epoch (version number)\n');

    logger.command('Phase 2: Discovery');
    logger.info('  1. Leader syncs state with followers');
    logger.info('  2. Followers send their latest transaction ID');
    logger.info('  3. Leader brings all followers up to date\n');

    logger.command('Phase 3: Broadcast (normal operation)');
    logger.info('  1. Client sends write to any server');
    logger.info('  2. Server forwards to leader');
    logger.info('  3. Leader proposes transaction to followers');
    logger.info('  4. Followers ACK if they can commit');
    logger.info('  5. If quorum ACKs → leader commits');
    logger.info('  6. Leader notifies followers to commit');
    logger.info('  7. Client receives success response\n');

    logger.production('Two-phase commit ensures all-or-nothing atomicity\n');

    logger.step('Step 4: Write Path (Consensus in Action)');

    logger.info('Demonstrating write operation in this single-node setup:\n');

    const startTime = Date.now();
    await client.create(
      `${basePath}/write-example`,
      Buffer.from('consensus-test'),
      CreateMode.PERSISTENT
    );
    const writeLatency = Date.now() - startTime;

    logger.command('create /demo-ensemble-concepts/write-example');
    logger.command('write latency', `${writeLatency}ms`);

    logger.info('\nIn multi-node ensemble, write path would be:\n');
    logger.info('  1. Client → Any ZooKeeper server');
    logger.info('  2. Server → Leader (if not leader)');
    logger.info('  3. Leader → Propose to followers');
    logger.info('  4. Followers → ACK to leader');
    logger.info('  5. Leader → Commit (if quorum ACKs)');
    logger.info('  6. Leader → Notify followers');
    logger.info('  7. Leader → Response to client\n');

    logger.production('Write latency includes network RTT + quorum coordination (~10-50ms)\n');

    logger.step('Step 5: Read Path (No Consensus Needed)');

    const readStart = Date.now();
    await client.getData(`${basePath}/write-example`);
    const readLatency = Date.now() - readStart;

    logger.command('getData /demo-ensemble-concepts/write-example');
    logger.command('read latency', `${readLatency}ms`);

    logger.info('\nReads are served locally by any server:');
    logger.info('  • No leader coordination needed');
    logger.info('  • No quorum required');
    logger.info('  • Much faster than writes (~1-5ms)\n');

    logger.production('Reads scale horizontally - add more servers for more read capacity\n');

    logger.step('Step 6: Quorum Requirements and Failure Tolerance');

    logger.info('Quorum math determines fault tolerance:\n');

    logger.command('3-node ensemble:');
    logger.info('  • Quorum = 2');
    logger.info('  • Can lose 1 node (2 remaining = quorum ✓)');
    logger.info('  • Cannot lose 2 nodes (1 remaining ≠ quorum ✗)\n');

    logger.command('5-node ensemble:');
    logger.info('  • Quorum = 3');
    logger.info('  • Can lose 2 nodes (3 remaining = quorum ✓)');
    logger.info('  • Cannot lose 3 nodes (2 remaining ≠ quorum ✗)\n');

    logger.info('Why odd numbers only?');
    logger.info('  • 4 nodes: quorum = 3, tolerates 1 failure (same as 3 nodes!)');
    logger.info('  • 5 nodes: quorum = 3, tolerates 2 failures (better)\n');

    logger.production('Odd numbers maximize fault tolerance per node count\n');

    logger.step('Step 7: Network Partition Handling (Split-Brain Prevention)');

    logger.info('Quorum prevents split-brain during network partition:\n');

    logger.command('Scenario: 5-node ensemble splits 3-2');
    logger.info('  • Partition A: 3 nodes → has quorum → continues operation');
    logger.info('  • Partition B: 2 nodes → no quorum → stops accepting writes\n');

    logger.command('Scenario: 5-node ensemble splits 2-2-1');
    logger.info('  • No partition has quorum (3 needed)');
    logger.info('  • All partitions stop accepting writes');
    logger.info('  • Reads still served (stale data possible)\n');

    logger.production('Majority quorum guarantees at most one partition can proceed\n');

    logger.step('Step 8: ZAB vs Paxos vs Raft');

    logger.info('Consensus algorithm comparison:\n');

    logger.command('ZAB (ZooKeeper Atomic Broadcast):');
    logger.info('  • Primary-backup model');
    logger.info('  • Leader election + atomic broadcast');
    logger.info('  • Predates Raft (2007 vs 2013)');
    logger.info('  • Optimized for ordered updates\n');

    logger.command('Paxos:');
    logger.info('  • Original consensus algorithm (1989)');
    logger.info('  • Notoriously difficult to understand');
    logger.info('  • Used in Google Chubby, Spanner\n');

    logger.command('Raft:');
    logger.info('  • Designed for understandability (2013)');
    logger.info('  • Similar to ZAB but cleaner model');
    logger.info('  • Used in etcd, Consul, CockroachDB\n');

    logger.production('All three achieve same goal: linearizable consensus across distributed nodes\n');

    logger.step('Step 9: Performance Characteristics');

    logger.info('ZooKeeper ensemble performance:\n');

    logger.command('Write throughput:');
    logger.info('  • Limited by leader (all writes go through leader)');
    logger.info('  • Typical: 10,000-40,000 writes/sec');
    logger.info('  • More servers ≠ more write capacity\n');

    logger.command('Read throughput:');
    logger.info('  • Scales with ensemble size');
    logger.info('  • Each server can serve reads independently');
    logger.info('  • Typical: 100,000-500,000 reads/sec per server\n');

    logger.command('Latency:');
    logger.info('  • Writes: 10-50ms (includes quorum coordination)');
    logger.info('  • Reads: 1-5ms (local to server)');
    logger.info('  • Increases with geographic distribution\n');

    logger.production('ZooKeeper optimized for read-heavy workloads (10:1 read/write ratio)\n');

    logger.step('Step 10: Production Deployment Considerations');

    logger.info('Best practices for ensemble deployment:\n');

    logger.command('Hardware:');
    logger.info('  • Dedicated machines (not shared with other services)');
    logger.info('  • SSD for transaction logs (critical for performance)');
    logger.info('  • 4-8 GB RAM minimum');
    logger.info('  • Low-latency network (< 1ms between nodes)\n');

    logger.command('Geographic distribution:');
    logger.info('  • All nodes in same datacenter: Best performance');
    logger.info('  • Cross-datacenter: Higher latency, better disaster recovery');
    logger.info('  • Avoid: Majority in one DC (defeats purpose)\n');

    logger.command('Monitoring:');
    logger.info('  • Leader election frequency (should be rare)');
    logger.info('  • Transaction log size');
    logger.info('  • Outstanding requests queue depth');
    logger.info('  • Follower lag\n');

    logger.production('ZooKeeper is infrastructure - monitor it like database or load balancer\n');

    // Cleanup
    await client.deleteRecursive(basePath);

    logger.success('\n✓ Ensemble & consensus concepts explained: ZAB protocol, quorum math, fault tolerance!');
    logger.info(
      '\nKey takeaway: Quorum-based consensus enables strong consistency at cost of write scalability'
    );
    logger.info('\nFor hands-on multi-node exploration, see README for Docker Compose ensemble setup.');
  },
};
