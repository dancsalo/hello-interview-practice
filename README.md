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
- ✅ **Kafka** (2 examples) - Message streaming, partitioning, producer/consumer patterns
- ✅ **Flink** (3 examples in Phase 1, 10 total planned) - Stateful stream processing with event-time semantics
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
│       ├── kafka/              # Kafka examples
│       │   └── examples/       # 2 runnable examples (8 more planned)
│       └── flink/              # Flink examples
│           └── examples/       # 3 examples in Phase 1 (10 total planned)
├── scripts/
│   ├── test-redis-examples.ts     # Test Redis examples
│   ├── test-postgres-examples.ts  # Test PostgreSQL examples
│   ├── test-kafka-examples.ts     # Test Kafka examples
│   ├── test-flink-examples.ts     # Test Flink examples
│   ├── reset-redis.ts             # Reset Redis data
│   ├── reset-postgres.ts          # Reset PostgreSQL data
│   ├── reset-kafka.ts             # Reset Kafka data
│   ├── reset-flink.ts             # Reset Flink data
│   └── reset-all.ts               # Reset all services
├── docs/superpowers/           # Technology documentation
└── docker-compose.yml          # All services
```

## Available Commands

```bash
npm start                # Launch interactive CLI
npm run dev              # Development mode with watch
npm test                 # Run Redis integration tests
npm run test:redis       # Run Redis integration tests
npm run test:postgres    # Run PostgreSQL integration tests
npm run test:kafka       # Run Kafka integration tests
npm run test:flink       # Run Flink integration tests
npm run reset            # Reset all service data
npm run reset:redis      # Reset only Redis data
npm run reset:postgres   # Reset only PostgreSQL data
npm run reset:kafka      # Reset only Kafka data
npm run reset:flink      # Reset only Flink data
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

## Kafka Examples

The Kafka technology includes 2 comprehensive examples (8 more planned):

1. **Basics** - Producers, consumers, topics, and core messaging patterns
2. **Partitioning** - Partition strategies, ordering guarantees, and scalability

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key Kafka concepts and APIs
- Production considerations
- Further reading

See `src/technologies/kafka/README.md` for more details.

## Flink Examples

The Flink technology includes 3 examples in Phase 1 (10 total planned):

1. **Basics** - DataStream API, sources, sinks, and transformations (planned)
2. **Stateless Operators** - Map, filter, flatMap, and keyBy operations (planned)
3. **Stateful Processing** - State management, windows, and aggregations (planned)

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key Flink concepts (DataStream API, windowing, watermarks, checkpointing)
- Production considerations
- Further reading

See `src/technologies/flink/README.md` for more details.

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

### Kafka
- **Port**: 9092 (broker), 9093 (external)
- **Image**: confluentinc/cp-kafka:7.5.0
- **Services**: kafka, zookeeper

### Flink
- **Port**: 8081 (JobManager Web UI)
- **Image**: flink:1.18-scala_2.12
- **Services**: flink-jobmanager, flink-taskmanager
- **UI**: JobManager Dashboard at http://localhost:8081

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
- 9092, 9093 (Kafka)
- 2181 (Zookeeper)
- 8081 (Flink JobManager)

To customize, create a `.env` file:

```bash
REDIS_PORT=6380
REDIS_INSIGHT_PORT=8002
POSTGRES_PORT=5433
KAFKA_PORT=9092
KAFKA_EXTERNAL_PORT=9093
ZOOKEEPER_PORT=2181
FLINK_JM_PORT=8081
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
npm run reset:kafka
npm run reset:flink
```

## Learning Path

**For beginners:**
1. Start with PostgreSQL Basics to understand SQL fundamentals
2. Try Redis Basics to see key-value data structures
3. Explore Cache patterns to see practical application
4. Learn about Transactions and Distributed Locks for coordination
5. Try Kafka Basics to understand message streaming
6. Explore other patterns based on interest

**For interview prep:**
1. Run all Redis and PostgreSQL examples to understand the patterns
2. Explore Kafka examples to learn message streaming patterns
3. Try Flink examples to understand stream processing (Phase 1 available)
4. Read the production considerations in each example
5. Try modifying examples to test edge cases
6. Practice explaining tradeoffs out loud
7. Review the technology docs in `docs/superpowers/`

**For building systems:**
1. Understand when NOT to use each pattern
2. Pay attention to failure modes
3. Consider the alternatives mentioned
4. Think about how patterns compose
5. Check RedisInsight to visualize data structures
6. Use Flink JobManager UI (http://localhost:8081) to monitor stream processing jobs

**Stream processing path:**
1. Start with Kafka Basics to understand message streaming
2. Learn Kafka Partitioning for scalability and ordering
3. Move to Flink Basics to process streams with transformations
4. Explore Flink Stateless Operators for data manipulation
5. Study Flink Stateful Processing for windowing and aggregations

## Why This Exists

System design interviews require depth, not breadth. Instead of knowing a little about many technologies, you're better off deeply understanding a few versatile ones. This project covers four core technologies that appear in most distributed systems:

- **Redis** - Cache, locks, pub/sub, and more versatile patterns
- **PostgreSQL** - Relational data, transactions, and SQL optimization
- **Kafka** - Message streaming and event-driven architectures
- **Flink** - Stateful stream processing and real-time analytics

This project lets you:
- Actually run the patterns instead of just reading about them
- See the data structures with RedisInsight and Flink JobManager UI
- Experiment with edge cases
- Build muscle memory for interviews
- Understand how technologies compose together

Running code beats reading slides.

## Contributing

This is an educational project. Contributions welcome for:
- New examples for existing technologies (Redis, PostgreSQL, Kafka, Flink)
- New technologies (Cassandra, Elasticsearch, etc.)
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
