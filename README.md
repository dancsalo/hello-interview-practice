# System Architecture Stack Components

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

- **Rancher Desktop** (recommended) or Docker Desktop - All services run in containers
  - **Rancher Desktop** (Free, open-source):
    - Install from [rancherdesktop.io](https://rancherdesktop.io/)
    - Select **dockerd (moby)** as the container runtime during setup
    - Open-source and free for commercial use
  - **Docker Desktop** (Alternative, requires license for commercial use):
    - Install from [docker.com](https://www.docker.com/products/docker-desktop/)
    - Note: Free for personal/education use, requires paid license for companies with 250+ employees or $10M+ revenue
  - **Resource Requirements** (applies to both):
    - **Memory**: Minimum 8GB RAM allocated to Docker
    - **Disk Space**: Minimum 20GB free in Docker virtual disk
    - **CPUs**: 4+ cores recommended
  - **Configure Resources**:
    - **Rancher Desktop**: Preferences → Virtual Machine → Memory/CPUs/Disk
    - **Docker Desktop**: Settings → Resources
    - Recommended settings:
      - **Memory**: 8GB minimum (16GB recommended)
      - **Disk**: 100GB minimum
      - **CPUs**: 4 or more
- **Docker Compose** - Included with both Rancher Desktop and Docker Desktop
- **Node.js >= 18.x** - For running the interactive examples (v20.11.0+ recommended)
  - Note: Node.js v22+ will be required starting January 2027 for AWS SDK compatibility

## What's Inside

### Technologies

- ✅ **Redis** (10 examples) - Cache, distributed locks, leaderboards, rate limiting, pub/sub, and more
- ✅ **PostgreSQL** (7 examples) - SQL operations, transactions, indexing, read/write scaling, optimization
- ✅ **DynamoDB** (8 examples) - NoSQL key-value, indexing, consistency, transactions, single-table design
- ✅ **Elasticsearch** (10 examples) - Full-text search, geospatial, aggregations, complex queries, and more
- ✅ **Kafka** (2 examples) - Event streaming, partitioning, message ordering
- ✅ **Cassandra** (10 examples) - Wide-column NoSQL, partitioning, replication, data modeling, real-world patterns
- ✅ **ZooKeeper** (8 examples) - Coordination, leader election, distributed locks, service discovery, configuration
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
│       ├── zookeeper/          # ZooKeeper examples (8)
│       └── flink/              # Flink examples (3 in Phase 1, 10 total planned)
├── scripts/
│   ├── test-all-examples.ts       # Run all integration tests
│   ├── test-redis-examples.ts     # Test Redis examples
│   ├── test-postgres-examples.ts  # Test PostgreSQL examples
│   ├── test-dynamodb-examples.ts  # Test DynamoDB examples
│   ├── test-elasticsearch-examples.ts # Test Elasticsearch examples
│   ├── test-kafka-examples.ts     # Test Kafka examples
│   ├── test-cassandra-examples.ts # Test Cassandra examples
│   ├── test-zookeeper-examples.ts # Test ZooKeeper examples
│   ├── test-flink-examples.ts     # Test Flink examples
│   ├── reset-redis.ts             # Reset Redis data
│   ├── reset-postgres.ts          # Reset PostgreSQL data
│   ├── reset-dynamodb.ts          # Reset DynamoDB data
│   ├── reset-elasticsearch.ts     # Reset Elasticsearch data
│   ├── reset-kafka.ts             # Reset Kafka data
│   ├── reset-cassandra.ts         # Reset Cassandra data
│   ├── reset-zookeeper.ts         # Reset ZooKeeper data
│   ├── reset-flink.ts             # Reset Flink data
│   └── reset-all.ts               # Reset all services
├── docs/superpowers/           # Technology documentation
└── docker-compose.yml          # All services
```

## Available Commands

```bash
npm start                    # Launch interactive CLI
npm run dev                  # Development mode with watch
npm test                     # Test all examples (Redis, PostgreSQL, DynamoDB, Elasticsearch, Kafka, Cassandra, ZooKeeper, Flink)
npm run test:redis           # Test Redis examples only
npm run test:postgres        # Test PostgreSQL examples only
npm run test:dynamodb        # Test DynamoDB examples only
npm run test:elasticsearch   # Test Elasticsearch examples only
npm run test:kafka           # Test Kafka examples only
npm run test:cassandra       # Test Cassandra examples only
npm run test:zookeeper       # Test ZooKeeper examples only
npm run test:flink           # Test Flink examples only
npm run reset                # Reset all service data
npm run reset:redis          # Reset only Redis data
npm run reset:postgres       # Reset only PostgreSQL data
npm run reset:dynamodb       # Reset only DynamoDB data
npm run reset:elasticsearch  # Reset only Elasticsearch data
npm run reset:kafka          # Reset only Kafka topics
npm run reset:cassandra      # Reset only Cassandra data
npm run reset:zookeeper      # Reset only ZooKeeper data
npm run reset:flink          # Reset only Flink data
npm run docker:up            # Start Docker services
npm run docker:down          # Stop Docker services
npm run docker:reset         # Recreate services from scratch
```

## Examples by Technology

Each technology includes comprehensive examples with detailed explanations:

- **Redis** (10 examples) - See [src/technologies/redis/README.md](src/technologies/redis/README.md)
- **PostgreSQL** (7 examples) - See [src/technologies/postgresql/README.md](src/technologies/postgresql/README.md)
- **Elasticsearch** (10 examples) - See [src/technologies/elasticsearch/README.md](src/technologies/elasticsearch/README.md)
- **Kafka** (2 examples, 8 more planned) - See [src/technologies/kafka/README.md](src/technologies/kafka/README.md)
- **Cassandra** (10 examples) - See [src/technologies/cassandra/README.md](src/technologies/cassandra/README.md)
- **DynamoDB** (1 example) - See [src/technologies/dynamodb/README.md](src/technologies/dynamodb/README.md)
- **ZooKeeper** (8 examples) - See [src/technologies/zookeeper/README.md](src/technologies/zookeeper/README.md)
- **Flink** (3 examples, 7 more planned) - See [src/technologies/flink/README.md](src/technologies/flink/README.md)

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

### ZooKeeper
- **Port**: 2181
- **Image**: confluentinc/cp-zookeeper:7.5.0
- **Session Timeout**: 10 seconds (configurable via ZOOKEEPER_SESSION_TIMEOUT)

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
5. Focus on ZooKeeper for distributed coordination questions (leader election, locks)
6. Read the production considerations in each README
7. Try modifying examples to test edge cases
8. Practice explaining tradeoffs out loud
9. Review the technology READMEs for interview context

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
- **ZooKeeper** - Distributed coordination, leader election, configuration management
- **Flink** - Stateful stream processing and real-time analytics

This project lets you:
- Actually run the patterns instead of just reading about them
- See the data with RedisInsight, Kibana, DynamoDB Admin, Cassandra Web, and Flink JobManager UI
- Experiment with edge cases
- Build muscle memory for interviews
- Understand how technologies compose together

Running code beats reading slides.

## Troubleshooting

### Docker Disk Space Issues

If you encounter slow performance or failures, check Docker disk usage:

```bash
# Check Docker disk usage
docker system df

# Check Elasticsearch disk space (common bottleneck)
docker exec system-design-elasticsearch df -h /usr/share/elasticsearch/data
```

**If disk usage > 80%**, clean up Docker:

```bash
# Safe cleanup (removes unused images and containers)
docker system prune

# Aggressive cleanup (removes everything not currently running)
# WARNING: This will delete all stopped containers and unused images
docker system prune -a --volumes
```

**Increase disk size:**
- **Rancher Desktop**: Preferences → Virtual Machine → Increase disk size to 150GB+
- **Docker Desktop**: Settings → Resources → Increase "Disk image size" to 150GB+
- Click "Apply & Restart" after changes

### Container Issues

**Check service health:**
```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**View logs for a specific service:**
```bash
docker logs system-design-kafka
docker logs system-design-elasticsearch
```

**Restart a specific service:**
```bash
docker-compose restart kafka
```

**Full restart (if services are unhealthy):**
```bash
docker-compose down
docker-compose up -d
```

### Test Failures

**Run individual technology tests:**
```bash
npm run test:redis
npm run test:postgres
npm run test:kafka
# etc.
```

**Check for missing dependencies:**
```bash
npm install
```

### Port Conflicts

If you see "port already allocated" errors:

```bash
# Check what's using a port (e.g., 9092 for Kafka)
lsof -i :9092

# Either stop the conflicting process or change the port in .env:
cp .env.example .env
# Edit .env and change the port number
```

### Performance Issues

**Memory pressure:**
- Increase Docker memory allocation:
  - **Rancher Desktop**: Preferences → Virtual Machine → Memory
  - **Docker Desktop**: Settings → Resources → Memory
- Minimum: 8GB, Recommended: 16GB

**Elasticsearch slow:**
- Usually caused by low disk space (needs 20%+ free)
- Run `docker system prune -a --volumes` to free space

**Kafka restart loop:**
- Check memory allocation (needs at least 2GB)
- View logs: `docker logs system-design-kafka`

## Contributing

This is an educational project. Contributions welcome for:
- New examples for existing technologies (Redis, PostgreSQL, DynamoDB, Elasticsearch, Kafka, Cassandra, ZooKeeper, Flink)
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
