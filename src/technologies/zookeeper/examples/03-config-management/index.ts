import { Example, Logger } from '../../../../lib/types.js';
import { ZooKeeperClient, CreateMode } from '../../client.js';

type ZooKeeperExample = Example<ZooKeeperClient>;

export const configManagementExample: ZooKeeperExample = {
  name: 'Configuration Management',
  description: 'Centralized config with real-time updates and versioning',

  async run(client: ZooKeeperClient, logger: Logger): Promise<void> {
    logger.section('⚙️  Configuration Management: Centralized Control');
    logger.info('E-commerce platform with dynamic runtime configuration\n');

    const basePath = '/demo-ecommerce/config';
    await client.ensurePath(basePath);

    logger.step('Step 1: Store initial configuration');

    await client.create(
      `${basePath}/pricing_algorithm`,
      Buffer.from('standard_v1'),
      CreateMode.PERSISTENT
    );
    await client.create(
      `${basePath}/discount_threshold`,
      Buffer.from('50.00'),
      CreateMode.PERSISTENT
    );
    await client.create(
      `${basePath}/maintenance_mode`,
      Buffer.from('false'),
      CreateMode.PERSISTENT
    );
    await client.create(
      `${basePath}/feature_flags`,
      Buffer.from(JSON.stringify({ new_checkout: false, recommendations: true })),
      CreateMode.PERSISTENT
    );

    logger.command('create /demo-ecommerce/config/pricing_algorithm "standard_v1"');
    logger.command('create /demo-ecommerce/config/discount_threshold "50.00"');
    logger.command('create /demo-ecommerce/config/maintenance_mode "false"');
    logger.command('create /demo-ecommerce/config/feature_flags "{"...}"');

    const { data } = await client.getData(`${basePath}/pricing_algorithm`);
    logger.assert(data.toString() === 'standard_v1', 'Initial config stored');
    logger.production('Store dynamic runtime config in ZooKeeper, static config in env vars\n');

    logger.step('Step 2: Simulate multiple service instances watching config');

    class ServiceInstance {
      private config: Map<string, string> = new Map();

      constructor(
        private name: string,
        private client: ZooKeeperClient,
        private logger: Logger
      ) {}

      async loadConfig(configPath: string): Promise<void> {
        const children = await this.client.getChildren(configPath);

        for (const key of children) {
          const path = `${configPath}/${key}`;
          const { data } = await this.client.getData(path, false);
          this.config.set(key, data.toString());

          const zkClient = this.client.getClient();
          zkClient.getData(path, (event) => {
            this.logger.info(`\n🔔 ${this.name} detected config change: ${key}`);
            this.reloadConfig(path, key)
              .catch((err) => this.logger.info(`Watch reload failed: ${err.message}`));
          }, () => {});
        }

        this.logger.info(`${this.name} loaded config: ${JSON.stringify(Object.fromEntries(this.config))}`);
      }

      private async reloadConfig(path: string, key: string): Promise<void> {
        const { data } = await this.client.getData(path, false);
        const oldValue = this.config.get(key);
        const newValue = data.toString();
        this.config.set(key, newValue);

        this.logger.info(`${this.name} updated ${key}: ${oldValue} → ${newValue}`);

        const zkClient = this.client.getClient();
        zkClient.getData(path, (event) => {
          this.logger.info(`\n🔔 ${this.name} detected config change: ${key}`);
          this.reloadConfig(path, key)
            .catch((err) => this.logger.info(`Watch reload failed: ${err.message}`));
        }, () => {});
      }

      getConfig(key: string): string | undefined {
        return this.config.get(key);
      }
    }

    const service1 = new ServiceInstance('PricingService-1', client, logger);
    const service2 = new ServiceInstance('CheckoutService-1', client, logger);
    const service3 = new ServiceInstance('CheckoutService-2', client, logger);

    await service1.loadConfig(basePath);
    await service2.loadConfig(basePath);
    await service3.loadConfig(basePath);

    logger.command('3 service instances watching config');
    await new Promise((resolve, reject) => {
      const zkClient = client.getClient();
      zkClient.getData(`${basePath}/pricing_algorithm`, (event) => {
        if (event.type === 'changed') {
          resolve();
        } else {
          reject(new Error('Unexpected event type'));
        }
      }, () => {});

    logger.step('Step 3: Update config and propagate to all services');

    logger.command('setData /demo-ecommerce/config/pricing_algorithm "dynamic_v2"');
    await client.setData(`${basePath}/pricing_algorithm`, Buffer.from('dynamic_v2'));
    await new Promise((resolve, reject) => {
      const zkClient = client.getClient();
      zkClient.getData(`${basePath}/pricing_algorithm`, (event) => {
        if (event.type === 'changed') {
          resolve();
        } else {
          reject(new Error('Unexpected event type'));
        }
      }, () => {});
    });

    logger.assert(service1.getConfig('pricing_algorithm') === 'dynamic_v2', 'Service 1 updated');
    logger.assert(service2.getConfig('pricing_algorithm') === 'dynamic_v2', 'Service 2 updated');
    logger.assert(service3.getConfig('pricing_algorithm') === 'dynamic_v2', 'Service 3 updated');
    logger.success('All services updated without restart!');
    logger.production('Real-time config propagation enables feature flags, A/B tests, emergency changes\n');

    logger.step('Step 4: Versioned updates with optimistic locking');

    const stat1 = await client.exists(`${basePath}/discount_threshold`);
    logger.command(`exists /demo-ecommerce/config/discount_threshold`, `version=${stat1?.version}`);

    await client.setData(
      `${basePath}/discount_threshold`,
      Buffer.from('75.00'),
      stat1!.version
    );
    logger.command(`setData /demo-ecommerce/config/discount_threshold "75.00" version=${stat1?.version}`);
    logger.success('Update succeeded with correct version');

    try {
      await client.setData(
        `${basePath}/discount_threshold`,
        Buffer.from('100.00'),
        stat1!.version
      );
      logger.assert(false, 'Should have failed with bad version');
    } catch (error: any) {
      logger.assert(error.name === 'BAD_VERSION', 'Update rejected with stale version');
      logger.success('Optimistic locking prevents concurrent update conflicts');
    }

    logger.production('Use version numbers to prevent lost updates from concurrent clients\n');

    logger.step('Step 5: Toggle maintenance mode instantly');

    logger.command('setData /demo-ecommerce/config/maintenance_mode "true"');
    await client.setData(`${basePath}/maintenance_mode`, Buffer.from('true'));
    await new Promise((resolve, reject) => {
      const zkClient = client.getClient();
      zkClient.getData(`${basePath}/maintenance_mode`, (event) => {
        if (event.type === 'changed') {
          resolve();
        } else {
          reject(new Error('Unexpected event type'));
        }
      }, () => {});
    });

    logger.assert(service2.getConfig('maintenance_mode') === 'true', 'Checkout service sees maintenance mode');
    logger.success('Emergency maintenance mode activated across all services instantly');

    logger.command('setData /demo-ecommerce/config/maintenance_mode "false"');
    await client.setData(`${basePath}/maintenance_mode`, Buffer.from('false'));
    await new Promise((resolve) => setTimeout(resolve, 200));

    logger.success('Maintenance mode deactivated');
    logger.production('ZooKeeper enables instant system-wide switches without deploys\n');

    // Cleanup
    await client.deleteRecursive('/demo-ecommerce');

    logger.success('\n✓ Configuration management demonstrated: real-time updates, versioning, instant propagation!');
    logger.info('\nKey takeaway: ZooKeeper for dynamic runtime config, env vars for static deployment config');
  },
};