# Redis Examples Test Report

**Date:** 2026-05-11  
**Test Duration:** 1753ms  
**Total Examples:** 10  
**Passed:** 8 (80%)  
**Failed:** 2 (20%)

## Executive Summary

Automated testing of all Redis examples revealed 2 failures out of 10 total examples:
1. **Cache-Aside Pattern (Example 02)**: PostgreSQL authentication failure
2. **Time Series (Example 10)**: RedisTimeSeries label parsing error

All other examples (8/10) executed successfully and demonstrated correct functionality.

---

## Test Results Overview

| # | Example Name | Status | Duration | Error |
|---|--------------|--------|----------|-------|
| 01 | Basics: Data Structures | ✅ PASS | 12ms | - |
| 02 | Cache: Cache-Aside Pattern | ❌ FAIL | 14ms | PostgreSQL auth failure |
| 03 | Distributed Lock | ✅ PASS | 114ms | - |
| 04 | Leaderboards | ✅ PASS | 12ms | - |
| 05 | Rate Limiting | ✅ PASS | 340ms | - |
| 06 | Proximity Search | ✅ PASS | 6ms | - |
| 07 | Event Sourcing | ✅ PASS | 16ms | - |
| 08 | Pub/Sub | ✅ PASS | 633ms | - |
| 09 | Bloom Filters | ✅ PASS | 581ms | - |
| 10 | Time Series | ❌ FAIL | 25ms | RedisTimeSeries label parsing |

---

## Failed Examples - Detailed Analysis

### 1. Example 02: Cache-Aside Pattern ❌

**File:** `src/technologies/redis/examples/02-cache/index.ts`

#### Error Message
```
password authentication failed for user "demo"
```

#### Full Stack Trace
```
error: password authentication failed for user "demo"
    at parseErrorMessage (/Users/dsalo/Repos/hello-interview-practice/node_modules/pg-protocol/src/parser.ts:394:9)
    at Parser.handlePacket (/Users/dsalo/Repos/hello-interview-practice/node_modules/pg-protocol/src/parser.ts:212:19)
    at Parser.parse (/Users/dsalo/Repos/hello-interview-practice/node_modules/pg-protocol/src/parser.ts:105:30)
    at Socket.<anonymous> (/Users/dsalo/Repos/hello-interview-practice/node_modules/pg-protocol/src/index.ts:7:48)
```

#### Root Cause Analysis

**Connection Configuration (lines 14-20):**
```typescript
const pgClient = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'demo',
  password: process.env.POSTGRES_PASSWORD || 'demo',
  database: process.env.POSTGRES_DB || 'ecommerce',
});
```

**Docker Compose Configuration:**
```yaml
postgres:
  image: postgres:16-alpine
  container_name: system-design-postgres
  ports:
    - "${POSTGRES_PORT:-5432}:5432"
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-demo}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-demo}
    POSTGRES_DB: ${POSTGRES_DB:-ecommerce}
```

**Investigation Findings:**
1. PostgreSQL container is running and healthy (verified with `docker ps`)
2. Connection from within the container works: `docker exec system-design-postgres psql -U demo -d ecommerce -c "SELECT version();"`
3. The authentication failure occurs when connecting from the Node.js application running on the host

**Possible Issues:**
1. **Environment Variables Not Set**: The application may not have access to the environment variables from docker-compose
2. **Connection from Host**: While the container works internally, there may be authentication configuration issues when connecting from localhost
3. **pg_hba.conf Configuration**: PostgreSQL may not be configured to accept password authentication from host connections
4. **Password Mismatch**: Despite the docker-compose defaults, the actual password may differ

#### Impact
- Prevents demonstration of cache-aside pattern with PostgreSQL
- Example cannot showcase cache invalidation on database updates
- Core Redis caching functionality (SET, GET, TTL) would still work if isolated from PostgreSQL

---

### 2. Example 10: Time Series ❌

**File:** `src/technologies/redis/examples/10-time-series/index.ts`

#### Error Message
```
ERR TSDB: failed parsing labels
```

#### Location of Failure
**Line 163-173:** The `TS.MRANGE` command with FILTER clause
```typescript
const allMetrics = await client.sendCommand([
  'TS.MRANGE',
  fiveMinutesAgo.toString(),
  now.toString(),
  'FILTER',
  'server=server1',
  'AGGREGATION',
  'AVG',
  '60000',
]);
```

#### Root Cause Analysis

