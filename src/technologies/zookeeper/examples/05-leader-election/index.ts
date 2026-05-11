import type { Logger, ZooKeeperExample } from '../../../../lib/types.js';
import { ZooKeeperClient, CreateMode } from '../../client.js';

export const leaderElectionExample: ZooKeeperExample = {
  name: 'Leader Election',
  description: 'Sequential ephemeral pattern with automatic failover',

  async run(client: ZooKeeperClient, logger: Logger): Promise<void> {
    logger.section('👑 Leader Election: Distributed Coordination');
    logger.info('Distributed job scheduler - only one node processes jobs\n');

    const electionPath = '/demo-job-scheduler/election';
    await client.ensurePath(electionPath);

    logger.step('Step 1: Multiple nodes join election');

    const node1Path = await client.create(
      `${electionPath}/node-`,
      Buffer.from('node-1'),
      CreateMode.EPHEMERAL_SEQUENTIAL
    );
    logger.command('Node 1: create /election/node- EPHEMERAL_SEQUENTIAL');
    logger.command('created', node1Path);

    const node2Path = await client.create(
      `${electionPath}/node-`,
      Buffer.from('node-2'),
      CreateMode.EPHEMERAL_SEQUENTIAL
    );
    logger.command('Node 2: create /election/node- EPHEMERAL_SEQUENTIAL');
    logger.command('created', node2Path);

    const node3Path = await client.create(
      `${electionPath}/node-`,
      Buffer.from('node-3'),
      CreateMode.EPHEMERAL_SEQUENTIAL
    );
    logger.command('Node 3: create /election/node- EPHEMERAL_SEQUENTIAL');
    logger.command('created', node3Path);

    logger.production('Sequential + ephemeral: unique ordering, automatic cleanup on failure\n');

    logger.step('Step 2: Determine leader (lowest sequence number)');

    async function getLeader(): Promise<string> {
      const children = await client.getChildren(electionPath);
      const sorted = children.sort();
      return `${electionPath}/${sorted[0]}`;
    }

    const leaderPath = await getLeader();
    logger.command('getChildren + sort', leaderPath);
    logger.assert(leaderPath === node1Path, 'Node 1 is leader (lowest sequence)');
    logger.success('Node 1 elected as leader');
    logger.production('Lowest sequence number = leader (deterministic, no coordination needed)\n');

    logger.step('Step 3: Followers watch predecessor (avoid herd effect)');

    class ElectionParticipant {
      private myPath: string | null = null;
      private predecessorPath: string | null = null;
      private isLeader: boolean = false;

      constructor(
        private name: string,
        private client: ZooKeeperClient,
        private logger: Logger
      ) {}

      async join(electionPath: string): Promise<void> {
        this.myPath = await this.client.create(
          `${electionPath}/node-`,
          Buffer.from(this.name),
          CreateMode.EPHEMERAL_SEQUENTIAL
        );

        this.logger.info(`${this.name} joined election: ${this.myPath}`);
        await this.checkLeadership(electionPath);
      }

      private async checkLeadership(electionPath: string): Promise<void> {
        const children = await this.client.getChildren(electionPath);
        const sorted = children.sort();
        const mySeq = this.myPath!.split('/').pop()!;
        const myIndex = sorted.indexOf(mySeq);

        if (myIndex === 0) {
          this.isLeader = true;
          this.logger.success(`${this.name} is now LEADER`);
        } else {
          this.isLeader = false;
          this.predecessorPath = `${electionPath}/${sorted[myIndex - 1]}`;
          this.logger.info(`${this.name} is follower, watching predecessor: ${this.predecessorPath}`);
          this.watchPredecessor(electionPath);
        }
      }

      private watchPredecessor(electionPath: string): void {
        const zkClient = this.client.getClient();

        zkClient.exists(this.predecessorPath!, async (event) => {
          if (event.name === 'NODE_DELETED') {
            this.logger.info(`\n🔔 ${this.name} detected predecessor failure`);
            await this.checkLeadership(electionPath);
          }
        }, () => {});
      }

      getLeaderStatus(): boolean {
        return this.isLeader;
      }

      getPath(): string | null {
        return this.myPath;
      }
    }

    const participant1 = new ElectionParticipant('Participant-1', client, logger);
    const participant2 = new ElectionParticipant('Participant-2', client, logger);
    const participant3 = new ElectionParticipant('Participant-3', client, logger);

    // Clear existing nodes
    await client.deleteRecursive(electionPath);
    await client.ensurePath(electionPath);

    await participant1.join(electionPath);
    await participant2.join(electionPath);
    await participant3.join(electionPath);

    await new Promise((resolve) => setTimeout(resolve, 100));

    logger.assert(participant1.getLeaderStatus(), 'Participant 1 is leader');
    logger.assert(!participant2.getLeaderStatus(), 'Participant 2 is follower');
    logger.assert(!participant3.getLeaderStatus(), 'Participant 3 is follower');
    logger.production('Each follower watches only its predecessor - avoids thundering herd\n');

    logger.step('Step 4: Leader failure triggers automatic failover');

    logger.command('Simulating Participant-1 (leader) failure');
    await client.remove(participant1.getPath()!);
    await new Promise((resolve) => setTimeout(resolve, 200));

    logger.assert(participant2.getLeaderStatus(), 'Participant 2 promoted to leader');
    logger.assert(!participant3.getLeaderStatus(), 'Participant 3 still follower');
    logger.success('Automatic failover: Participant-2 is new leader');
    logger.production('Ephemeral node deletion triggers watch on predecessor watcher only\n');

    logger.step('Step 5: Second failover');

    logger.command('Simulating Participant-2 (new leader) failure');
    await client.remove(participant2.getPath()!);
    await new Promise((resolve) => setTimeout(resolve, 200));

    logger.assert(participant3.getLeaderStatus(), 'Participant 3 promoted to leader');
    logger.success('Participant-3 is now leader');
    logger.production('Chain of command: each node knows who comes next\n');

    // Cleanup
    await client.deleteRecursive('/demo-job-scheduler');

    logger.success('\n✓ Leader election demonstrated: deterministic election, automatic failover, herd effect avoidance!');
    logger.info(
      '\nKey takeaway: Sequential + ephemeral + watch predecessor = robust leader election pattern'
    );
  },
};
