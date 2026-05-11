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

### Config Change Monitoring

Monitor config changes for auditing:
```typescript
zk.getData('/config/maintenance_mode', (event) => {
  audit.log({
    action: 'CONFIG_CHANGE',
    key: 'maintenance_mode',
    timestamp: Date.now(),
    user: getCurrentUser()
  });
});
```

## When NOT to Use ZooKeeper

### Use Environment Variables When:
- Config is static per deployment
- No need for runtime changes
- Following 12-factor app principles
- Deploying to Kubernetes (ConfigMaps)

### Use Cloud Config Services When:
- **AWS:** Parameter Store, AppConfig
- **Azure:** App Configuration
- **GCP:** Secret Manager, Runtime Config

Benefits:
- Fully managed (no ops)
- Native IAM integration
- Built-in versioning and rollback
- Audit logging included

### Use Database When:
- Per-tenant configuration
- Complex config structure
- Need for queries/filtering
- Large configuration datasets

## Alternatives Comparison

| Feature | ZooKeeper | Env Vars | AWS Parameter Store | Consul |
|---------|-----------|----------|---------------------|--------|
| Runtime changes | Yes | No | Yes | Yes |
| Watches/push | Yes | No | Poll | Yes |
| Versioning | Basic | No | Full | Yes |
| Ops complexity | High | None | None | Medium |
| Best for | Apache ecosystem | Static config | AWS apps | Service mesh |

## Interview Tips

When discussing configuration management:

1. **Distinguish static vs dynamic config:**
   - Static: Environment variables, baked into images
   - Dynamic: ZooKeeper, Parameter Store, Consul

2. **Mention validation:**
   - Never blindly accept config changes
   - Validate before storing and on read

3. **Discuss alternatives:**
   - For cloud: use native solutions (Parameter Store)
   - For K8s: use ConfigMaps
   - ZooKeeper mainly when already in stack

4. **Explain watch pattern:**
   - Services maintain local cache
   - Watches trigger cache invalidation
   - Reduces ZooKeeper query load

## Common Interview Questions

**Q: ZooKeeper vs environment variables for configuration?**  
A: Env vars for static deployment config, ZooKeeper for dynamic runtime config. Env vars require redeployment to change; ZooKeeper enables instant propagation without restarts.

**Q: How do you handle config validation?**  
A: Validate on write (reject invalid config) and on read (defensive). Store schema version with config to handle migrations.

**Q: What if ZooKeeper is down?**  
A: Services cache config locally and continue with last known good config. Watches don't fire but services remain operational. This is why ZooKeeper should be highly available (3-5 node ensemble).

**Q: When would you use AWS Parameter Store instead?**  
A: For cloud-native apps, Parameter Store is better: fully managed, no ops, native IAM, built-in audit logging. Use ZooKeeper only if already in stack (Kafka, HBase) or need cross-cloud portability.

## Further Reading

- [Configuration Management Patterns](https://www.oreilly.com/library/view/site-reliability-engineering/9781491929117/ch03.html)
- [12-Factor Config](https://12factor.net/config)