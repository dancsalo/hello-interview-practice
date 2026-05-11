# System Design Technology Examples

An interactive learning platform for mastering system design technologies through hands-on examples. Built for students preparing for system design interviews who want to go beyond theory and actually run the patterns they're learning about.

## Quick Start

Get up and running in under 60 seconds:

```bash
# 1. Start Docker services
docker-compose up -d

# 2. Install dependencies
npm install

# 3. Launch interactive CLI
npm start
```

That's it! The CLI will guide you through running examples for each technology.

## Prerequisites

- **Docker and Docker Compose** - All services run in containers
- **Node.js >= 18.x** - For running the interactive examples

## What's Inside

### Technologies

- ✅ **Redis** (10 examples) - Cache, distributed locks, leaderboards, rate limiting, pub/sub, and more
- ✅ **PostgreSQL** (7 examples) - SQL operations, transactions, indexing, read/write scaling, optimization
- ✅ **ZooKeeper** (8 examples) - Coordination, leader election, distributed locks, service discovery, configuration
- ✅ **Kafka** (2 examples) - Event streaming, partitioning, consumer groups
- 🔜 **Cassandra** - Coming soon
- 🔜 **Elasticsearch** - Coming soon

Each technology includes multiple examples demonstrating real-world patterns from basic concepts to production considerations.

### Features

**Interactive CLI**
- Two-level menu system (technology → example)
- Guided walkthroughs with explanations
- Post-example actions (run another, reset data, return)
- Health checks ensure services are ready

**Docker Services**
- Pre-configured services for each technology
- Health checks and auto-restart
- RedisInsight for visualizing data
- Isolated volumes for easy reset

**Self-Verifying Examples**
- Each example includes assertions
- Shows you what to look for
- Explains production considerations
- Links to deeper resources

**Educational Output**
- Formatted console logging
- Step-by-step explanations
- Key concepts highlighted
- Common pitfalls discussed

## Project Structure

```
hello-interview-practice/
├── src/
│   ├── cli.ts                  # Main interactive menu
│   ├── lib/                    # Shared utilities
│   └── technologies/
│       ├── redis/              # Redis examples
│       │   ├── README.md       # Redis overview
│       │   └── examples/       # 10 runnable examples
│       ├── postgresql/         # PostgreSQL examples
│       │   └── examples/       # 7 runnable examples
│       ├── zookeeper/          # ZooKeeper examples
│       │   ├── README.md       # ZooKeeper overview
│       │   └── examples/       # 8 runnable examples
│       └── kafka/              # Kafka examples
│           └── examples/       # 2 runnable examples
├── scripts/
│   ├── test-redis-examples.ts     # Test Redis examples
│   ├── test-postgres-examples.ts  # Test PostgreSQL examples
│   ├── test-zookeeper-examples.ts # Test ZooKeeper examples
│   ├── test-kafka-examples.ts     # Test Kafka examples
│   ├── reset-redis.ts             # Reset Redis data
│   ├── reset-postgres.ts          # Reset PostgreSQL data
│   ├── reset-zookeeper.ts         # Reset ZooKeeper data
│   ├── reset-kafka.ts             # Reset Kafka data
│   └── reset-all.ts               # Reset all services
├── docs/superpowers/           # Technology documentation
└── docker-compose.yml          # All services
```

## Available Commands

```bash
npm start                # Launch interactive CLI
npm run dev              # Development mode with watch
npm test                 # Run all integration tests
npm run test:redis       # Run Redis integration tests
npm run test:postgres    # Run PostgreSQL integration tests
npm run test:zookeeper   # Run ZooKeeper integration tests
npm run test:kafka       # Run Kafka integration tests
npm run reset            # Reset all service data
npm run reset:redis      # Reset only Redis data
npm run reset:postgres   # Reset only PostgreSQL data
npm run reset:zookeeper  # Reset only ZooKeeper data
npm run reset:kafka      # Reset only Kafka data
npm run docker:up        # Start Docker services
npm run docker:down      # Stop Docker services
npm run docker:reset     # Recreate services from scratch
```

## Redis Examples

The Redis technology includes 10 comprehensive examples:

1. **Basics** - Core data structures (strings, hashes, lists, sets, sorted sets)
2. **Cache** - Write-through, write-behind, TTL strategies
3. **Distributed Lock** - Coordinate access across processes
4. **Leaderboards** - Sorted sets for ranking and scoring
5. **Rate Limiting** - Fixed window, sliding window, multi-tier
6. **Proximity Search** - Geospatial indexes for location queries
7. **Event Sourcing** - Redis Streams and consumer groups
8. **Pub/Sub** - Real-time messaging patterns
9. **Bloom Filters** - Probabilistic set membership
10. **Time Series** - Recording and querying time-based data

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key Redis commands
- Production considerations
- Further reading

See `src/technologies/redis/README.md` for more details.

## PostgreSQL Examples

The PostgreSQL technology includes 7 comprehensive examples:

