# Redis Examples Design Specification

**Date:** 2026-05-06  
**Status:** Approved  
**Scope:** Self-contained, interactive TypeScript examples demonstrating Redis patterns for system design education

## Overview

Create a comprehensive set of runnable Redis examples that illustrate all concepts from `key_technologies/redis/original.md`. Students should be able to clone the repo and run interactive examples in under 60 seconds. This is the first technology in a multi-technology learning system for system design courses.

## Goals

1. **Fast onboarding**: `git clone` → running examples in < 1 minute
2. **Comprehensive coverage**: All 10+ Redis use cases from original.md
3. **Progressive learning**: Basic examples → production considerations in each pattern
4. **Self-contained**: Docker services for all dependencies
5. **Interactive experience**: Guided CLI with explanations, not just code dumps
6. **Extensible**: Pattern that works for future technologies (Kafka, PostgreSQL, etc.)

## Non-Goals

- Production-ready Redis library (this is educational)
- Performance benchmarking tools
- Distributed deployment examples (single-machine Docker only)
- Complete coverage of every Redis command (focus on patterns)

## Project Structure

```
hello-interview-practice/
├── docker-compose.yml          # All technology services
├── package.json                # Single workspace root
├── tsconfig.json
├── .env.example                # Environment variable template
├── .gitignore
├── README.md                   # Project overview, quick start
├── scripts/
│   ├── reset-all.ts            # Reset all Docker volumes
│   └── reset-redis.ts          # Reset only Redis data
├── src/
│   ├── cli.ts                  # Main interactive menu
│   ├── lib/
│   │   ├── logger.ts           # Formatted console output
│   │   ├── docker-utils.ts     # Health checks, reset utilities
│   │   └── types.ts            # Shared TypeScript types
│   └── technologies/
│       ├── redis/
│       │   ├── client.ts       # Redis connection logic
│       │   ├── README.md       # Redis overview
│       │   └── examples/
│       │       ├── 01-basics/
│       │       │   ├── index.ts
│       │       │   └── README.md
│       │       ├── 02-cache/
│       │       │   ├── index.ts
│       │       │   └── README.md
│       │       ├── 03-distributed-lock/
│       │       ├── 04-leaderboards/
│       │       ├── 05-rate-limiting/
│       │       ├── 06-proximity-search/
│       │       ├── 07-event-sourcing/
│       │       ├── 08-pubsub/
│       │       ├── 09-bloom-filters/
│       │       └── 10-timeseries/
│       ├── kafka/              # Future
│       ├── postgresql/         # Future
│       └── ...
├── key_technologies/           # Original markdown docs (unchanged)
│   ├── redis/original.md
│   └── ...
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-05-06-redis-examples-design.md
```

## Architecture

### Core Components

#### 1. CLI System (`src/cli.ts`)

Interactive two-level menu system:
- Level 1: Technology selection (Redis, Kafka, PostgreSQL, etc.)
- Level 2: Example selection within chosen technology
- Post-example actions: run another, reset data, return to menu
- Health check verification before displaying menus
- Graceful shutdown (Ctrl+C closes connections cleanly)

#### 2. Example Interface

All examples implement a consistent interface:

```typescript
interface Example {
  name: string;
  description: string;
  run: (client: Redis, logger: Logger) => Promise<void>;
  cleanup?: (client: Redis) => Promise<void>;
}
```

Each example follows this flow:
1. **Introduction**: Logger explains what's being demonstrated
2. **Setup**: Create initial data with explanations
3. **Core Demo**: Execute Redis commands with progressive complexity
   - Basic code showing the pattern
   - Inline assertions verifying behavior
   - Production notes in comments
4. **Advanced Scenarios**: Optional failure demonstrations or anti-patterns
5. **Cleanup**: Optional data removal (or rely on reset)

#### 3. Redis Client (`src/technologies/redis/client.ts`)

