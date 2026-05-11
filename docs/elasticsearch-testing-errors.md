# Elasticsearch Examples Testing - Error Documentation

**Date:** 2026-05-11
**Status:** Pre-testing documentation

## Pre-requisites Check

### Error 1: Docker Daemon Not Running
**Status:** BLOCKING
**Error Message:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

**Context:**
- Docker is installed (Rancher Desktop)
- Docker command available: `/Users/dsalo/.rd/bin/docker`
- Docker version: 29.1.4-rd
- Daemon is not currently running

**Impact:** Cannot run integration tests until Docker services are started

**Required Action:**
1. Start Rancher Desktop (or Docker Desktop)
2. Wait for Docker daemon to be ready
3. Start services: `docker-compose up -d`
4. Wait for Elasticsearch health checks to pass (~30-60 seconds)

---

## Testing Plan

### Phase 1: Static Analysis (No Docker Required)
- [x] TypeScript compilation check
- [ ] Import/export validation
- [ ] Code structure verification

### Phase 2: Integration Testing (Requires Docker)
- [ ] Start Docker services (elasticsearch, kibana)
- [ ] Verify service health
- [ ] Run test suite for all 10 examples
- [ ] Document any runtime errors
- [ ] Test interactive CLI

### Phase 3: Error Documentation & Fixes
- [ ] Document all errors found
- [ ] Categorize errors (critical, important, minor)
- [ ] Create fix plan
- [ ] Implement fixes
- [ ] Re-test

---

## Test Coverage Plan

### Test Script Requirements
1. **Pre-flight checks:**
   - Docker daemon running
   - Services healthy (elasticsearch, kibana)
   - Connection to Elasticsearch successful

2. **Example tests (10 total):**
   - Example 01: Basics - CRUD operations
   - Example 02: Full-Text Search - Text analysis
   - Example 03: Geospatial Search - Location queries
   - Example 04: Aggregations - Analytics
   - Example 05: Complex Queries - Bool queries
   - Example 06: Sorting & Pagination - Result navigation
   - Example 07: Document Versioning - Optimistic concurrency
   - Example 08: Faceted Search - Multi-dimensional filtering
   - Example 09: Index Management - Mappings & reindexing
   - Example 10: Production Patterns - CDC & sync

3. **Test execution:**
   - Run each example in non-interactive mode
   - Capture all output (stdout, stderr)
   - Verify no errors in logger
   - Clean up indices after each test
   - Report pass/fail for each example

4. **Integration with npm test:**
   - Add vitest configuration if needed
   - Or integrate script-based tests with npm test command
   - Ensure tests can run in CI/CD environment

---

## Known Issues (From Implementation)

### Issue 1: Vitest Compatibility
**Status:** KNOWN
**Description:** Vitest requires Node.js ^20.19.0 || >=22.12.0, but system has v20.11.0
**Impact:** Cannot use vitest for testing
**Solution:** Use script-based testing (already implemented in `scripts/test-elasticsearch-examples.ts`)

### Issue 2: Example Bug Fixes Applied During Implementation
**Status:** FIXED
**Description:** 
- Complex Queries example: Fixed search terms to match indexed data
- Sorting & Pagination example: Fixed text field sorting (use `.keyword` subfield)
**Impact:** None (already fixed)

---

## Next Steps

1. **User must start Docker daemon**
2. Run comprehensive test suite
3. Document all errors found
4. Categorize and prioritize fixes
5. Implement fixes
6. Re-test until all pass
7. Create npm test integration

---

## Integrated Testing Results (npm test)

**Date:** 2026-05-11
**Status:** Partially successful

### Error 1: Redis Cache Example - PostgreSQL Connection Failure
**Status:** BLOCKING for integrated tests
**Error Message:**
```
AggregateError
    at __node_internal_ (node:internal/errors:174:15)
    at internalConnectMultiple (node:net:1114:18)
    at afterConnectMultiple (node:net:1667:5)
```

**Context:**
- Occurs in Redis Cache-Aside Pattern example (Example 02)
- Example attempts to connect to PostgreSQL
- Docker compose includes postgres service
- Connection parameters: localhost:5432, user: demo, password: demo, database: ecommerce
- **ROOT CAUSE:** PostgreSQL is running on port 5433, not 5432

**Investigation Results:**
- PostgreSQL container is running and healthy
- Container port mapping: 0.0.0.0:5433->5432/tcp (host port 5433 → container port 5432)
- Example code uses port 5432 by default
- Port mismatch prevents connection

**Impact:** 
- Blocks `npm test` from completing full suite
- Redis tests fail after first example
- Elasticsearch tests not reached due to Redis failure

**Fix Required:**
1. **Option A (Recommended):** Update Redis cache example to read POSTGRES_PORT from env (like other services)
2. **Option B:** Change Docker PostgreSQL port mapping to 5432:5432 (may conflict with existing PostgreSQL)
3. **Option C:** Document that users must set POSTGRES_PORT=5433 in .env file

**Choosing Option A:** Most consistent with existing pattern (REDIS_PORT, ELASTICSEARCH_PORT)

**Fix Applied:**
- Created `.env` file with POSTGRES_PORT=5433
- Redis cache example already uses `process.env.POSTGRES_PORT` with fallback to 5432
- Fix was environmental configuration, not code change
- Re-running tests to verify fix
