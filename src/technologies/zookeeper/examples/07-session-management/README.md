# Session Management in ZooKeeper

## What This Demonstrates

- Session lifecycle and state transitions
- Connection loss vs session expiration (critical distinction!)
- Session timeout configuration and trade-offs
- Ephemeral nodes and watches tied to sessions
- Session recovery patterns for robust clients
- Monitoring and debugging session issues

## Why This Matters

Understanding sessions is critical for:
- Preventing unexpected ephemeral node deletion
- Handling network partitions correctly
- Configuring appropriate timeouts
- Building robust production clients
- Debugging distributed coordination issues

## How It Works

### Session Lifecycle

```
Client                    ZooKeeper Ensemble
  |                             |
  |--- Connect ------------->   |  Session ID assigned
  |<-- SessionId + Timeout ---|  Timeout negotiated
  |                             |
  |=== Heartbeats ==========>   |  Maintain session
  |                             |
  |--- Disconnect --------->    |  Connection lost
  |                             |  (Session still valid)
  |                             |
  |--- Reconnect ----------->   |  Session continues
  |<-- Reconnected ----------|  
  |                             |
  |  (No heartbeat for timeout) |
  |                             |  Session expired
  |<-- Expired Event ---------|  Ephemeral nodes deleted
  |                             |
```

### State Transitions

**CONNECTING:** Initial connection attempt  
**CONNECTED:** Session established, operations allowed  
**DISCONNECTED:** Connection lost, session still valid  
**EXPIRED:** Session timeout reached, session invalid  
**CLOSED:** Client explicitly closed connection

### Heartbeat Mechanism

