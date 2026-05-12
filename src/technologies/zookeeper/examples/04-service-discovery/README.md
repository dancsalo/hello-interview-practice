# Service Discovery with ZooKeeper

## What This Demonstrates

- Service registration with ephemeral + sequential nodes
- Discovering available service instances
- Automatic deregistration on failure
- Watch-based service availability updates
- Client-side load balancing

## Why This Matters

Service discovery enables:
- Dynamic scaling (add/remove instances without config changes)
- Automatic failover (crashed instances removed automatically)
- Load balancing (clients select from available instances)
- Zero-downtime deployments

## How It Works

### Registration Pattern

```
/services/
  /video-transcoder/
    /instance-0000000001  → {"host": "10.0.0.1", "port": 8080}
    /instance-0000000002  → {"host": "10.0.0.2", "port": 8080}
  /recommendation-engine/
    /instance-0000000001  → {"host": "10.0.1.1", "port": 9000}
```

**Why ephemeral + sequential?**
- **Ephemeral:** Auto-cleanup on crash
- **Sequential:** Unique instance IDs

### Service Registration

```typescript
// Service instance registers itself on startup
const metadata = {
  host: '10.0.0.1',
  port: 8080,
  capacity: 10,
  version: '2.1.0'
};

const path = await zk.create(
  '/services/my-service/instance-',
  Buffer.from(JSON.stringify(metadata)),
  CreateMode.EPHEMERAL_SEQUENTIAL
);
// Creates: /services/my-service/instance-0000000001
```

### Service Discovery

```typescript
// Client discovers available instances
const children = await zk.getChildren('/services/my-service');
const instances = [];

for (const child of children) {
  const data = await zk.getData(`/services/my-service/${child}`);
  instances.push(JSON.parse(data.toString()));
}

// Select instance (round-robin, random, least-loaded, etc.)
const instance = selectInstance(instances);
```

### Failure Detection

When service crashes:
1. ZooKeeper session expires (typically 10-30 seconds)
2. Ephemeral node automatically deleted
3. Watching clients notified via watches
4. Clients refresh their instance list

## Production Considerations

### Session Timeout Configuration

**Trade-off:**
- **Short timeout (5-10s):** Fast failure detection, but false positives on network blips
- **Long timeout (30-60s):** Fewer false positives, but slow detection

**Recommendation:** 10-20 seconds for most use cases

### Heartbeat vs Session

ZooKeeper uses **session heartbeats** (not application-level):
- Client library sends heartbeats automatically
- No need for explicit health check loop
- Session expires if no heartbeat received

### Metadata to Include

**Essential:**
- Host and port
- Protocol (HTTP, gRPC, etc.)

**Useful:**
- Current capacity/load
- Version (for gradual rollouts)
- Health status
- Geographic region

### Watch Storms

**Problem:** 1,000 clients watching `/services/popular-service` → all notified simultaneously on change

**Mitigation:**
- Jittered re-registration (add random delay)
- Hierarchical paths (shard by region)
- Rate limit service registry queries

### Load Balancing Strategies

**Random:** Simple, works well for uniform instances
```typescript
instances[Math.floor(Math.random() * instances.length)]
```

**Round-robin:** Fair distribution
```typescript
instances[counter++ % instances.length]
```

**Least-loaded:** Check capacity metadata
```typescript
instances.reduce((best, current) =>
  current.load < best.load ? current : best
)
```

**Locality-aware:** Prefer same-region instances
```typescript
instances.filter(i => i.region === myRegion)[0] || instances[0]
```

## When NOT to Use ZooKeeper

### Use DNS When:
- Simple setup (A/AAAA records)
- Infrequent changes
- Standard load balancers sufficient
- No need for metadata

### Use Kubernetes Services When:
- Already on Kubernetes
- Built-in load balancing
- Native integration
- Zero operational overhead

### Use Consul When:
- Need health checks (HTTP, TCP probes)
- Service mesh requirements
- Multi-datacenter support
- Modern API (HTTP/JSON)

### Use AWS Service Discovery When:
- AWS-native architecture
- Integrated with ECS/EKS
- Managed offering (no ops)
- Built-in health checks

## Alternatives Comparison

| Feature | ZooKeeper | Consul | K8s Services | AWS Service Discovery | etcd |
|---------|-----------|--------|--------------|----------------------|------|
| Health checks | Session-based | HTTP/TCP probes | Pod liveness | ECS/Route53 | TTL-based |
| API | Java-native | HTTP/JSON | K8s API | AWS API | gRPC/HTTP |
| Ops complexity | High | Medium | None | None | Medium |
| Metadata | Yes | Yes | Limited | Limited | Yes |
| Best for | Apache ecosystem | Service mesh | Kubernetes | AWS | Cloud-native |

## Interview Tips

When discussing service discovery:

1. **Distinguish registration vs discovery:**
   - Registration: Services announce themselves
   - Discovery: Clients find available services

2. **Explain automatic cleanup:**
   - Ephemeral nodes = automatic deregistration
   - No manual cleanup needed on crash

3. **Mention alternatives:**
   - For K8s: use Services
   - For AWS: use Service Discovery
   - ZooKeeper: mainly for Apache ecosystem

4. **Discuss session timeout trade-off:**
   - Shows understanding of failure detection vs false positives

## Common Interview Questions

**Q: How does ZooKeeper detect service failures?**  
A: Via session heartbeats. Client library sends periodic heartbeats. If ZooKeeper doesn't receive heartbeat within session timeout (typically 10-30s), session expires and ephemeral nodes are deleted. Watching clients are notified automatically.

**Q: What's the advantage of ZooKeeper over DNS for service discovery?**  
A: ZooKeeper provides faster updates (watch notifications vs DNS TTL), metadata storage (capacity, version), and automatic cleanup on failure. DNS is simpler but less dynamic.

**Q: When would you use Consul instead of ZooKeeper?**  
A: Consul for service mesh architectures, active health checks (HTTP/TCP probes), multi-datacenter setups, and modern HTTP API. ZooKeeper mainly when already in stack (Kafka, HBase).

**Q: How do you handle watch storms with popular services?**  
A: Jittered delays on watch re-registration, hierarchical paths to shard watches, client-side caching with TTL, or switch to pub/sub system like Kafka for high-volume notifications.

## Further Reading

- [Service Discovery Patterns](https://microservices.io/patterns/service-registry.html)
- [Consul vs ZooKeeper](https://www.consul.io/docs/intro/vs/zookeeper)
- Original guide: `/key_technologies/zookeeper/original.md` - "Service Discovery" section
