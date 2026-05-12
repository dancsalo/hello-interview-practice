# Test Results Summary - All Technologies
**Date**: May 12, 2026  
**Branch**: main (up to date)

## Executive Summary

| Technology | Status | Tests Passed | Tests Failed | Issues |
|-----------|--------|--------------|--------------|--------|
| Redis | ✅ PASS | 10/10 | 0 | None |
| PostgreSQL | ✅ PASS | 7/7 | 0 | None |
| DynamoDB | ✅ PASS | 1/1 | 0 | Node version warning |
| Cassandra | ✅ PASS | 6/6 | 0 | None |
| ZooKeeper | ✅ PASS | 8/8 | 0 | None |
| Flink | ✅ PASS | 3/3 | 0 | Conceptual only |
| Kafka | ❌ FAIL | 0/? | All | Connection refused |
| Elasticsearch | ❌ FAIL | 3/8 | 5 | Cluster red status, timeouts |

**Overall**: 6/8 technologies passing (75%)

---

## Detailed Results by Technology

### ✅ Redis - FULLY PASSING
**Test Duration**: 1935ms  
**Test File**: `scripts/test-redis-examples.ts`

All 10 examples passing:
1. ✅ Basics: Data Structures (16ms)
2. ✅ Cache: Cache-Aside Pattern (46ms)
3. ✅ Distributed Lock (109ms)
4. ✅ Leaderboards (11ms)
5. ✅ Rate Limiting (353ms)
6. ✅ Proximity Search (17ms)
7. ✅ Event Sourcing (17ms)
8. ✅ Pub/Sub (632ms)
9. ✅ Bloom Filters (683ms)
10. ✅ Time Series (51ms)

**Status**: Production ready ✅

---

### ✅ PostgreSQL - FULLY PASSING
**Test Duration**: 789ms  
**Test File**: `scripts/test-postgres-examples.ts`

All 7 examples passing:
1. ✅ Basics: Core SQL Operations (46ms)
2. ✅ Transactions: ACID & Consistency (39ms)
3. ✅ Indexing: B-tree, Covering, Partial (168ms)
4. ✅ Advanced Indexing: GIN, GiST, Full-Text, JSONB, PostGIS (39ms)
5. ✅ Read Scaling: Replication & Consistency (232ms)
6. ✅ Write Scaling: Partitioning & Batching (105ms)
7. ✅ Query Optimization: EXPLAIN, CTEs, Window Functions (160ms)

**Status**: Production ready ✅

---

### ✅ DynamoDB - FULLY PASSING
**Test Duration**: ~500ms  
**Test File**: `scripts/test-dynamodb-examples.ts`

Passing tests:
1. ✅ Basics: Core Operations

**Warnings**:
```
NodeVersionSupportWarning: The AWS SDK for JavaScript (v3)
versions published after the first week of January 2027
will require node >=22. You are running node v20.11.0.
```

**Status**: Passing with warnings ⚠️  
**Action Required**: Upgrade Node.js to v22+ before January 2027

---

### ✅ Cassandra - FULLY PASSING
**Test Duration**: 3566ms  
**Test File**: `scripts/test-cassandra-examples.ts`

All 6 examples passing:
1. ✅ Basics: Keyspaces, Tables & CQL (654ms)
2. ✅ Primary Key Design: Partition & Clustering Keys (707ms)
3. ✅ Partitioning Strategy: Cardinality & Distribution (445ms)
4. ✅ Replication & Consistency Levels (752ms)
5. ✅ Write-Optimized Architecture: LSM Trees & SSTables (281ms)
6. ✅ Query-Driven Data Modeling: Denormalization (727ms)

**Status**: Production ready ✅

---

### ✅ ZooKeeper - FULLY PASSING
**Test Duration**: 4767ms  
**Test File**: `scripts/test-zookeeper-examples.ts`

All 8 examples passing:
1. ✅ Basics: ZNode Types & Hierarchy
2. ✅ Watches: Event-Driven Coordination
3. ✅ Distributed Lock: Leader Election Pattern
4. ✅ Configuration Management: Dynamic Config Updates
5. ✅ Service Discovery: Registry Pattern
6. ✅ Barrier Pattern: Synchronization Primitive
7. ✅ Queue Pattern: Distributed Queue
8. ✅ Ensemble & Consensus (Conceptual)

**Notes**: 
- Module dependencies were missing initially (node-zookeeper-client)
- Resolved by running `npm install`

**Status**: Production ready ✅

---

### ✅ Flink - FULLY PASSING
**Test Duration**: ~300ms  
**Test File**: `scripts/test-flink-examples.ts`

All 3 examples passing:
1. ✅ Basics: Stream Processing Concepts
2. ✅ Windowing: Time-Based Aggregations
3. ✅ Stateful Processing

**Notes**:
- Phase 1 implementation: Conceptual demonstrations only
- Tests validate explanations and concepts, not actual Flink jobs
- Module dependency missing initially (axios), resolved by `npm install`
- Future phases will include JAR compilation and job execution

**Status**: Conceptual phase complete ✅

---

### ❌ Kafka - FAILING
**Test File**: `scripts/test-kafka-examples.ts`

