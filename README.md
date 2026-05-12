# System Design Technology Examples

An interactive learning platform for mastering system design technologies through hands-on examples. Built for students preparing for system design interviews who want to go beyond theory and actually run the patterns they're learning about.

## Quick Start

Get up and running in under 60 seconds:

```bash
# 1. Create environment file (optional, uses defaults if skipped)
cp .env.example .env

# 2. Start Docker services
docker-compose up -d

# 3. Install dependencies
npm install

# 4. Launch interactive CLI
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
- ✅ **DynamoDB** (8 examples) - NoSQL key-value, indexing, consistency, transactions, single-table design
- ✅ **Elasticsearch** (10 examples) - Full-text search, geospatial, aggregations, complex queries, and more
- ✅ **Kafka** (2 examples) - Event streaming, partitioning, message ordering
- ✅ **Cassandra** (10 examples) - Wide-column NoSQL, partitioning, replication, data modeling, real-world patterns
- ✅ **Flink** (3 examples in Phase 1, 10 total planned) - Stateful stream processing with event-time semantics

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
│       ├── redis/              # Redis examples (10)
│       ├── postgresql/         # PostgreSQL examples (7)
│       ├── dynamodb/           # DynamoDB examples (8)
│       ├── elasticsearch/      # Elasticsearch examples (10)
│       ├── kafka/              # Kafka examples (2)
│       ├── cassandra/          # Cassandra examples (10)
│       └── flink/              # Flink examples (3 in Phase 1, 10 total planned)
├── scripts/
│   ├── test-all-examples.ts       # Run all integration tests
│   ├── test-redis-examples.ts     # Test Redis examples
│   ├── test-postgres-examples.ts  # Test PostgreSQL examples
│   ├── test-dynamodb-examples.ts  # Test DynamoDB examples
│   ├── test-elasticsearch-examples.ts # Test Elasticsearch examples
│   ├── test-kafka-examples.ts     # Test Kafka examples
│   ├── test-cassandra-examples.ts # Test Cassandra examples
│   ├── test-flink-examples.ts     # Test Flink examples
│   ├── reset-redis.ts             # Reset Redis data
│   ├── reset-postgres.ts          # Reset PostgreSQL data
│   ├── reset-dynamodb.ts          # Reset DynamoDB data
│   ├── reset-elasticsearch.ts     # Reset Elasticsearch data
│   ├── reset-kafka.ts             # Reset Kafka data
│   ├── reset-cassandra.ts         # Reset Cassandra data
│   ├── reset-flink.ts             # Reset Flink data
│   └── reset-all.ts               # Reset all services
├── docs/superpowers/           # Technology documentation
└── docker-compose.yml          # All services
```

## Available Commands

