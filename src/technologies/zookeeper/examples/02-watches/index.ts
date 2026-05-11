import type { Logger, ZooKeeperExample } from '../../../../lib/types.js';
import { ZooKeeperClient, CreateMode } from '../../client.js';

export const watchesExample: ZooKeeperExample = {
  name: 'Watches: Change Notifications',
  description: 'Data watches, child watches, and one-time trigger behavior',

  async run(client: ZooKeeperClient, logger: Logger): Promise<void> {
    logger.section('👀 ZooKeeper Watches: Reactive Coordination');
    logger.info('Servers watching for config changes and user location updates\n');

    const basePath = '/demo-watches';
    await client.ensurePath(basePath);

    logger.step('Step 1: Set data watch on configuration node');

    await client.create(`${basePath}/config`, Buffer.from('v1'), CreateMode.PERSISTENT);

    let watchFired = false;
    const zkClient = client.getClient();

    logger.command('getData /demo-watches/config [with watch]');
    logger.info('Watch registered - waiting for change...');

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        logger.info('Timeout waiting for watch');
        resolve();
      }, 2000);

      zkClient.getData(`${basePath}/config`, (event) => {
        clearTimeout(timer);
        logger.info(`\n🔔 Watch fired! Event: ${event.name} on ${event.path}`);
        watchFired = true;
        resolve();
      }, () => {});
    });

    logger.command('setData /demo-watches/config "v2"');
    await client.setData(`${basePath}/config`, Buffer.from('v2'));

    logger.assert(watchFired, 'Data watch triggered on setData');
    logger.production(
      'Watches enable reactive coordination without polling - key to scalability\n'
    );

    logger.step('Step 2: Demonstrate one-time trigger behavior');

    watchFired = false;
    logger.command('getData /demo-watches/config [with watch]');

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        logger.info('Timeout waiting for watch');
        resolve();
      }, 2000);

      zkClient.getData(`${basePath}/config`, (event) => {
        clearTimeout(timer);
        logger.info(`\n🔔 Watch fired again! Event: ${event.name}`);
        watchFired = true;
        resolve();
      }, () => {});
    });

    logger.command('setData /demo-watches/config "v3"');
    await client.setData(`${basePath}/config`, Buffer.from('v3'));
    logger.assert(watchFired, 'Watch fired on first update');

    watchFired = false;
    logger.command('setData /demo-watches/config "v4" [watch NOT re-registered]');
    await client.setData(`${basePath}/config`, Buffer.from('v4'));
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        resolve();
      }, 1000);
    });

    logger.assert(!watchFired, 'Watch did NOT fire on second update');
    logger.production('Watches are one-time triggers - must re-register after firing\n');

    logger.step('Step 3: Set child watch on directory');

    await client.create(`${basePath}/servers`, Buffer.from(''), CreateMode.PERSISTENT);

    let childWatchFired = false;
    logger.command('getChildren /demo-watches/servers [with watch]');

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        logger.info('Timeout waiting for child watch');
        resolve();
      }, 2000);

      zkClient.getChildren(`${basePath}/servers`, (event) => {
        clearTimeout(timer);
        logger.info(`\n🔔 Child watch fired! Event: ${event.name} on ${event.path}`);
        childWatchFired = true;
        resolve();
      }, () => {});
    });

    logger.command('create /demo-watches/servers/server1 EPHEMERAL');
    await client.create(
      `${basePath}/servers/server1`,
      Buffer.from('192.168.1.101:8080'),
      CreateMode.EPHEMERAL
    );

    logger.assert(childWatchFired, 'Child watch triggered when child added');
    logger.production('Child watches fire when children are added or removed (not on data changes)\n');

    logger.step('Step 4: Existence watch for node creation');

    let existsWatchFired = false;
    logger.command('exists /demo-watches/future-node [with watch]');
    logger.info('Watch registered for non-existent node...');

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        logger.info('Timeout waiting for exists watch');
        resolve();
      }, 2000);

      zkClient.exists(`${basePath}/future-node`, (event) => {
        clearTimeout(timer);
        logger.info(`\n🔔 Exists watch fired! Event: ${event.name}`);
        existsWatchFired = true;
        resolve();
      }, () => {});
    });

    logger.command('create /demo-watches/future-node');
    await client.create(`${basePath}/future-node`, Buffer.from('data'), CreateMode.PERSISTENT);

    logger.assert(existsWatchFired, 'Exists watch fired when node created');
    logger.production('Exists watches fire on node creation or deletion\n');

    logger.step('Step 5: Local cache + watch pattern');

    const cache = new Map<string, string>();

    async function getCachedData(path: string): Promise<string> {
      if (cache.has(path)) {
        logger.info(`Cache hit for ${path}`);
        return cache.get(path)!;
      }

      logger.info(`Cache miss for ${path} - fetching from ZooKeeper`);
      const { data } = await client.getData(path, false);
      const value = data.toString();
      cache.set(path, value);

      zkClient.getData(path, (event) => {
        logger.info(`\n🔔 Cache invalidation: ${event.path} changed`);
        cache.delete(path);
      }, () => {});

      return value;
    }

    logger.command('Local cache pattern: fetch once, watch for changes');
    const val1 = await getCachedData(`${basePath}/config`);
    logger.command('First read (cache miss)', val1);

    const val2 = await getCachedData(`${basePath}/config`);
    logger.command('Second read (cache hit)', val2);
    logger.assert(val1 === val2, 'Cached value consistent');

    await client.setData(`${basePath}/config`, Buffer.from('v5'));
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        resolve();
      }, 1000);
    });
    logger.info('Config changed - cache invalidated by watch');

    const val3 = await getCachedData(`${basePath}/config`);
    logger.command('Third read (cache miss after invalidation)', val3);
    logger.assert(val3 === 'v5', 'Cache updated with new value');
    logger.production('Local cache + watch pattern minimizes ZooKeeper queries\n');

    // Cleanup
    await client.deleteRecursive(basePath);

    logger.success('\n✓ Watch mechanisms demonstrated: data, child, exists, and caching pattern!');
    logger.info(
      '\nKey takeaway: Watches enable reactive systems without polling - but remember one-time triggers!'
    );
  },
};
