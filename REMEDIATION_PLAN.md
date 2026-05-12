# Remediation Plan - Test Failures & Infrastructure Issues
**Date**: May 12, 2026  
**Reference**: TEST_RESULTS_SUMMARY.md

## Overview

This plan addresses 2 critical infrastructure failures and 1 future compatibility issue affecting the hello-interview-practice test suite.

**Current Status**: 6/8 technologies passing (75%)  
**Target**: 8/8 technologies passing (100%)

---

## Priority 1: Fix Kafka Container Restart Loop (HIGH)

### Problem
- Kafka container stuck in restart loop with exit code 137
- All Kafka tests failing with connection refused
- Exit code 137 indicates SIGKILL (likely OOM killer or resource constraint)

### Root Cause Analysis
Exit code 137 can be caused by:
1. Out of Memory (OOM) - Docker container exceeds memory limits
2. SIGKILL from host system
3. Docker resource constraints
4. Corrupted Kafka state/logs

### Investigation Steps
```bash
# 1. Check Docker logs for OOM or errors
docker logs system-design-kafka --tail 200

# 2. Check Docker resource usage
docker stats system-design-kafka --no-stream

# 3. Inspect container configuration
docker inspect system-design-kafka | grep -A 10 Memory

# 4. Check disk space for Kafka volumes
docker volume ls | grep kafka
df -h
```

### Solution Options

#### Option A: Increase Memory Limits (RECOMMENDED)
**When to use**: If logs show OOM or memory pressure

1. Check current memory limits in `docker-compose.yml`:
```yaml
kafka:
  mem_limit: ???  # Check current value
```

2. Increase memory allocation:
```yaml
kafka:
  mem_limit: 2g  # Increase from current (likely 512m or 1g)
  mem_reservation: 1g
```

3. Apply changes:
```bash
docker-compose down
docker-compose up -d kafka
docker logs -f system-design-kafka  # Monitor startup
```

#### Option B: Clean Kafka State and Restart
**When to use**: If corrupted state or logs are causing issues

```bash
# 1. Stop and remove container
docker-compose stop kafka
docker-compose rm -f kafka

# 2. Remove Kafka volumes (WARNING: deletes data)
docker volume ls | grep kafka
docker volume rm <kafka-volume-name>

# 3. Recreate from scratch
docker-compose up -d kafka

# 4. Wait for healthy status
docker ps | grep kafka
```

#### Option C: Check ZooKeeper Connection
**When to use**: If Kafka logs show ZooKeeper connection issues

```bash
# 1. Verify ZooKeeper is accessible from Kafka
docker exec system-design-kafka bash -c "nc -zv system-design-zookeeper 2181"

# 2. Check ZooKeeper logs for connection errors
docker logs system-design-zookeeper --tail 100 | grep -i error

# 3. Restart Kafka with clean connection
docker-compose restart kafka
```

#### Option D: Update Kafka Configuration
**When to use**: If default settings are incompatible

Edit `docker-compose.yml`:
```yaml
kafka:
  environment:
    - KAFKA_HEAP_OPTS=-Xmx1G -Xms512M  # Adjust heap size
    - KAFKA_LOG_RETENTION_HOURS=24     # Reduce retention
    - KAFKA_LOG_SEGMENT_BYTES=104857600 # Limit segment size
```

### Testing & Validation
```bash
# 1. Verify Kafka is running and healthy
docker ps | grep kafka
# Expected: "Up X seconds (healthy)"

# 2. Test connectivity
docker exec system-design-kafka kafka-topics --list --bootstrap-server localhost:9092

# 3. Run Kafka test suite
npm run test:kafka

# Expected output:
# ✓ Basics: Producer & Consumer
# ✓ Consumer Groups: Parallel Processing
# ✓ Partitions: Ordering & Parallelism
```

### Estimated Time
- Investigation: 15 minutes
- Implementation: 10 minutes
- Testing: 10 minutes
- **Total: 35 minutes**

---

## Priority 2: Fix Elasticsearch RED Cluster Status (MEDIUM)

### Problem
- Elasticsearch cluster status is RED
- 3 unassigned shards (89% active)
- Bulk operations timing out after 60 seconds
- 5/8 tests failing due to timeouts

### Root Cause Analysis
RED status with unassigned shards in single-node cluster typically caused by:
1. Replica count > 0 in single-node cluster (replicas cannot be assigned)
2. Insufficient disk space or resources
3. Index creation with default replica settings

### Investigation Steps
```bash
# 1. Check which shards are unassigned
curl -X GET "localhost:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason"

# 2. Check index settings for replica count
curl -X GET "localhost:9200/_settings?pretty" | grep number_of_replicas

# 3. Check disk space
df -h
docker exec system-design-elasticsearch df -h

# 4. Check cluster allocation explanation
curl -X GET "localhost:9200/_cluster/allocation/explain?pretty"
```

### Solution Options