- Connection pooling with retry logic
- Health check method (PING command)
- Helper methods wrapping common operations
- Configuration from environment variables
- Cleanup on exit

#### 4. Logger (`src/lib/logger.ts`)

Formatted educational output:
- Icons and colors (✓ success, ✗ error, ℹ info, → step, 💡 production tip)
- Code block formatting for Redis commands
- Before/after comparisons
- Progress indicators for multi-step operations
- Silent mode flag for automated testing

#### 5. Docker Utilities (`src/lib/docker-utils.ts`)

- Health check functions (poll until ready or timeout)
- Technology-specific reset functions:
  - `resetRedis()`: Executes `FLUSHALL` via Docker exec
  - `resetPostgres()`: Drops and recreates demo database
  - `resetAll()`: Runs all reset functions
- Error handling for missing Docker/stopped services

### Data Flow

```
User runs `npm start`
  ↓
CLI verifies Docker services (health checks)
  ↓ (30s timeout, clear error messages if failed)
User selects technology (Redis)
  ↓
CLI displays Redis examples menu
  ↓
User selects example (e.g., "02-cache")
  ↓
CLI imports example module, calls run()
  ↓
Example executes with real-time logger output
  ↓
Example completes, shows post-run menu
  ↓
User chooses: run another / reset / exit
```

## Redis Examples Detail

### Example 01: Basics (Data Structures)

**Concepts**: Strings, Hashes, Lists, Sets, Sorted Sets

**Demonstrates**:
- `SET`/`GET` for simple key-value storage
- `HSET`/`HGET`/`HGETALL` for object storage (user profiles)
- `LPUSH`/`RPUSH`/`LRANGE` for lists (activity feeds)
- `SADD`/`SMEMBERS`/`SISMEMBER` for sets (user tags)
- `ZADD`/`ZRANGE`/`ZRANK` for sorted sets (preview of leaderboards)

**Theme**: E-commerce user profiles and activity tracking

**Production Notes**: When to use each data structure, memory considerations, command complexity

---

### Example 02: Cache

**Concepts**: Cache-aside pattern, TTL, eviction policies

**Demonstrates**:
- Cache miss → fetch from Postgres → populate cache
- Cache hit → return from Redis (with timing comparison)
- TTL expiration using `EXPIRE` and `TTL` commands
- Cache invalidation on data update
- Multi-level cache key namespacing

**Theme**: Product catalog caching

**Supporting Service**: PostgreSQL with sample products table

**Production Notes**: Cache stampede, TTL jitter, hot key problem, cache warming strategies

**Advanced Mode**: Demonstrate cache stampede, then show mitigation with locks

---

### Example 03: Distributed Lock

**Concepts**: Atomicity, concurrency control, timeout handling

**Demonstrates**:
- Simple `INCR`-based lock with TTL
- Lock acquisition (check if `INCR` returns 1)
- Lock release with `DEL`
- Retry logic with exponential backoff
- Timeout to prevent deadlocks

**Theme**: Concert ticket booking (prevent double-booking)

**Production Notes**: Redlock algorithm, fencing tokens, failure modes, when not to use distributed locks

**Advanced Mode**: Simulate race condition without lock, then demonstrate protection with lock

---

### Example 04: Leaderboards

**Concepts**: Sorted sets, ranking queries, score updates

**Demonstrates**:
- `ZADD` to add/update player scores
- `ZRANGE`/`ZREVRANGE` for top-N queries
- `ZRANK`/`ZREVRANK` for "what's my rank?" queries
- `ZINCRBY` for score increments
- `ZREMRANGEBYRANK` for cleanup (keep only top 100)

**Theme**: Game leaderboard with player scores

**Production Notes**: Pagination strategies, time-based leaderboards (multiple sorted sets), global vs regional leaderboards

---

### Example 05: Rate Limiting

**Concepts**: Fixed window, sliding window, token bucket concepts