```bash
npm start                    # Launch interactive CLI
npm run dev                  # Development mode with watch
npm test                     # Test all examples (Redis, PostgreSQL, DynamoDB, Elasticsearch, Kafka, Cassandra, Flink)
npm run test:redis           # Test Redis examples only
npm run test:postgres        # Test PostgreSQL examples only
npm run test:dynamodb        # Test DynamoDB examples only
npm run test:elasticsearch   # Test Elasticsearch examples only
npm run test:kafka           # Test Kafka examples only
npm run test:cassandra       # Test Cassandra examples only
npm run test:flink           # Test Flink examples only
npm run reset                # Reset all service data
npm run reset:redis          # Reset only Redis data
npm run reset:postgres       # Reset only PostgreSQL data
npm run reset:dynamodb       # Reset only DynamoDB data
npm run reset:elasticsearch  # Reset only Elasticsearch data
npm run reset:kafka          # Reset only Kafka topics
npm run reset:cassandra      # Reset only Cassandra data
npm run reset:flink          # Reset only Flink data
npm run docker:up            # Start Docker services
npm run docker:down          # Stop Docker services
npm run docker:reset         # Recreate services from scratch
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

## Elasticsearch Examples

The Elasticsearch technology includes 10 comprehensive examples:

1. **Basics** - Core concepts (indexing, searching, mappings, analyzers)
2. **Full-Text Search** - Text analysis, matching, and relevance scoring
3. **Geospatial Search** - Location-based queries and geo_point data
4. **Aggregations** - Analytics, bucketing, and metrics
5. **Complex Queries** - Bool queries, nested documents, filtering
6. **Sorting & Pagination** - Result navigation and performance
7. **Document Versioning** - Concurrent updates and optimistic locking
8. **Faceted Search** - Multi-dimensional filtering and navigation
9. **Index Management** - Mappings, reindexing, and index lifecycle
10. **Production Patterns** - CDC, sync strategies, and performance optimization

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key Elasticsearch commands
- Production considerations
- Further reading

See `src/technologies/elasticsearch/README.md` for more details.

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

## Cassandra Examples

The Cassandra technology includes 10 comprehensive examples:

**Phase 1: Core Interview Topics**

1. **Basics & CQL** - Keyspaces, tables, CRUD operations, data types, collections
2. **Primary Key Design** - Partition keys, clustering keys, compound keys, query patterns
3. **Partitioning Strategy** - Consistent hashing, token ranges, hot partition avoidance
4. **Replication & Consistency** - Replication factors, consistency levels, CAP theorem tradeoffs
5. **Write-Optimized Architecture** - LSM trees, commit log, memtables, SSTables, compaction
6. **Query-Driven Data Modeling** - Denormalization strategies, multiple tables per entity

**Phase 2: Real-World Interview Scenarios**

7. **Discord Messages** - Chat/messaging systems with partition bucketing
8. **Ticketmaster Tickets** - Event ticketing with section-based partitioning
9. **Time-Series IoT** - Sensor/metrics data with time-windowed queries and TTL
10. **E-Commerce Catalog** - Multi-access patterns with SAIs vs denormalization

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key CQL commands
- Production considerations
- Interview tips
- Further reading

See `src/technologies/cassandra/README.md` for more details.

## DynamoDB Examples

The DynamoDB technology includes comprehensive examples:

1. **Basics** - CRUD operations, Query vs Scan, partition/sort keys

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key DynamoDB concepts
- Production considerations
- DynamoDB vs alternatives (Cassandra, MongoDB, PostgreSQL, Redis)
- Further reading

See `src/technologies/dynamodb/README.md` for more details.

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

### Elasticsearch
- **Port**: 9200
- **UI**: Kibana at http://localhost:5601
- **Image**: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
- **Memory**: 1GB limit for development

### PostgreSQL
- **Port**: 5433
- **User**: demo / demo
- **Database**: ecommerce
- **Image**: postgres:16-alpine

### DynamoDB Local
- **Port**: 8000
- **UI**: dynamodb-admin at http://localhost:8004
- **Image**: amazon/dynamodb-local (official AWS image)

### Kafka
- **Port**: 9092 (Broker)
- **UI**: Kafka UI at http://localhost:8002
- **Image**: confluentinc/cp-kafka:7.5.0
- **Requires**: Zookeeper (auto-started)

### Cassandra
- **Port**: 9042 (CQL native protocol)
- **UI**: Cassandra Web at http://localhost:8003
- **Image**: cassandra:4.1
- **Use**: Wide-column NoSQL, high availability, write-heavy workloads, flexible schemas

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
- 9200 (Elasticsearch)
- 5601 (Kibana)
- 5433 (PostgreSQL)
- 9092, 9093 (Kafka)
- 2181 (Zookeeper)
- 8081 (Flink JobManager)

To customize, create a `.env` file:

```bash
REDIS_PORT=6380
REDIS_INSIGHT_PORT=8002
ELASTICSEARCH_PORT=9201
KIBANA_PORT=5602
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
docker-compose logs elasticsearch

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
npm run reset:dynamodb
npm run reset:elasticsearch
npm run reset:kafka
npm run reset:cassandra
npm run reset:flink
```

## Learning Path

**For beginners:**
1. Start with Redis Basics to understand core data structures
2. Move to Cache to see practical application
3. Try Distributed Lock to understand coordination
4. Explore PostgreSQL Basics to understand SQL fundamentals
5. Explore Elasticsearch Basics for search fundamentals
6. Explore other patterns based on interest

**For interview prep:**
1. Run all Redis examples to understand distributed patterns
2. Run all PostgreSQL examples to understand SQL patterns
3. Run all Elasticsearch examples to understand search patterns
4. Explore Kafka and Flink examples to understand stream processing
5. Read the production considerations in each README
6. Try modifying examples to test edge cases
7. Practice explaining tradeoffs out loud
8. Review the technology READMEs for interview context

**For building systems:**
1. Understand when NOT to use each pattern
2. Pay attention to failure modes
3. Consider the alternatives mentioned
4. Think about how patterns compose
5. Check RedisInsight, Kibana, DynamoDB Admin, and Cassandra Web to visualize data
6. Use Flink JobManager UI (http://localhost:8081) to monitor stream processing jobs

**Stream processing path:**
1. Start with Kafka Basics to understand message streaming
2. Learn Kafka Partitioning for scalability and ordering
3. Move to Flink Basics to process streams with transformations
4. Explore Flink Stateless Operators for data manipulation
5. Study Flink Stateful Processing for windowing and aggregations

## Why This Exists

System design interviews require depth, not breadth. Instead of knowing a little about many technologies, you're better off deeply understanding a few versatile ones. This project covers core technologies that appear in most distributed systems:

- **Redis** - Cache, locks, pub/sub, and more versatile patterns
- **PostgreSQL** - Relational data, transactions, and SQL optimization
- **DynamoDB** - NoSQL key-value store, single-table design
- **Elasticsearch** - Full-text search, analytics, geospatial queries
- **Kafka** - Message streaming and event-driven architectures
- **Cassandra** - Wide-column NoSQL, high availability, write-heavy workloads
- **Flink** - Stateful stream processing and real-time analytics

This project lets you:
- Actually run the patterns instead of just reading about them
- See the data with RedisInsight, Kibana, DynamoDB Admin, Cassandra Web, and Flink JobManager UI
- Experiment with edge cases
- Build muscle memory for interviews
- Understand how technologies compose together

Running code beats reading slides.

## Contributing

This is an educational project. Contributions welcome for:
- New examples for existing technologies (Redis, PostgreSQL, DynamoDB, Elasticsearch, Kafka, Cassandra, Flink)
- New technologies
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