**Error**:
```
KafkaJSNonRetriableError
Caused by: KafkaJSConnectionError: Connection error: read ECONNRESET
  broker: localhost:9092
  code: ECONNRESET
  retryCount: 5
  retryTime: 8418ms
```

**Root Cause**: Kafka container is in restart loop
- Docker status: `Restarting (137) 14 seconds ago`
- Exit code 137 typically indicates OOM (Out Of Memory) kill or SIGKILL

**Symptoms**:
- Connection refused on localhost:9092
- Container repeatedly restarting
- ZooKeeper is healthy (Kafka depends on ZooKeeper)

**Docker Status**:
```
system-design-kafka    Restarting (137) 14 seconds ago
system-design-zookeeper    Up 19 hours (healthy)
```

**Status**: Infrastructure failure ❌

---

### ❌ Elasticsearch - PARTIALLY FAILING
**Test File**: `scripts/test-elasticsearch-examples.ts`

**Cluster Status**: RED ⚠️
```json
{
  "cluster_name": "docker-cluster",
  "status": "red",
  "timed_out": false,
  "number_of_nodes": 1,
  "number_of_data_nodes": 1,
  "active_primary_shards": 25,
  "active_shards": 25,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 3,
  "delayed_unassigned_shards": 0,
  "active_shards_percent_as_number": 89.28571428571429
}
```

**Passing Tests** (3/8):
1. ✅ Basics: CRUD & Indexing
2. ✅ Text Search: Full-Text & Analyzers
3. ✅ Relevance Scoring: BM25 & Boosting

**Failing Tests** (5/8):
4. ❌ Aggregations: Analytics & Bucketing - **Request timeout (60s+)** on bulk insert
5. ❌ Complex Queries: Bool, Nested, Filtering - **Request timeout (60s+)** on bulk insert
6. ❌ Sorting & Pagination: Result Navigation - **Test interrupted**
7. ❌ Geospatial: Location-Based Queries - **Not reached**
8. ❌ Suggestions: Autocomplete - **Not reached**

**Error Pattern**:
```
TimeoutError: Request timed out
  at SniffingTransport._request
  at Client.BulkApi
  Duration: 60542ms (timeout limit reached)
```

**Root Cause Analysis**:
- Cluster status is RED (3 unassigned shards)
- Bulk operations timing out after 60 seconds
- 89% active shards suggests resource or configuration issue
- Single-node cluster may not meet replication requirements

**Status**: Degraded, partial functionality ⚠️

---

## Infrastructure Issues

### Issue 1: Kafka Container Restart Loop
**Severity**: HIGH - Blocking all Kafka tests  
**Docker Container**: `system-design-kafka`
- Exit code 137 (SIGKILL / OOM)
- Container cannot stay running
- Port 9092 unavailable

### Issue 2: Elasticsearch RED Cluster
**Severity**: MEDIUM - Blocking 5/8 Elasticsearch tests  
**Docker Container**: `system-design-elasticsearch`
- 3 unassigned shards
- Bulk operations timing out
- Single-node cluster with replication requirements mismatch

### Issue 3: Node.js Version Warning
**Severity**: LOW - Not blocking, future compatibility  
**Component**: AWS SDK for JavaScript v3
- Current: Node v20.11.0
- Required (future): Node >=22.0.0
- Timeline: January 2027

### Issue 4: Missing Dependencies (RESOLVED)
**Severity**: RESOLVED ✅
- Missing: axios, node-zookeeper-client
- Resolution: `npm install` completed successfully
- Both ZooKeeper and Flink tests now passing

---

## System Information

**Node Version**: v20.11.0 (npm 10.2.4)  
**Platform**: macOS (Darwin 23.6.0)  
**Docker Compose**: Running 13 containers total  
**Repository**: Clean working tree, main branch up to date

**Healthy Services**:
- ✅ Redis (system-design-redis) - Up 19 hours
- ✅ PostgreSQL (system-design-postgres) - Up 19 hours
- ✅ DynamoDB (system-design-dynamodb) - Up 17 hours (healthy)
- ✅ Cassandra (system-design-cassandra) - Up 17 hours (healthy)
- ✅ ZooKeeper (system-design-zookeeper) - Up 19 hours (healthy)
- ✅ Flink JobManager (system-design-flink-jobmanager) - Up 17 minutes (healthy)

**Unhealthy Services**:
- ❌ Kafka (system-design-kafka) - Restarting (137)
- ⚠️ Elasticsearch (system-design-elasticsearch) - Up 31 minutes (healthy but RED cluster)

---

## Test Execution Commands

All tests can be run via npm scripts:
```bash
npm run test              # Run all tests (will fail due to Kafka/ES issues)
npm run test:redis        # ✅ PASS
npm run test:postgres     # ✅ PASS
npm run test:dynamodb     # ✅ PASS (with warnings)
npm run test:cassandra    # ✅ PASS
npm run test:zookeeper    # ✅ PASS
npm run test:flink        # ✅ PASS
npm run test:kafka        # ❌ FAIL
npm run test:elasticsearch # ❌ PARTIAL (3/8 pass)
```