**Demonstrates**:
- **Fixed window**: `INCR` + `EXPIRE` pattern
- **Sliding window**: Sorted set with timestamps + `ZREMRANGEBYSCORE`
- Lua script for atomic sliding window check
- Multiple rate limits (per-user, per-IP, per-endpoint)

**Theme**: API rate limiting (100 requests/minute)

**Production Notes**: Distributed rate limiting challenges, clock skew, burst handling

---

### Example 06: Proximity Search

**Concepts**: Geospatial indexing, geohashes, radius queries

**Demonstrates**:
- `GEOADD` to index locations (drivers, restaurants)
- `GEOSEARCH` with radius queries
- `GEODIST` for distance between two points
- Multiple geospatial indexes for different entity types
- Filtering results after geo query

**Theme**: Ride-sharing driver matching

**Production Notes**: Grid approximation (N+log(M) complexity), precision trade-offs, when to use dedicated geospatial databases

---

### Example 07: Event Sourcing

**Concepts**: Streams, consumer groups, message processing, failure handling

**Demonstrates**:
- `XADD` to append events to stream
- `XREADGROUP` to consume messages as consumer group
- Consumer group creation with `XGROUP CREATE`
- Message acknowledgment with `XACK`
- Failed message handling with `XCLAIM` and `XPENDING`

**Theme**: Order processing pipeline (order placed → payment → fulfillment)

**Production Notes**: Redis Streams vs Kafka comparison, durability trade-offs, exactly-once semantics (or lack thereof)

---

### Example 08: Pub/Sub

**Concepts**: Sharded pub/sub, real-time messaging, fan-out

**Demonstrates**:
- `SPUBLISH` to broadcast messages
- `SSUBSCRIBE` to listen (simulated with multiple clients)
- Channel patterns and wildcards
- Connection lifecycle management

**Theme**: Chat room / live notification system

**Production Notes**: At-most-once delivery, missed messages when offline, vs Redis Streams for durability

**Anti-Pattern**: Rolling your own pub/sub with key lookups (explain why native is better: network hops, TCP connections, memory overhead)

---

### Example 09: Bloom Filters

**Concepts**: Probabilistic data structures, false positive rate, space efficiency

**Demonstrates**:
- `BF.ADD` to add elements
- `BF.EXISTS` to check membership
- False positive rate configuration
- Space savings vs regular sets
- Use case: checking if username is taken

**Theme**: Email spam filter / username availability checker

**Production Notes**: When to use vs regular sets, false positive rate tuning, memory efficiency calculations

---

### Example 10: Time Series

**Concepts**: Time-based data, aggregations, retention policies

**Demonstrates**:
- `TS.ADD` to record timestamped metrics
- `TS.RANGE` for time-range queries
- `TS.MGET` for latest values across multiple series
- Retention policies (auto-expire old data)
- Aggregation rules (average, sum, min, max)

**Theme**: System metrics monitoring (CPU, memory, disk over time)

**Production Notes**: Redis TimeSeries vs dedicated databases (InfluxDB, Prometheus), downsampling strategies, compression

## Docker Services

### docker-compose.yml Structure

**Single command starts everything**: `docker-compose up -d`

Services included:
- **redis**: `redis/redis-stack:latest` (includes modules: bloom, timeseries, search, JSON)
- **redis-insight**: `redis/redisinsight:latest` on port 8001 (web UI)
- **postgres**: `postgres:16-alpine` on port 5432 (for cache example)
- **Future**: Kafka, Elasticsearch, Cassandra, LocalStack (DynamoDB)

Each service includes:
- Health checks (CLI verifies before showing menus)
- Named volumes for data persistence
- Resource limits (prevent laptop resource exhaustion)
- Restart policies (unless-stopped)

### Reset Functionality

Three ways to reset data:

1. **From CLI** (after running example):
   ```
   1. Run another example
   2. Reset Redis (clears Redis data only)
   3. Reset all technologies (clears all volumes)
   4. Back to main menu
   ```

