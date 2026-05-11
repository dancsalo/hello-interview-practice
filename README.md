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
- ✅ **Kafka** (2 examples, 8 more coming) - Event streaming, partitioning, consumer groups, and more
- ✅ **PostgreSQL** (7 examples) - Transactions, indexing, full-text search, replication, optimization
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
│       └── redis/              # Redis examples
│           ├── README.md       # Redis overview
│           └── examples/       # 10 runnable examples
├── scripts/
│   ├── reset-redis.ts          # Reset Redis data
│   └── reset-all.ts            # Reset all services
├── key_technologies/           # Reference documentation
└── docker-compose.yml          # All services
```

## Available Commands

```bash
npm start              # Launch interactive CLI
npm run dev            # Development mode with watch
npm run test           # Test all examples
npm run test:redis     # Test Redis examples only
npm run test:kafka     # Test Kafka examples only
npm run test:postgres  # Test PostgreSQL examples only
npm run reset          # Reset all service data
npm run reset:redis    # Reset only Redis data
npm run reset:kafka    # Reset only Kafka topics
npm run reset:postgres # Reset only PostgreSQL data
npm run docker:up      # Start Docker services
npm run docker:down    # Stop Docker services
npm run docker:reset   # Recreate services from scratch
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

## Kafka Examples

The Kafka technology currently includes 2 examples with 8 more coming:

**Phase 1: Available Now**

1. **Basics** - Topics, producers, consumers, messages, offsets
2. **Partitioning Strategies** - Key selection, distribution, ordering guarantees

**Phase 2: Coming Soon**

3. **Consumer Groups** - Parallel consumption and rebalancing
4. **Message Ordering** - Ordering guarantees and trade-offs
5. **Pub/Sub Messaging** - Fan-out patterns and multiple consumer groups
6. **Event Streaming** - Continuous processing and replay

**Phase 3: Coming Soon**

7. **Idempotency & Retries** - Exactly-once semantics and dead letter queues
8. **Hot Partition Handling** - Key salting and compound keys
9. **Change Data Capture** - Database changes as events
10. **Event Sourcing** - Kafka as event store

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key Kafka concepts
- Production considerations
- Interview tips
- Further reading

See `src/technologies/kafka/README.md` for more details.

## PostgreSQL Examples

The PostgreSQL technology includes 7 comprehensive examples:

1. **Basics** - Core operations (CRUD, joins, aggregations, subqueries)
2. **Transactions** - ACID properties, isolation levels, concurrency control
3. **Indexing** - B-tree, hash, GiST, covering indexes, index strategies
4. **Full-Text Search** - tsvector, tsquery, ranking, phrase search
5. **Replication** - Logical vs physical, streaming, failover, monitoring
6. **Performance Optimization** - EXPLAIN, query tuning, connection pooling, partitioning
7. **Advanced Queries** - CTEs, window functions, JSON operations, materialized views

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key PostgreSQL concepts
- Production considerations
- Interview tips
- Further reading

See `src/technologies/postgres/README.md` for more details.

## Services

### Redis Stack
- **Port**: 6379
- **UI**: RedisInsight at http://localhost:8001
- **Image**: redis/redis-stack (includes all modules)

### Kafka
- **Port**: 9092 (Kafka broker)
- **Port**: 2181 (Zookeeper)
- **UI**: Kafka UI at http://localhost:8002
- **Image**: confluentinc/cp-kafka:7.5.0
- **Use**: Event streaming, message queues, real-time processing

### PostgreSQL
- **Port**: 5433
- **User**: demo / demo
- **Database**: ecommerce
- **Image**: postgres:16-alpine

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

To customize, create a `.env` file:

```bash
REDIS_PORT=6380
REDIS_INSIGHT_PORT=8002
POSTGRES_PORT=5433
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
```

## Learning Path

**For beginners:**
1. Start with Redis Basics to understand core data structures
2. Move to Cache to see practical application
3. Try Distributed Lock to understand coordination
4. Explore other patterns based on interest

**For interview prep:**
1. Run all Redis examples to understand the patterns
2. Read the production considerations in each README
3. Try modifying examples to test edge cases
4. Practice explaining tradeoffs out loud
5. Review the original docs in `key_technologies/redis/original.md`

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
