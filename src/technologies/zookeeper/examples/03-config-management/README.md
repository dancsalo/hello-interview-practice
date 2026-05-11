# Configuration Management with ZooKeeper

## What This Demonstrates

- Centralized configuration storage
- Real-time config propagation via watches
- Optimistic locking with version numbers
- Instant system-wide configuration changes
- Multiple services watching same config

## Why This Matters

Dynamic configuration enables:
- Feature flags without redeployment
- A/B testing configurations
- Emergency toggles (maintenance mode)
- Runtime tuning (rate limits, thresholds)

## How It Works

### Configuration Storage Pattern

```
/app-name/config/
  /feature_flags         # JSON object with flags
  /rate_limit           # "100/sec"
  /maintenance_mode     # "true" or "false"
  /pricing_algorithm    # "v1", "v2", etc.
```

### Service Integration

```typescript
class Service {
  private config = new Map();
  
  async loadConfig(path: string) {
    const keys = await zk.getChildren(path);
    for (const key of keys) {
      const data = await zk.getData(`${path}/${key}`);
      this.config.set(key, data);
      
      // Watch for changes
      zk.getData(`${path}/${key}`, (event) => {
        this.reloadConfig(`${path}/${key}`, key);
      });
    }
  }
}
```

### Version-Based Updates

```typescript
// Prevent lost updates
const stat = await zk.exists(path);
await zk.setData(path, newData, stat.version);
// Fails if version changed (someone else updated)
```

## Production Considerations

### What to Store in ZooKeeper

**Good candidates:**
- Feature flags (enable/disable features)
- Rate limits (requests per second)
- Circuit breaker thresholds
- Maintenance mode toggles
- A/B test configurations
- Service endpoints (if not using DNS)

**Bad candidates:**
- Static deployment config (use env vars)
- Secrets (use secrets manager)
- Large datasets (use database)
- High-frequency changes (causes watch storms)

### Update Strategies

**Rolling updates:**
```typescript
// Update one key at a time
await zk.setData('/config/rate_limit', '200');  // Services see change
await delay(5000);  // Wait for propagation
await zk.setData('/config/burst_size', '1000');
```

**Atomic multi-key updates:**
```typescript
// Use versioned parent node
const config = {
  rate_limit: 200,
  burst_size: 1000
};
await zk.setData('/config/bundle', JSON.stringify(config));
// All services see consistent snapshot
```

### Validation

Validate config before storing:
```typescript
async function updateConfig(key: string, value: string) {
  if (!validateConfig(key, value)) {
    throw new Error('Invalid config');
  }
  await zk.setData(`/config/${key}`, value);
}
```

## Config Change Monitoring

Configuration changes in ZooKeeper are monitored through watches, which provide real-time notifications:

```typescript
class ConfigMonitor {
  setupWatch(path: string) {
    zk.getData(path, (event) => {
      if (event.type === 'CHANGED') {
        console.log('Configuration updated');
        this.reloadConfig(path);
      }
    });
  }
}
```

Watches can be set on:
- Individual configuration nodes
- Parent configuration directories
- Recursive watches for comprehensive monitoring

## When NOT to Use ZooKeeper

Despite its powerful configuration management capabilities, ZooKeeper isn't suitable for all scenarios:

**Avoid ZooKeeper When:**
- Handling extremely large configuration datasets
- Requiring complex query capabilities
- Needing persistent, long-term storage
- Managing high-frequency configuration updates
- Dealing with unstructured or complex configuration formats

**Better Alternatives:**
- Large datasets: Use databases like PostgreSQL
- Complex queries: Use document stores like MongoDB
- Secrets management: Use HashiCorp Vault
- High-frequency updates: Consider message queues

## Alternatives Comparison

| Feature | ZooKeeper | etcd | Consul | Redis |
|---------|-----------|------|--------|-------|
| Configuration Storage | Excellent | Good | Excellent | Fair |
| Watch Mechanism | Native | Native | Limited | Limited |
| Consistency | Strong | Strong | Strong | Eventual |
| Performance | Moderate | High | High | Very High |
| Complex Queries | Limited | Limited | Good | Good |

## Interview Tips

**Configuration Management Focus Areas:**
- Understand watch mechanisms
- Explain version-based updates
- Discuss trade-offs of centralized configuration
- Know ZooKeeper's strengths and limitations
- Demonstrate atomic configuration updates

**Key Concepts to Prepare:**
- Distributed configuration patterns
- Real-time configuration propagation
- Consistency in distributed systems
- Optimistic locking strategies
- Service discovery integration

## Common Interview Questions

1. "How does ZooKeeper ensure configuration consistency?"
   - Explain version numbers and optimistic locking
   - Discuss atomic multi-key updates

2. "What makes ZooKeeper different from other configuration management tools?"
   - Highlight watch mechanisms
   - Emphasize strong consistency
   - Discuss leader election and consensus protocols

3. "When would you choose ZooKeeper over alternatives?"
   - Discuss use cases in microservices
   - Explain scenarios requiring real-time updates
   - Compare with other distributed systems

## Further Reading

- ZooKeeper: Distributed Process Management (O'Reilly)
- Apache ZooKeeper Documentation
- Designing Distributed Systems (Martin Kleppmann)
- Distributed Consensus Algorithms