#### Option A: Set Replica Count to 0 (RECOMMENDED for single-node)
**When to use**: Single-node dev/test environment

```bash
# 1. Update all existing indices to 0 replicas
curl -X PUT "localhost:9200/_all/_settings" \
  -H 'Content-Type: application/json' \
  -d '{"index": {"number_of_replicas": 0}}'

# 2. Set default template for new indices
curl -X PUT "localhost:9200/_template/default_template" \
  -H 'Content-Type: application/json' \
  -d '{
    "index_patterns": ["*"],
    "settings": {
      "number_of_replicas": 0,
      "number_of_shards": 1
    }
  }'

# 3. Verify cluster health
curl -X GET "localhost:9200/_cluster/health?pretty"
# Expected: "status": "green"
```

#### Option B: Increase Request Timeouts
**When to use**: If cluster goes green but timeouts persist

Update Elasticsearch client configuration in test scripts:
```typescript
// In src/technologies/elasticsearch/client.ts or test files
const client = new Client({
  node: 'http://localhost:9200',
  requestTimeout: 120000, // Increase from 60s to 120s
  maxRetries: 3,
});
```

#### Option C: Optimize Bulk Operations
**When to use**: Large bulk inserts timing out

Update bulk insert configuration:
```typescript
await client.bulk({
  refresh: false, // Don't refresh immediately
  operations: bulkOps,
  timeout: '120s',
});

// Refresh manually after all operations
await client.indices.refresh({ index: 'your-index' });
```

#### Option D: Reset Elasticsearch Completely
**When to use**: If cluster is corrupted beyond repair

```bash
# 1. Stop container
docker-compose stop elasticsearch

# 2. Remove volumes (WARNING: deletes all data)
docker volume ls | grep elasticsearch
docker volume rm <elasticsearch-volume-name>

# 3. Update docker-compose.yml to prevent replica issues
# Add to elasticsearch service environment:
#   - "discovery.type=single-node"
#   - "index.number_of_replicas=0"

# 4. Restart
docker-compose up -d elasticsearch

# 5. Wait for healthy status
docker ps | grep elasticsearch
```

### Testing & Validation
```bash
# 1. Verify cluster is GREEN
curl -X GET "localhost:9200/_cluster/health?pretty"
# Expected: "status": "green"

# 2. Verify all shards are assigned
curl -X GET "localhost:9200/_cat/shards?v" | grep -i unassigned
# Expected: No output (no unassigned shards)

# 3. Run full Elasticsearch test suite
npm run test:elasticsearch

# Expected output:
# ✓ Basics: CRUD & Indexing
# ✓ Text Search: Full-Text & Analyzers
# ✓ Relevance Scoring: BM25 & Boosting
# ✓ Aggregations: Analytics & Bucketing
# ✓ Complex Queries: Bool, Nested, Filtering
# ✓ Sorting & Pagination: Result Navigation
# ✓ Geospatial: Location-Based Queries
# ✓ Suggestions: Autocomplete
```

### Estimated Time
- Investigation: 10 minutes
- Implementation: 15 minutes
- Testing: 15 minutes
- **Total: 40 minutes**

---

## Priority 3: Node.js Version Upgrade (LOW - Future)

### Problem
AWS SDK for JavaScript v3 will require Node >=22 after January 2027
- Current: Node v20.11.0
- Required: Node >=22.0.0
- Timeline: ~8 months

### Impact
- DynamoDB tests will break after January 2027
- Warning messages in test output (cosmetic now)
- No immediate functional impact

### Solution

#### Option A: Upgrade Now (RECOMMENDED)
**Pros**: Addresses issue proactively, validates compatibility early  
**Cons**: May require fixing breaking changes in dependencies

```bash
# 1. Install Node 22 (using nvm recommended)
nvm install 22
nvm use 22

# 2. Verify version
node --version
# Expected: v22.x.x

# 3. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 4. Run full test suite
npm run test

# 5. Fix any breaking changes discovered
```

#### Option B: Defer Until Q4 2026
**Pros**: Avoids premature optimization, focuses on current issues  
**Cons**: Risk of forgetting, last-minute scramble

```bash
# Add reminder to project
echo "Upgrade to Node 22 before January 2027" >> TECHNICAL_DEBT.md

# Update package.json engines
{
  "engines": {
    "node": ">=20.11.0", // Update to ">=22.0.0" in Q4 2026
    "npm": ">=10.0.0"
  }
}
```

### Testing & Validation
```bash
# 1. Verify Node version
node --version

# 2. Check for deprecation warnings
npm run test:dynamodb 2>&1 | grep -i warning
# Expected: No AWS SDK warnings

# 3. Run all tests
npm run test
```

### Estimated Time
- Upgrade: 15 minutes
- Testing: 20 minutes
- Fixing issues: 30-60 minutes (if any)
- **Total: 1-2 hours**

---

## Recommended Execution Order

### Phase 1: Infrastructure Fixes (Day 1)
**Goal**: Get all tests passing
**Duration**: ~2 hours

