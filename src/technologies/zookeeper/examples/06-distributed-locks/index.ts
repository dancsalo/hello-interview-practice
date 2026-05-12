import type { Logger, ZooKeeperExample } from '../../../../lib/types.js';
import { ZooKeeperClient, CreateMode } from '../../client.js';

export const distributedLocksExample: ZooKeeperExample = {
  name: 'Distributed Locks',
  description: 'FIFO lock acquisition with automatic release on failure',

  async run(client: ZooKeeperClient, logger: Logger): Promise<void> {
    logger.section('🔒 Distributed Locks: Exclusive Resource Access');
    logger.info('Rate limiting critical API calls across distributed chat servers\n');

    const lockPath = '/demo-chat-locks/rate-limit';
    await client.ensurePath(lockPath);

    logger.step('Step 1: Multiple clients attempt to acquire lock');

    class DistributedLock {
      private myPath: string | null = null;
      private hasLock: boolean = false;

      constructor(
        private name: string,
        private client: ZooKeeperClient,
        private logger: Logger
      ) {}

      async acquire(lockPath: string): Promise<void> {
        // Create ephemeral sequential node
        this.myPath = await this.client.create(
          `${lockPath}/lock-`,
          Buffer.from(this.name),
          CreateMode.EPHEMERAL_SEQUENTIAL
        );

        this.logger.info(`${this.name} created ${this.myPath}`);
        await this.checkLock(lockPath);
      }

      private async checkLock(lockPath: string): Promise<void> {
        const children = await this.client.getChildren(lockPath);
        const sorted = children.sort();
        const mySeq = this.myPath!.split('/').pop()!;
        const myIndex = sorted.indexOf(mySeq);

        if (myIndex === 0) {
          // I have the lock!
          this.hasLock = true;
          this.logger.success(`${this.name} acquired lock`);
        } else {
          // Watch predecessor
          const predecessorPath = `${lockPath}/${sorted[myIndex - 1]}`;
          this.logger.info(`${this.name} waiting for lock (watching ${predecessorPath})`);
          this.watchPredecessor(lockPath, predecessorPath);
        }
      }

      private watchPredecessor(lockPath: string, predecessorPath: string): void {
        const zkClient = this.client.getClient();

        zkClient.exists(predecessorPath, async (event) => {
          if (event.name === 'NODE_DELETED') {
            this.logger.info(`\n🔔 ${this.name} detected predecessor release`);
            await this.checkLock(lockPath);
          }
        }, () => {});
      }

      async release(): Promise<void> {
        if (this.myPath) {
          await this.client.remove(this.myPath);
          this.logger.info(`${this.name} released lock`);
          this.hasLock = false;
        }
      }

      hasAcquired(): boolean {
        return this.hasLock;
      }

      getPath(): string | null {
        return this.myPath;
      }
    }

    const client1 = new DistributedLock('Client-1', client, logger);
    const client2 = new DistributedLock('Client-2', client, logger);
    const client3 = new DistributedLock('Client-3', client, logger);

    await client1.acquire(lockPath);
    await client2.acquire(lockPath);
    await client3.acquire(lockPath);

    await new Promise((resolve) => setTimeout(resolve, 100));

    logger.assert(client1.hasAcquired(), 'Client 1 acquired lock first');
    logger.assert(!client2.hasAcquired(), 'Client 2 waiting');
    logger.assert(!client3.hasAcquired(), 'Client 3 waiting');
    logger.production('FIFO ordering: first to request = first to acquire\n');

    logger.step('Step 2: Lock holder performs critical operation');

    logger.command('Client-1 performing rate-limited operation...');
    await new Promise((resolve) => setTimeout(resolve, 50));
    logger.success('Operation complete');
    logger.production('Lock ensures only one client executes critical section at a time\n');

    logger.step('Step 3: Explicit lock release');

    await client1.release();
    await new Promise((resolve) => setTimeout(resolve, 200));

    logger.assert(!client1.hasAcquired(), 'Client 1 released lock');
    logger.assert(client2.hasAcquired(), 'Client 2 acquired lock');
    logger.assert(!client3.hasAcquired(), 'Client 3 still waiting');
    logger.success('Lock transferred to next waiter');
    logger.production('Clean handoff to next client in queue\n');

    logger.step('Step 4: Simulate crash (no explicit release)');

    logger.command('Client-2 crashes without releasing lock');
    await client.remove(client2.getPath()!);
    await new Promise((resolve) => setTimeout(resolve, 200));

    logger.assert(client3.hasAcquired(), 'Client 3 acquired lock');
    logger.success('Lock automatically released on crash');
    logger.production('Ephemeral nodes prevent deadlocks from crashed holders\n');

    logger.step('Step 5: Hierarchical locks for fine-grained control');

    // Create locks for different resources
    const userLockPath = '/demo-chat-locks/user-123';
    const roomLockPath = '/demo-chat-locks/room-456';
    await client.ensurePath(userLockPath);
    await client.ensurePath(roomLockPath);

    const userLock = new DistributedLock('UserLock-Client', client, logger);
    const roomLock = new DistributedLock('RoomLock-Client', client, logger);

    await userLock.acquire(userLockPath);
    await roomLock.acquire(roomLockPath);

    await new Promise((resolve) => setTimeout(resolve, 100));

    logger.assert(userLock.hasAcquired() && roomLock.hasAcquired(), 'Both locks acquired');
    logger.success('Independent locks for different resources');
    logger.production('Hierarchical paths enable fine-grained locking strategies\n');

    // Cleanup
    await client3.release();
    await userLock.release();
    await roomLock.release();
    await client.deleteRecursive('/demo-chat-locks');

    logger.success('\n✓ Distributed locks demonstrated: FIFO ordering, automatic release, hierarchical locks!');
    logger.info(
      '\nKey takeaway: ZooKeeper locks for critical operations, Redis for high-frequency locking'
    );
  },
};