**Successful Operations (No Errors):**
- TS.CREATE with RETENTION and LABELS ✅
- TS.ADD for adding data points ✅
- TS.RANGE for querying single time series ✅
- TS.RANGE with AGGREGATION ✅
- TS.CREATERULE for compaction rules ✅
- TS.GET for latest value ✅
- TS.INFO for time series metadata ✅

**Failed Operation:**
- TS.MRANGE with FILTER clause ❌

**Command That Fails:**
```
TS.MRANGE <from> <to> FILTER server=server1 AGGREGATION AVG 60000
```

**Possible Issues:**

1. **Label Format Issue**: The FILTER syntax `server=server1` may be incorrect
   - RedisTimeSeries may expect different label query syntax
   - May need parentheses: `FILTER (server=server1)`
   - May need quotes: `FILTER "server=server1"`

2. **Label Creation vs Query Mismatch**: 
   - Labels were created in TS.CREATE command: `LABELS server server1 metric cpu`
   - This creates two label key-value pairs: `server=server1` and `metric=cpu`
   - The query syntax may not match how labels were stored

3. **RedisTimeSeries Version Issue**:
   - Using `redis/redis-stack:latest` image
   - Different versions may have different FILTER syntax
   - Syntax may have changed between RedisTimeSeries versions

4. **Filter Placement**:
   - FILTER clause comes before AGGREGATION in the command
   - This ordering might be incorrect for some RedisTimeSeries versions

#### Impact
- Multi-series queries cannot be demonstrated
- Single time series queries work correctly
- All other time series functionality is operational
- The example runs 90% successfully until Step 6

---

## Passing Examples - Summary

### 01. Basics: Data Structures ✅
- **Duration:** 12ms
- **Functionality:** All 5 Redis data structures demonstrated correctly
  - Strings (SET, GET, INCR)
  - Hashes (HSET, HGETALL)
  - Lists (LPUSH, LRANGE)
  - Sets (SADD, SMEMBERS, SISMEMBER)
  - Sorted Sets (ZADD, ZREVRANGE, ZREVRANK)

### 03. Distributed Lock ✅
- **Duration:** 114ms
- **Functionality:** Demonstrated lock acquisition, TTL, critical section, and lock release
- **Pattern:** Simple INCR-based locking with expiration

### 04. Leaderboards ✅
- **Duration:** 12ms
- **Functionality:** Sorted sets for rankings, score updates, rank queries, range queries

### 05. Rate Limiting ✅
- **Duration:** 340ms
- **Functionality:** 
  - Sliding window rate limiting
  - Token bucket algorithm
  - Both patterns working correctly
  - Includes retry-after headers

### 06. Proximity Search ✅
- **Duration:** 6ms
- **Functionality:**
  - GeoAdd for storing locations
  - GeoRadius for proximity searches
  - GeoSearch queries
  - Distance calculations

### 07. Event Sourcing ✅
- **Duration:** 16ms
- **Functionality:**
  - Event append with RPUSH
  - Event replay with LRANGE
  - State reconstruction from events
  - Event versioning

### 08. Pub/Sub ✅
- **Duration:** 633ms
- **Functionality:**
  - Channel subscriptions
  - Message publishing
  - Pattern subscriptions
  - Message broadcasting
  - **Note:** Longer duration due to async message handling

### 09. Bloom Filters ✅
- **Duration:** 581ms
- **Functionality:**
  - BF.ADD for adding items
  - BF.EXISTS for membership checks
  - BF.MADD for bulk operations
  - BF.RESERVE for scalable filters
  - False positive rate demonstration
  - **Note:** Longer duration due to 1000 false positive checks

---

## Environment Details

### Docker Services Status
```
NAMES                                  STATUS
system-design-redis-insight            Up 4 days
system-design-redis                    Up 4 days (healthy)
system-design-postgres                 Up 4 days (healthy)
```

### Redis Version
- **Image:** redis/redis-stack:latest
- **Modules:** RedisJSON, RedisSearch, RedisGraph, RedisTimeSeries, RedisBloom

### PostgreSQL Version
- **Image:** postgres:16-alpine
- **Version:** PostgreSQL 16.13 on aarch64-unknown-linux-musl

### Node.js Environment
- **Runtime:** Node.js via npx tsx
- **Redis Client:** redis@^4.7.0
- **PostgreSQL Client:** pg@^8.12.0

---

## Recommendations for Fixes