- Client library sends heartbeats automatically (not application's responsibility)
- Heartbeat interval typically 1/3 of session timeout
- Example: 30s timeout → heartbeats every 10s
- If ZooKeeper receives no heartbeat within timeout → session expires

## Connection Loss vs Session Expiration

### Connection Loss (DISCONNECTED)

**What happens:**
- Client loses network connection to ZooKeeper
- Session remains valid (ZooKeeper hasn't timed it out)
- Client library attempts reconnection automatically

**Effects:**
- Ephemeral nodes remain
- Watches remain active
- Operations blocked until reconnection
- Client can resume where it left off

**Duration:** Temporary (seconds to minutes)

**Example scenario:** Network blip, server restart, load balancer failover

### Session Expiration (EXPIRED)

**What happens:**
- No heartbeat received within session timeout
- ZooKeeper declares session dead
- Client must create new session

**Effects:**
- All ephemeral nodes deleted immediately
- All watches cleared permanently
- Client must re-establish state
- New session ID assigned

**Duration:** Permanent (cannot recover old session)

**Example scenario:** Long GC pause, prolonged network partition, client crash

## Production Considerations

### Session Timeout Tuning

**Too short (< 5s):**
- ❌ False expirations from brief network issues
- ❌ False expirations from GC pauses
- ❌ Client must reconnect very quickly
- ✅ Fast failure detection

**Recommended (10-30s):**
- ✅ Balances detection speed and stability
- ✅ Tolerates brief network glitches
- ✅ Reasonable for most use cases
- ✅ Survives typical GC pauses

**Too long (> 60s):**
- ❌ Slow failure detection
- ❌ Resources held longer after crashes
- ✅ Very stable, few false positives

**Rule of thumb:** Start with 20s and adjust based on monitoring

### Factors Affecting Timeout Choice

**Network stability:**
```
Stable datacenter network → 10-15s
Cross-region WAN → 20-30s
Unreliable network → 30-60s
```

**Failure detection requirements:**
```
Leader election (fast failover needed) → 10-15s
Service discovery (moderate okay) → 15-30s
Configuration management (slow okay) → 20-40s
```

**GC characteristics:**
```
Low-latency JVM (G1GC) → 10-20s
Potential long GC pauses → 30-60s
Timeout must exceed max GC pause
```

### Robust Client Pattern

```typescript
class RobustZooKeeperClient {
  private zk: ZooKeeper;
  private sessionExpired = false;

  async connect() {
    this.zk = createClient(connectionString, {
      sessionTimeout: 20000
    });

    this.zk.on('connected', () => {
      console.log('Connected to ZooKeeper');
      this.sessionExpired = false;
    });

    this.zk.on('disconnected', () => {
      console.warn('Disconnected from ZooKeeper (session still valid)');
      // Don't panic - automatic reconnection will happen
    });

    this.zk.on('expired', async () => {
      console.error('Session expired - re-establishing state');
      this.sessionExpired = true;
      await this.handleSessionExpiration();
    });

    await this.waitForConnection();
  }

  private async handleSessionExpiration() {
    // Session expired - must rebuild everything
    await this.connect(); // New session
    await this.reRegisterEphemeralNodes();
    await this.reSetAllWatches();
    await this.reloadCachedData();
  }

  private async reRegisterEphemeralNodes() {
    // Re-create ephemeral nodes (e.g., service registration)
    for (const node of this.ephemeralNodes) {
      await this.zk.create(node.path, node.data, CreateMode.EPHEMERAL);
    }
  }

  private async reSetAllWatches() {
    // Re-register watches (they don't survive expiration)
    for (const path of this.watchedPaths) {
      await this.zk.getData(path, this.watchCallback);
    }
  }
}
```

### Monitoring Session Health

**Key metrics:**

```typescript
// Prometheus-style metrics
zookeeper_sessions_active gauge
zookeeper_session_expirations_total counter
zookeeper_disconnections_total counter
zookeeper_reconnection_latency_seconds histogram
zookeeper_session_timeout_seconds gauge
```

**Alerts to set up:**
- Session expiration rate > 0.01/min → Timeout too short or infrastructure issues
- Connection loss rate > 1/min → Network problems
- Reconnection latency > 5s → ZooKeeper overloaded

### Common Session Issues

**Problem:** Frequent session expirations  
**Causes:**
- Session timeout too short
- Network instability
- Long GC pauses
- ZooKeeper overload

**Solution:**
- Increase timeout (20s → 30s)
- Improve network reliability
- Tune GC settings
- Scale ZooKeeper ensemble

**Problem:** Ephemeral nodes disappearing unexpectedly  
**Cause:** Session expired (not just disconnected)  
**Solution:**
- Monitor session state transitions
- Implement robust reconnection handler
- Increase timeout if needed

**Problem:** Watches not firing  
**Cause:** Session expired (watches cleared)  
**Solution:**
- Re-register watches after expiration
- Check session state before assuming watch is active

## When to Use Long Sessions

**Use long timeout (30-60s) when:**
- Failure detection speed less critical
- Network is unreliable
- GC pauses are long or unpredictable
- False positives are expensive

**Use short timeout (10-15s) when:**
- Fast failover required (leader election)
- Network is very stable
- GC is well-tuned
- False negatives worse than false positives

## Interview Tips

When discussing sessions:

1. **Distinguish connection loss vs expiration:**
   - Connection loss: Temporary, session survives
   - Expiration: Permanent, ephemeral nodes deleted
   - Critical distinction for interviews

2. **Explain timeout trade-off:**
   - Too short: False failures
   - Too long: Slow detection
   - Shows understanding of distributed systems

3. **Mention heartbeat mechanism:**
   - Client library handles automatically
   - Typically timeout / 3 interval
   - Shows depth of knowledge

4. **Discuss recovery pattern:**
   - Must re-establish state after expiration
   - Re-register ephemeral nodes and watches
   - Shows production awareness

## Common Interview Questions

**Q: What's the difference between connection loss and session expiration?**  
A: Connection loss is temporary - client disconnected but session still valid, ephemeral nodes remain, watches stay active. Session expiration is permanent - no heartbeat within timeout, session invalid, all ephemeral nodes deleted, all watches cleared. Client can reconnect after connection loss but must create new session after expiration.

**Q: How does ZooKeeper detect client failures?**  
A: Client sends periodic heartbeats (managed by client library, not application). If ZooKeeper receives no heartbeat within session timeout period (typically 10-30s), it declares session expired, deletes all ephemeral nodes, and clears watches.

**Q: How do you choose session timeout?**  
A: Balance failure detection speed vs false positives. Start with 20s. Increase if: network unreliable, long GC pauses, false expirations occurring. Decrease if: faster failover needed, stable network, low GC pause times. Timeout must exceed max GC pause.

**Q: What happens to ephemeral nodes during connection loss?**  
A: They remain intact as long as session hasn't expired. Connection loss doesn't delete ephemeral nodes - only session expiration does. This is why timeout tuning is critical.

**Q: How do you handle session expiration in production?**  
A: Listen for 'expired' event, create new session, re-register all ephemeral nodes (service registrations, locks), re-set all watches, reload any cached data. Essentially rebuild entire client state from scratch.

## Session Guarantees

ZooKeeper provides these session guarantees:

1. **FIFO Client Order:** Operations from single client executed in order sent
2. **Atomicity:** Operations either complete fully or not at all
3. **Single System Image:** Client sees same view regardless of which server it connects to
4. **Reliability:** Applied operations persist until overwritten by later operation
5. **Timeliness:** Client view guaranteed up-to-date within timeout period

## Further Reading

- [ZooKeeper Sessions](https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html#ch_zkSessions)
- [Session Management Best Practices](https://www.oreilly.com/library/view/zookeeper/9781449361297/)
- Original guide: `/key_technologies/zookeeper/original.md` - "Session Management" section
