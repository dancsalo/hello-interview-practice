import type { Logger, ZooKeeperExample } from '../../../../lib/types.js';
import { ZooKeeperClient, CreateMode } from '../../client.js';

export const sessionManagementExample: ZooKeeperExample = {
  name: 'Session Management',
  description: 'Understanding session lifecycle, timeouts, and reconnection',

  async run(client: ZooKeeperClient, logger: Logger): Promise<void> {
    logger.section('⏱️  Session Management: Lifecycle and Recovery');
    logger.info('Understanding how ZooKeeper maintains client sessions\n');

    const basePath = '/demo-session-management';
    await client.ensurePath(basePath);

    logger.step('Step 1: Session establishment and properties');

    const zkClient = client.getClient();
    const sessionId = zkClient.getSessionId();
    const sessionTimeout = zkClient.getSessionTimeout();

    logger.command('getSessionId()', sessionId.toString('hex'));
    logger.command('getSessionTimeout()', `${sessionTimeout}ms`);
    logger.info('Session established with unique ID and timeout\n');

    logger.production(
      'Session timeout determines how long ZooKeeper waits before declaring client dead\n'
    );

    logger.step('Step 2: Session state transitions');

    const states: string[] = [];

    zkClient.on('state', (state) => {
      states.push(state.name);
      logger.info(`Session state: ${state.name}`);
    });

    logger.command('Monitoring session state transitions');
    logger.info('States: CONNECTED, DISCONNECTED, EXPIRED, etc.');
    logger.production('Connection loss ≠ session expiration (critical distinction)\n');

    logger.step('Step 3: Ephemeral nodes and session lifecycle');

    const ephemeralPath = await client.create(
      `${basePath}/ephemeral-node`,
      Buffer.from('session-dependent-data'),
      CreateMode.EPHEMERAL
    );
    logger.command('create /demo-session-management/ephemeral-node EPHEMERAL');
    logger.command('created', ephemeralPath);

    const exists = await client.exists(ephemeralPath);
    logger.assert(exists !== null, 'Ephemeral node exists while session active');
    logger.production('Ephemeral nodes live as long as session lives\n');

    logger.step('Step 4: Watches and session lifecycle');

    let watchFired = false;
    zkClient.getData(`${basePath}/ephemeral-node`, (event) => {
      logger.info(`\n🔔 Watch event: ${event.name}`);
      watchFired = true;
    }, () => {});

    logger.command('Set watch on ephemeral node');

    // Simulate watch trigger
    await client.setData(ephemeralPath, Buffer.from('updated-data'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    logger.assert(watchFired, 'Watch triggered on data change');
    logger.production('Watches survive connection loss but not session expiration\n');

    logger.step('Step 5: Session timeout configuration impact');

    logger.info('Session timeout scenarios:\n');

    logger.command('Short timeout (5-10s)');
    logger.info('  ✅ Fast failure detection');
    logger.info('  ✅ Quick cleanup of crashed clients');
    logger.info('  ❌ False positives on network blips');
    logger.info('  ❌ Client must reconnect quickly\n');

    logger.command('Medium timeout (10-30s) [RECOMMENDED]');
    logger.info('  ✅ Balance between detection speed and stability');
    logger.info('  ✅ Tolerates brief network issues');
    logger.info('  ✅ Reasonable cleanup latency\n');

    logger.command('Long timeout (30-60s)');
    logger.info('  ✅ Very stable, few false positives');
    logger.info('  ❌ Slow failure detection');
    logger.info('  ❌ Delayed cleanup of resources\n');

    logger.production('Typical production timeout: 10-20 seconds\n');

    logger.step('Step 6: Connection loss vs session expiration');

    logger.info('Critical distinction:\n');

    logger.command('CONNECTION LOSS:');
    logger.info('  • Client temporarily disconnected from ZooKeeper');
    logger.info('  • Session still valid (heartbeats may resume)');
    logger.info('  • Ephemeral nodes remain');
    logger.info('  • Watches remain active');
    logger.info('  • Client can reconnect and continue\n');

    logger.command('SESSION EXPIRATION:');
    logger.info('  • No heartbeat received within session timeout');
    logger.info('  • Session permanently invalid');
    logger.info('  • All ephemeral nodes deleted');
    logger.info('  • All watches cleared');
    logger.info('  • Must create new session\n');

    logger.production('Connection loss is temporary; session expiration is permanent\n');

    logger.step('Step 7: Session recovery pattern');

    logger.info('Best practice for robust clients:\n');

    logger.command('Session recovery pseudocode:');
    logger.info(`
class RobustClient {
  async connect() {
    this.zk = createClient();

    this.zk.on('connected', () => {
      this.onConnected();
    });

    this.zk.on('disconnected', () => {
      this.onDisconnected(); // Log, monitor, but don't panic
    });

    this.zk.on('expired', () => {
      this.onExpired(); // Re-establish everything
    });
  }

  async onExpired() {
    // Session expired - must re-establish state
    await this.reconnect();
    await this.reRegisterEphemeralNodes();
    await this.reSetWatches();
    await this.reloadData();
  }
}
    `.trim());

    logger.production('\nAlways handle session expiration with full re-initialization\n');

    logger.step('Step 8: Monitoring session health');

    logger.info('Production monitoring metrics:\n');

    logger.command('Session metrics to track:');
    logger.info('  • Session expiration rate (should be near zero)');
    logger.info('  • Connection loss frequency');
    logger.info('  • Reconnection latency');
    logger.info('  • Session timeout value');
    logger.info('  • Number of active sessions per client\n');

    logger.command('Red flags:');
    logger.info('  • Frequent session expirations → timeout too short');
    logger.info('  • Long-lived disconnections → network issues');
    logger.info('  • Many active sessions → connection leak\n');

    logger.production('Monitor session health to detect infrastructure problems early\n');

    logger.step('Step 9: Session timeout tuning guidelines');

    logger.info('Factors to consider:\n');

    logger.command('Network stability:');
    logger.info('  • Stable network → shorter timeout acceptable');
    logger.info('  • Flaky network → longer timeout needed\n');

    logger.command('Failure detection requirements:');
    logger.info('  • Leader election → faster failover = shorter timeout');
    logger.info('  • Service discovery → moderate timeout okay\n');

    logger.command('GC pauses:');
    logger.info('  • Long GC pauses can cause false expirations');
    logger.info('  • Tune timeout > max GC pause time\n');

    logger.production('Start with 20s timeout and adjust based on monitoring\n');

    // Cleanup
    await client.deleteRecursive(basePath);

    logger.success('\n✓ Session management demonstrated: lifecycle, recovery, timeout tuning!');
    logger.info(
      '\nKey takeaway: Connection loss is temporary, session expiration is permanent - handle differently!'
    );
  },
};