2. **Scripts**:
   - `npm run reset` - Clears all volumes, restarts services
   - `npm run reset:redis` - Clears only Redis data

3. **Nuclear option**:
   ```bash
   docker-compose down -v  # Remove everything
   docker-compose up -d    # Fresh start
   ```

## Technology Stack

### Runtime
- Node.js >= 18.x (native fetch, top-level await)
- TypeScript ~5.4
- tsx (fast TypeScript execution)

### Dependencies

**Redis**:
- `redis` (node-redis official client)

**CLI**:
- `@inquirer/prompts` (interactive prompts)
- `chalk` (terminal colors)
- `ora` (loading spinners)

**Supporting Services**:
- `pg` (PostgreSQL client for cache example)
- `kafkajs` (future Kafka examples)

**Dev**:
- `@types/node`
- `tsx`
- `prettier`

### Environment Configuration

`.env.example` (committed):
```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=demo
POSTGRES_PASSWORD=demo
POSTGRES_DB=ecommerce

# UI Ports
REDIS_INSIGHT_PORT=8001
PGADMIN_PORT=8002
KAFKA_UI_PORT=8003
KIBANA_PORT=8004
```

### Package Scripts

```json
{
  "scripts": {
    "start": "tsx src/cli.ts",
    "dev": "tsx watch src/cli.ts",
    "reset": "tsx scripts/reset-all.ts",
    "reset:redis": "tsx scripts/reset-redis.ts",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:reset": "docker-compose down -v && docker-compose up -d",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit"
  }
}
```

## Error Handling

### Connection Errors
- Redis unavailable: Show Docker troubleshooting steps
- Timeout handling: 5-second connection timeout with retry
- Graceful degradation with clear error messages

### Example Runtime Errors
- Catch Redis command failures, display error with context
- Validate preconditions before operations
- Provide recovery steps: "Run 'npm run reset:redis' to start fresh"

### Docker Service Errors
- Health check failures: Wait 30 seconds, show service status
- Missing services: Guide user to start services
- Volume/permission issues: Suggest `docker-compose down -v`

## Testing & Verification

### Self-Verifying Examples

Each example includes inline assertions:

```typescript
const cached = await redis.get('product:123');
logger.assert(
  cached === expected,
  `Cache hit returned correct data`,
  `Expected ${expected}, got ${cached}`
);
```

Assertion types:
- Value equality (✓ pass / ✗ fail with diff)
- Timing assertions (cache hit < 5ms)
- State verification (key exists, TTL set, member in set)
- Order verification (sorted set ranking)

### Health Checks

Before each example:
- Verify Redis responding (`PING`)
- Check required modules loaded
- Verify supporting services if needed

### Reset Verification

After reset:
- Confirm data cleared (key count = 0)
- Verify services healthy post-reset
- Log reset confirmation with statistics

## Documentation

### README Structure

**Root README.md**:
- Project overview and learning goals
- Quick start (3 commands)
- Technology list with completion status
- Prerequisites (Docker, Node.js versions)
- Troubleshooting section

**Technology README** (`src/technologies/redis/README.md`):
- Redis overview
- Link to original.md
- List of examples with descriptions
- Key concepts covered
- Additional resources

**Example README** (per example folder):
- **What**: Pattern description
- **Why**: When to use in real systems
- **How**: Step-by-step code explanation
- **Key Commands**: Redis commands demonstrated
- **Try It**: Run instructions and what to observe
- **Production Considerations**: Pitfalls, trade-offs, alternatives
- **Further Reading**: Links to docs/articles

### Interactive Experience

**Startup**:
```
🎓 System Design Technology Examples
====================================

Checking services...
✓ Redis is ready
✓ PostgreSQL is ready
✓ RedisInsight available at http://localhost:8001

Select a technology:
 1. Redis (10 examples)
 2. Kafka (Coming soon)
 ...
```

