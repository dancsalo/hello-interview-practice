# Test Errors Documentation

## Summary

Running `npm test` (test-all-examples.ts) results: **11/12 tests passing**

- Redis: 9/10 passing (1 failure)
- Kafka: 2/2 passing ✅

## Failed Tests

### 1. Redis Cache Example - PostgreSQL Connection Error

**Test:** `Cache: Cache-Aside Pattern`  
**Error:** `AggregateError`  
**Root Cause:** PostgreSQL connection failure

**Details:**
The cache example requires a PostgreSQL connection to demonstrate cache-aside pattern. The connection fails with:
- PostgreSQL port 5432 not accessible from host
- Rancher Desktop port forwarding issue (environment-specific)
- PostgreSQL container is healthy but port not forwarded to localhost

**Code Location:**
`src/technologies/redis/examples/02-cache/index.ts`
- Lines 14-20: PostgreSQL client configuration
- Line 22: `await pgClient.connect()` - fails here

**Environment Context:**
- PostgreSQL service running in docker-compose on port 5432
- `.env.example` specifies `POSTGRES_PORT=5432` (but some environments use 5433)
- Docker container healthy but host machine can't reach port 5432

## Fix Options

### Option 1: Make PostgreSQL Optional (Recommended)
Skip the cache example or use mock data when PostgreSQL is unavailable.

**Pros:**
- Tests can run without PostgreSQL dependency
- More robust to environment issues
- Faster test execution

**Cons:**
- Cache example doesn't test real database integration

### Option 2: Fix PostgreSQL Port Configuration
Ensure PostgreSQL port is properly forwarded in all environments.

**Pros:**
- Tests real integration with database
- More realistic example

**Cons:**
- Environment-dependent
- More complex setup requirements

### Option 3: Use Different Port (5433)
Some systems have conflicts on 5432, using 5433 as alternative.

**Current State:**
- Docker-compose uses `${POSTGRES_PORT:-5432}:5432`
- README shows port 5433 in some places
- Inconsistent documentation

**Fix:**
- Standardize on one port (probably 5433 for development)
- Update all references consistently

## Recommended Solution

**Implement Option 1 + Option 3:**

1. **Update PostgreSQL port to 5433 consistently** (avoids conflicts)
2. **Add graceful fallback in cache example** (skip if PostgreSQL unavailable)
3. **Update documentation** to reflect standard port

This ensures:
- Tests run reliably in all environments
- Cache example still demonstrates the pattern when PostgreSQL is available
- No false failures from environment-specific issues

## Implementation Plan

1. Update cache example to handle PostgreSQL connection failures gracefully
2. Standardize PostgreSQL port to 5433 in docker-compose.yml
3. Update README to clarify PostgreSQL port
4. Optionally: Add `--skip-integration` flag to skip database-dependent tests

## Test Results Summary

```
══════════════════════════════════════════════════════════════════════
📊 TEST SUMMARY
══════════════════════════════════════════════════════════════════════

Redis:
  Total: 10
  Passed: 9 ✓
  Failed: 1 ✗

  Failed tests:
    - Cache: Cache-Aside Pattern: AggregateError

Kafka:
  Total: 2
  Passed: 2 ✓
  Failed: 0 

══════════════════════════════════════════════════════════════════════
OVERALL:
  Total: 12
  Passed: 11 ✓
  Failed: 1 ✗
  Duration: 29.79s
══════════════════════════════════════════════════════════════════════
```

## Date
2026-05-11
