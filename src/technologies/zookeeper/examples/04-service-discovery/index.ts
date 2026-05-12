import type { ZooKeeperExample, Logger } from '../../../../lib/types.js';
import { ZooKeeperClient, CreateMode } from '../../client.js';

export const serviceDiscoveryExample: ZooKeeperExample = {
  name: 'Service Discovery',
  description: 'Service registration with automatic deregistration on failure',

  async run(client: ZooKeeperClient, logger: Logger): Promise<void> {
    logger.section('🔍 Service Discovery: Dynamic Service Registration');
    logger.info('Video transcoding microservices registering and discovering each other\n');

    const basePath = '/demo-streaming/services';
    await client.ensurePath(basePath);

    logger.step('Step 1: Register video transcoder instances');

    await client.ensurePath(`${basePath}/video-transcoder`);

    const instance1Path = await client.create(
      `${basePath}/video-transcoder/instance-`,
      Buffer.from(JSON.stringify({ host: '10.0.0.1', port: 8080, capacity: 10 })),
      CreateMode.EPHEMERAL_SEQUENTIAL
    );
    logger.command('create /services/video-transcoder/instance- {...} EPHEMERAL_SEQUENTIAL');
    logger.command('created', instance1Path);

    const instance2Path = await client.create(
      `${basePath}/video-transcoder/instance-`,
      Buffer.from(JSON.stringify({ host: '10.0.0.2', port: 8080, capacity: 15 })),
      CreateMode.EPHEMERAL_SEQUENTIAL
    );
    logger.command('created', instance2Path);

    const instance3Path = await client.create(
      `${basePath}/video-transcoder/instance-`,
      Buffer.from(JSON.stringify({ host: '10.0.0.3', port: 8080, capacity: 12 })),
      CreateMode.EPHEMERAL_SEQUENTIAL
    );
    logger.command('created', instance3Path);

    logger.success('3 transcoder instances registered');
    logger.production('Ephemeral + sequential: unique registration, automatic cleanup on crash\n');

    logger.step('Step 2: Discover available transcoder instances');

    const children = await client.getChildren(`${basePath}/video-transcoder`);
    logger.command('getChildren /services/video-transcoder', JSON.stringify(children));

    const instances = [];
    for (const child of children) {
      const { data } = await client.getData(`${basePath}/video-transcoder/${child}`);
      instances.push(JSON.parse(data.toString()));
    }

    logger.command('Discovered instances', JSON.stringify(instances, null, 2));
    logger.assert(instances.length === 3, 'All 3 instances discovered');
    logger.production('Services discover peers by querying ZooKeeper directory\n');

    logger.step('Step 3: Load balancing with capacity awareness');

    function selectInstance(instances: any[]): any {
      return instances.reduce((best, current) =>
        current.capacity > best.capacity ? current : best
      );
    }

    const selected = selectInstance(instances);
    logger.command('Select instance with highest capacity', JSON.stringify(selected));
    logger.assert(selected.capacity === 15, 'Selected instance with capacity 15');
    logger.production('Client-side load balancing using service metadata\n');

    logger.step('Step 4: Watch for service availability changes');

    let watchFired = false;
    const zkClient = client.getClient();

    zkClient.getChildren(`${basePath}/video-transcoder`, (event) => {
      logger.info(`\n🔔 Service discovery update: ${event.name} on ${event.path}`);
      watchFired = true;
    }, () => {});

    logger.command('getChildren /services/video-transcoder [with watch]');
    await new Promise((resolve) => setTimeout(resolve, 100));

    logger.step('Step 5: Simulate instance failure');

    logger.command(`remove ${instance2Path} (simulating instance-2 crash)`);
    await client.remove(instance2Path);
    await new Promise((resolve) => setTimeout(resolve, 200));

    logger.assert(watchFired, 'Watch notified of instance removal');
    logger.success('Other services detected instance failure automatically');

    const remainingChildren = await client.getChildren(`${basePath}/video-transcoder`);
    logger.command('getChildren /services/video-transcoder', JSON.stringify(remainingChildren));
    logger.assert(remainingChildren.length === 2, 'Only 2 instances remain');
    logger.production('Ephemeral nodes enable automatic failure detection via session expiration\n');

    logger.step('Step 6: Service discovery client pattern');

    class ServiceDiscoveryClient {
      private instances: Map<string, any> = new Map();

      constructor(
        private serviceName: string,
        private client: ZooKeeperClient,
        private logger: Logger
      ) {}

      async start(): Promise<void> {
        await this.refreshInstances();
        this.watchForChanges();
      }

      private async refreshInstances(): Promise<void> {
        try {
          const path = `${basePath}/${this.serviceName}`;
          const children = await this.client.getChildren(path);

          this.instances.clear();
          for (const child of children) {
            const { data } = await this.client.getData(`${path}/${child}`);
            this.instances.set(child, JSON.parse(data.toString()));
          }

          this.logger.info(`${this.serviceName} instances refreshed: ${this.instances.size} available`);
        } catch (error: any) {
          // Node was deleted (cleanup), ignore
          if (error.name !== 'NO_NODE') {
            throw error;
          }
        }
      }

      private watchForChanges(): void {
        const zkClient = this.client.getClient();
        const path = `${basePath}/${this.serviceName}`;

        zkClient.getChildren(path, async (event) => {
          this.logger.info(`\n🔔 ${this.serviceName} instances changed`);
          await this.refreshInstances();
          this.watchForChanges(); // Re-register watch
        }, () => {});
      }

      getInstances(): any[] {
        return Array.from(this.instances.values());
      }

      selectInstance(): any | null {
        const instances = this.getInstances();
        if (instances.length === 0) return null;
        return instances[Math.floor(Math.random() * instances.length)];
      }
    }

    const discoveryClient = new ServiceDiscoveryClient('video-transcoder', client, logger);
    await discoveryClient.start();

    logger.command('ServiceDiscoveryClient initialized and watching');
    const available = discoveryClient.getInstances();
    logger.assert(available.length === 2, 'Client sees 2 available instances');

    const randomInstance = discoveryClient.selectInstance();
    logger.command('selectInstance()', JSON.stringify(randomInstance));
    logger.success('Client-side load balancing and automatic failover ready');

    logger.production('Pattern: maintain local registry, watch for changes, re-register on update\n');

    // Cleanup
    await client.deleteRecursive('/demo-streaming');

    logger.success('\n✓ Service discovery demonstrated: registration, discovery, failure detection!');
    logger.info(
      '\nKey takeaway: Ephemeral nodes + watches = automatic service registry with failure detection'
    );
  },
};