**Example execution with educational output**:
```
📦 Redis Example: Cache-Aside Pattern
======================================

What we're demonstrating:
Cache-aside (lazy loading) with TTL-based eviction

→ Step 1: Check cache for product:123
  Command: GET product:123
  Result: (nil) - Cache miss!

→ Step 2: Fetch from database
  Query: SELECT * FROM products WHERE id = 123
  Found: {"name": "Laptop", "price": 999}

→ Step 3: Populate cache with 60s TTL
  Command: SETEX product:123 60 '{"name":"Laptop","price":999}'
  ✓ Cache populated

→ Step 4: Verify cache hit
  Command: GET product:123
  Result: {"name": "Laptop", "price": 999}
  ✓ Cache hit! (0.3ms vs 15ms from DB)

✓ All assertions passed!

💡 Production Considerations:
   - Cache stampede: Multiple requests during miss overwhelm DB
   - TTL jitter: Add randomness to prevent synchronized expiration
   - Hot keys: Popular items may overload single Redis node

Explore data in RedisInsight: http://localhost:8001
```

### Learning Features

**Progressive disclosure**:
- Basic example runs first
- "Want to see the anti-pattern?" prompt for advanced mode
- Optional pauses to check RedisInsight

**Visual feedback**:
- Color coding (green success, red error, blue info, yellow warning)
- Icons (✓ ✗ → ℹ ⚠️ 💡 📦)
- Timing information (operation latencies)
- Comparison metrics (Redis vs Postgres)

## Extensibility

### Standard Technology Interface

Each technology follows the same pattern:

```typescript
// src/technologies/{tech}/client.ts
export interface TechnologyClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  reset(): Promise<void>;
}

// src/technologies/{tech}/examples/{n}-{name}/index.ts
export interface Example {
  name: string;
  description: string;
  run: (client: TechnologyClient, logger: Logger) => Promise<void>;
}
```

### Adding New Technology

1. Create `src/technologies/{tech}/` folder
2. Implement `client.ts` with standard interface
3. Add examples following Redis structure
4. Update `docker-compose.yml` with services
5. Register in CLI menu (auto-discovery possible)

### Adding New Example

1. Create example folder with `index.ts` + `README.md`
2. Export `Example` interface
3. CLI auto-discovers and displays it

## Success Criteria

### Functional Requirements
- ✅ All 10 Redis use cases from original.md implemented
- ✅ Examples run successfully in < 60 seconds from clone
- ✅ Docker services start with single command
- ✅ Interactive CLI with clear navigation
- ✅ Reset functionality works at Redis and global level
- ✅ All examples include production notes
- ✅ Self-verifying assertions in each example

### Educational Requirements
- ✅ Clear, progressive explanations in output
- ✅ Real-world themes (e-commerce, ride-sharing, etc.)
- ✅ Production considerations documented
- ✅ Anti-patterns demonstrated where relevant
- ✅ Visual tools (RedisInsight) integrated

### Quality Requirements
- ✅ TypeScript with strict mode
- ✅ Error handling with helpful messages
- ✅ Health checks before execution
- ✅ Clean, readable code (under 150 lines per example)
- ✅ Comprehensive README documentation

## Future Considerations

### Additional Technologies (Post-Redis)
- Kafka: Message streaming, consumer groups, partitions
- PostgreSQL: SQL patterns, indexing, transactions, replication
- Elasticsearch: Full-text search, aggregations, relevance
- Cassandra: Wide-column store, partition keys, consistency levels
- DynamoDB: NoSQL patterns, GSI/LSI, single-table design
- Flink: Stream processing, windowing, state management
- Zookeeper: Coordination, leader election, configuration management

### Enhancements
- Video walkthrough recordings
- Comparative examples (Redis Streams vs Kafka)
- Performance benchmarking mode
- Quiz/assessment after examples
- Cloud deployment guides (AWS, GCP)

## Open Questions

None - design approved.

## Sign-off

**Approved by**: User  
**Next step**: Create implementation plan via `writing-plans` skill