1. **Basics** - Core SQL operations (CRUD, joins, relationships, foreign keys)
2. **Transactions** - ACID properties, isolation levels, concurrency control
3. **Indexing** - B-tree indexes, performance impact, query optimization
4. **Advanced Indexing** - Partial indexes, covering indexes, GIN/GiST
5. **Read Scaling** - Replication strategies, read replicas, connection pooling
6. **Write Scaling** - Sharding, partitioning, write optimization
7. **Optimization** - Query planning, EXPLAIN, vacuum, performance tuning

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key SQL commands and PostgreSQL features
- Production considerations
- Further reading

See `docs/superpowers/POSTGRESQL.md` for more details.

## ZooKeeper Examples

The ZooKeeper technology includes 8 comprehensive examples:

1. **Basics** - ZNode types (persistent, ephemeral, sequential), CRUD operations
2. **Watches** - Change notifications, data/child/existence watches, one-time triggers
3. **Configuration Management** - Centralized config, real-time propagation, versioning
4. **Service Discovery** - Registration with ephemeral nodes, automatic failure detection
5. **Leader Election** - Sequential ephemeral pattern, watching predecessor, automatic failover
6. **Distributed Locks** - FIFO lock acquisition, deadlock prevention, fencing tokens
7. **Session Management** - Session lifecycle, connection loss vs expiration, recovery patterns
8. **Ensemble & Consensus** - ZAB protocol, quorum-based writes, fault tolerance

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key ZooKeeper operations
- Production considerations
- Comparison with alternatives (etcd, Consul, Redis)
- Further reading

See `src/technologies/zookeeper/README.md` for more details.

## Services

### Redis Stack
- **Port**: 6379
- **UI**: RedisInsight at http://localhost:8001
- **Image**: redis/redis-stack (includes all modules)

### PostgreSQL
- **Port**: 5433
- **User**: demo / demo
- **Database**: ecommerce
- **Image**: postgres:16-alpine

### ZooKeeper
- **Port**: 2181
- **Image**: confluentinc/cp-zookeeper:7.5.0
- **Session Timeout**: 10 seconds (configurable via ZOOKEEPER_SESSION_TIMEOUT)

### Kafka
- **Port**: 9092
- **Image**: confluentinc/cp-kafka:7.5.0
- **Depends on**: ZooKeeper

Additional services will be added as more technologies are implemented.

## Troubleshooting

### Docker not running

```bash
# Check Docker is running
docker ps

# If not, start Docker Desktop or docker daemon
```

### Port conflicts

Services use these ports by default:
- 6379 (Redis)
- 8001 (RedisInsight)
- 5433 (PostgreSQL)
- 2181 (ZooKeeper)
- 9092 (Kafka)

To customize, create a `.env` file:

```bash
REDIS_PORT=6380
REDIS_INSIGHT_PORT=8002
POSTGRES_PORT=5433
ZOOKEEPER_PORT=2182
KAFKA_PORT=9093
```

### Services not healthy

```bash
# Check service status
docker-compose ps

# View logs for a specific service
docker-compose logs redis

# Restart services
docker-compose restart
```

### Reset everything

If things get weird, nuclear option:

```bash
# Stop everything, delete all data, start fresh
docker-compose down -v
docker-compose up -d

# Clear node modules if needed
rm -rf node_modules package-lock.json
npm install
```

### Examples not working

```bash
# Reset just the data (keeps containers running)
npm run reset

# Or reset specific technology
npm run reset:redis
npm run reset:postgres
npm run reset:zookeeper
npm run reset:kafka
```

## Learning Path

**For beginners:**
1. Start with PostgreSQL Basics to understand SQL fundamentals
2. Try Redis Basics to see key-value data structures
3. Explore Cache patterns to see practical application
4. Learn about Transactions and Distributed Locks for coordination
5. Explore other patterns based on interest

**For interview prep:**
1. Run all examples (Redis, PostgreSQL, ZooKeeper, Kafka) to understand the patterns
2. Read the production considerations in each example
3. Focus on ZooKeeper for distributed coordination questions (leader election, locks)
4. Practice explaining tradeoffs out loud
5. Review the technology docs in `docs/superpowers/` and technology READMEs

**For building systems:**
1. Understand when NOT to use each pattern
2. Pay attention to failure modes
3. Consider the alternatives mentioned
4. Think about how patterns compose
5. Check RedisInsight to visualize data structures

## Why This Exists

System design interviews require depth, not breadth. Instead of knowing a little about many technologies, you're better off deeply understanding a few versatile ones. Redis is incredibly versatile - it can be a cache, a lock manager, a pub/sub broker, a search index, and more.

This project lets you:
- Actually run the patterns instead of just reading about them
- See the data structures with RedisInsight
- Experiment with edge cases
- Build muscle memory for interviews

Running code beats reading slides.

## Contributing

This is an educational project. Contributions welcome for:
- New examples for existing technologies
- New technologies (Kafka, PostgreSQL, etc.)
- Improved explanations
- Bug fixes

Keep the focus on education and interview preparation.

## References

- Original technology docs: `key_technologies/`
- Redis documentation: https://redis.io/docs
- Design patterns: Each example's README

## License

MIT

## Acknowledgments

Built with inspiration from real system design interview experiences and the need for hands-on practice with distributed systems technologies.

---

**Ready to learn?** Run `npm start` and dive in.