### Priority 1: Cache-Aside Pattern (Example 02)

**Recommended Investigations:**
1. Verify environment variables are passed to the test script
2. Check PostgreSQL pg_hba.conf for host-based authentication rules
3. Test direct connection from host using environment variables
4. Consider if password needs to be explicitly set vs relying on defaults
5. Add connection error handling with better diagnostics

**Potential Solutions:**
- Add explicit environment variable validation before connecting
- Include connection retry logic with exponential backoff
- Provide clear setup instructions if special PostgreSQL configuration is needed
- Consider using connection string format instead of object configuration
- Add a health check step that tests PostgreSQL connectivity before running example

### Priority 2: Time Series (Example 10)

**Recommended Investigations:**
1. Check RedisTimeSeries documentation for correct FILTER syntax
2. Test different label query formats:
   - `FILTER server=server1`
   - `FILTER (server=server1)`
   - `FILTER "server=server1"`
   - `FILTER server server1`
3. Verify RedisTimeSeries module version in redis-stack image
4. Test with explicit label format in TS.CREATE
5. Check if FILTER and AGGREGATION order matters

**Potential Solutions:**
- Update FILTER syntax to match RedisTimeSeries version
- Add error handling for TS.MRANGE with fallback to multiple TS.RANGE calls
- Document required RedisTimeSeries version for multi-series queries
- Add label format validation or use consistent label query pattern
- Consider updating to specific redis-stack version tag instead of :latest

---

## Testing Infrastructure

### Test Script
**Location:** `scripts/test-redis-examples.ts`

**Features:**
- Automated execution of all 10 Redis examples
- Per-example error catching and reporting
- Duration tracking for performance analysis
- JSON output for detailed results
- Cleanup execution after each example

**Improvements Made:**
- Created comprehensive test harness
- Added structured error reporting
- Generates machine-readable JSON report
- Captures full stack traces for debugging
- Non-interactive mode for CI/CD compatibility

### Test Output
**Location:** `test-results.json`

**Format:**
```json
{
  "timestamp": "2026-05-11T13:47:00.580Z",
  "total": 10,
  "passed": 8,
  "failed": 2,
  "totalDuration": 1753,
  "results": [...]
}
```

---

## Conclusion

**Overall Status:** 80% Success Rate

The Redis examples are mostly functional with only 2 failures out of 10 examples. Both failures are related to external integrations:
1. PostgreSQL authentication (external database)
2. RedisTimeSeries advanced query syntax (specific module feature)

All core Redis functionality demonstrated in the passing examples is working correctly:
- ✅ Basic data structures
- ✅ Distributed locking
- ✅ Leaderboards with sorted sets
- ✅ Rate limiting algorithms
- ✅ Geospatial queries
- ✅ Event sourcing patterns
- ✅ Pub/Sub messaging
- ✅ Probabilistic data structures (Bloom filters)

The failures are isolated and do not indicate systemic issues with the Redis examples or infrastructure. Both issues appear to be configuration or syntax-related and should be straightforward to resolve with targeted fixes.

---

## Next Steps

**Do NOT fix these issues** - this is a documentation-only report per requirements.

For future work, recommended priority order:
1. Fix Cache-Aside Pattern PostgreSQL connection (blocks important caching pattern)
2. Fix Time Series multi-series queries (90% of example already works)
3. Add integration tests to CI/CD pipeline using test-redis-examples.ts
4. Document environment setup requirements more explicitly
5. Consider adding health check step at start of examples

---

## Appendix: Raw Test Execution Log

### Example 02: Cache-Aside Pattern - Full Output
```
======================================================================
Testing: Cache: Cache-Aside Pattern
======================================================================

📦 Redis Example: Cache-Aside Pattern
ℹ Product catalog caching with PostgreSQL

✗ Failed (18ms)
Error: password authentication failed for user "demo"
```

### Example 10: Time Series - Partial Output
```
======================================================================
Testing: Time Series
======================================================================

📦 Redis Example: Time Series Data
ℹ Server metrics: CPU usage, memory, request rate

[Steps 1-5 execute successfully...]

→ Step 6: Query Multiple Series (TS.MRANGE)
(non-interactive mode, continuing automatically)

✗ Failed (58ms)
Error: ERR TSDB: failed parsing labels
```

---

**Report Generated:** 2026-05-11T13:47:00Z  
**Test Script:** scripts/test-redis-examples.ts  
**Test Results:** test-results.json
