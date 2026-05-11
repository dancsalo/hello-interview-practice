import type { Logger, ZooKeeperExample } from '../../../../lib/types.js';
import { ZooKeeperClient, CreateMode } from '../../client.js';

export const basicsExample: ZooKeeperExample = {
  name: 'Basics: ZNode Fundamentals',
  description: 'Persistent, ephemeral, and sequential nodes with CRUD operations',

  async run(client: ZooKeeperClient, logger: Logger): Promise<void> {
    logger.section('📦 ZooKeeper Basics: ZNode Types and Operations');
    logger.info('Building a chat application namespace\n');

    const basePath = '/demo-chat-app';

    logger.step('Step 1: Create persistent node for configuration');
    await client.create(`${basePath}`, Buffer.from(''), CreateMode.PERSISTENT);
    await client.create(`${basePath}/config`, Buffer.from(''), CreateMode.PERSISTENT);
    await client.create(
      `${basePath}/config/max_users`,
      Buffer.from('10000'),
      CreateMode.PERSISTENT
    );
    logger.command('create /demo-chat-app/config/max_users "10000" PERSISTENT');

    const { data } = await client.getData(`${basePath}/config/max_users`);
    logger.command('getData /demo-chat-app/config/max_users', data.toString());
    logger.assert(data.toString() === '10000', 'Persistent node stores data correctly');
    logger.production('Persistent nodes exist until explicitly deleted - perfect for config\n');

    logger.step('Step 2: Create ephemeral node for server registration');
    await client.create(`${basePath}/servers`, Buffer.from(''), CreateMode.PERSISTENT);
    const serverPath = await client.create(
      `${basePath}/servers/server1`,
      Buffer.from('192.168.1.101:8080'),
      CreateMode.EPHEMERAL
    );
    logger.command('create /demo-chat-app/servers/server1 "192.168.1.101:8080" EPHEMERAL');
    logger.command('created path', serverPath);

    const serverData = await client.getData(serverPath);
    logger.command('getData ' + serverPath, serverData.data.toString());
    logger.assert(
      serverData.data.toString() === '192.168.1.101:8080',
      'Ephemeral node stores server location'
    );
    logger.production(
      'Ephemeral nodes auto-delete when session ends - automatic cleanup on crash\n'
    );

    logger.step('Step 3: Create sequential nodes for message ordering');
    await client.create(`${basePath}/messages`, Buffer.from(''), CreateMode.PERSISTENT);
    const msg1 = await client.create(
      `${basePath}/messages/msg-`,
      Buffer.from('Hello from Alice'),
      CreateMode.PERSISTENT_SEQUENTIAL
    );
    const msg2 = await client.create(
      `${basePath}/messages/msg-`,
      Buffer.from('Hello from Bob'),
      CreateMode.PERSISTENT_SEQUENTIAL
    );
    const msg3 = await client.create(
      `${basePath}/messages/msg-`,
      Buffer.from('Hello from Charlie'),
      CreateMode.PERSISTENT_SEQUENTIAL
    );
    logger.command('create /demo-chat-app/messages/msg- "..." PERSISTENT_SEQUENTIAL');
    logger.command('created paths', `\n  ${msg1}\n  ${msg2}\n  ${msg3}`);

    logger.assert(
      msg1.endsWith('0000000000') && msg2.endsWith('0000000001') && msg3.endsWith('0000000002'),
      'Sequential nodes have monotonically increasing counters'
    );
    logger.production('Sequential nodes ensure ordering - useful for queues and logs\n');

    logger.step('Step 4: Navigate hierarchy with getChildren');
    const children = await client.getChildren(`${basePath}`);
    logger.command('getChildren /demo-chat-app', JSON.stringify(children));
    logger.assert(
      children.includes('config') && children.includes('servers') && children.includes('messages'),
      'Hierarchy navigation works correctly'
    );

    const messages = await client.getChildren(`${basePath}/messages`);
    logger.command('getChildren /demo-chat-app/messages', JSON.stringify(messages));
    logger.assert(messages.length === 3, 'All sequential messages visible');
    logger.production('getChildren returns immediate children only (not recursive)\n');

    logger.step('Step 5: Update data with setData');
    const oldStat = await client.exists(`${basePath}/config/max_users`);
    await client.setData(`${basePath}/config/max_users`, Buffer.from('20000'));
    logger.command('setData /demo-chat-app/config/max_users "20000"');

    const updated = await client.getData(`${basePath}/config/max_users`);
    logger.command('getData /demo-chat-app/config/max_users', updated.data.toString());
    logger.assert(updated.data.toString() === '20000', 'Data updated successfully');
    logger.assert(
      updated.stat.version === (oldStat?.version ?? -1) + 1,
      'Version number incremented'
    );
    logger.production('Version numbers enable optimistic locking (more in config example)\n');

    logger.step('Step 6: Delete nodes');
    await client.remove(`${basePath}/config/max_users`);
    logger.command('remove /demo-chat-app/config/max_users');

    const exists = await client.exists(`${basePath}/config/max_users`);
    logger.command('exists /demo-chat-app/config/max_users', String(exists !== null));
    logger.assert(exists === null, 'Node deleted successfully');

    // Cleanup
    await client.deleteRecursive(basePath);

    logger.success('\n✓ ZNode fundamentals demonstrated: persistent, ephemeral, sequential!');
    logger.info(
      '\nKey takeaway: ZooKeeper is for small coordination data (< 1MB per node), not bulk storage'
    );
  },
};