1. ✅ **Fix Kafka** (Priority 1) - 35 minutes
   - Investigate restart loop cause
   - Apply memory limit fix or state cleanup
   - Validate with `npm run test:kafka`

2. ✅ **Fix Elasticsearch** (Priority 2) - 40 minutes
   - Set replica count to 0
   - Verify cluster goes GREEN
   - Validate with `npm run test:elasticsearch`

3. ✅ **Validate All Tests** - 20 minutes
   ```bash
   npm run test:redis
   npm run test:postgres
   npm run test:dynamodb
   npm run test:elasticsearch
   npm run test:kafka
   npm run test:cassandra
   npm run test:zookeeper
   npm run test:flink
   
   # Or run all at once
   npm test
   ```

4. ✅ **Update Documentation** - 15 minutes
   - Update README.md with any configuration changes
   - Document troubleshooting steps
   - Update docker-compose.yml comments if modified

### Phase 2: Node.js Upgrade (Optional - Day 2)
**Goal**: Address future compatibility
**Duration**: ~1-2 hours

1. Upgrade to Node 22
2. Test full suite
3. Fix breaking changes (if any)
4. Update CI/CD pipelines (if applicable)

---

## Docker Compose Configuration Changes

Based on investigation, the following changes may be needed in `docker-compose.yml`:

### Kafka Service
```yaml
kafka:
  image: confluentinc/cp-kafka:7.5.0
  mem_limit: 2g              # ADD: Increase from default
  mem_reservation: 1g        # ADD: Reserve memory
  environment:
    # Existing environment variables...
    - KAFKA_HEAP_OPTS=-Xmx1G -Xms512M  # ADD: Control heap size
```

### Elasticsearch Service
```yaml
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
  environment:
    - discovery.type=single-node  # VERIFY: Should be present
    - xpack.security.enabled=false
    - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    - index.number_of_replicas=0   # ADD: Default to 0 replicas
```

---

## Rollback Plan

If any fixes cause issues:

### Kafka Rollback
```bash
docker-compose stop kafka
git checkout docker-compose.yml  # If modified
docker-compose up -d kafka
```

### Elasticsearch Rollback
```bash
# Remove custom templates
curl -X DELETE "localhost:9200/_template/default_template"

# Restart container
docker-compose restart elasticsearch
```

### Node.js Rollback
```bash
nvm use 20.11.0
rm -rf node_modules package-lock.json
npm install
```

---

## Success Criteria

### Must Have (Phase 1)
- [ ] All 8 technology test suites passing
- [ ] Kafka container stable (no restarts)
- [ ] Elasticsearch cluster status GREEN
- [ ] Zero failed tests in `npm test` output
- [ ] Documentation updated

### Nice to Have (Phase 2)
- [ ] Node v22 installed and working
- [ ] No deprecation warnings
- [ ] CI/CD updated (if applicable)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Kafka fix requires Docker Compose changes | Medium | Low | Test in isolation, git track changes |
| Elasticsearch data loss during reset | Low | Medium | Only affects test data, easy to regenerate |
| Node 22 breaks dependencies | Medium | Medium | Keep Node 20 available via nvm |
| Fixes don't resolve root cause | Low | High | Document investigation steps for escalation |

---

## Dependencies & Prerequisites

- Docker and docker-compose installed and running
- Port access: 9092 (Kafka), 9200 (Elasticsearch)
- Sufficient disk space for Docker volumes (5GB+ recommended)
- Internet access for `npm install` (if dependencies updated)
- Admin/sudo access (may be needed for Docker commands)

---

## Monitoring & Validation

After fixes are applied, monitor:

```bash
# 1. Docker container health (run every hour for 24h)
docker ps --format "table {{.Names}}\t{{.Status}}"

# 2. Test suite health (run daily)
npm test 2>&1 | tee test-results-$(date +%Y%m%d).log

# 3. Elasticsearch cluster health (automated)
curl -s "localhost:9200/_cluster/health" | jq -r '.status'
# Should always return: green

# 4. Kafka connectivity (automated)
docker exec system-design-kafka kafka-broker-api-versions \
  --bootstrap-server localhost:9092 > /dev/null 2>&1
echo $? # Should return: 0
```

---

## Next Steps

1. **Immediate**: Execute Phase 1 to fix infrastructure issues
2. **This week**: Verify stability over 3-5 days of testing
3. **Q4 2026**: Plan Node.js upgrade to v22
4. **January 2027**: Complete Node.js upgrade before AWS SDK cutoff

---

## References

- TEST_RESULTS_SUMMARY.md - Detailed test results and error logs
- docker-compose.yml - Service configuration
- Kafka troubleshooting: https://kafka.apache.org/documentation/#troubleshooting
- Elasticsearch cluster health: https://www.elastic.co/guide/en/elasticsearch/reference/current/cluster-health.html
- Node.js releases: https://nodejs.org/en/about/previous-releases
