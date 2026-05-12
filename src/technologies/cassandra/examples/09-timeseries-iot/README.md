# Time-Series IoT Data

## What This Demonstrates

- Sensor data schema with time-based partition keys
- Daily, hourly, and monthly bucket strategies
- TTL for automatic data expiration
- Range queries within time windows
- High write volume handling
- Multi-sensor deployment and distribution

## Why This Matters

Time-series data (IoT sensors, metrics, logs) is one of Cassandra's strongest use cases. The combination of write-optimized architecture, time-based bucketing, and TTL creates an ideal platform for high-ingestion, bounded-retention data. This pattern appears frequently in system design interviews for monitoring, IoT, and analytics systems.

## How It Works

### Schema Design

```cql
CREATE TABLE sensor_data (
  sensor_id text,
  date text,              -- YYYY-MM-DD bucket
  reading_time timestamp,  -- Clustering key
  temperature decimal,
  humidity decimal,
  battery_level int,
  PRIMARY KEY ((sensor_id, date), reading_time)
) WITH CLUSTERING ORDER BY (reading_time DESC)
AND default_time_to_live = 2592000;  -- 30 days
```

Design decisions:
- **Partition key**: `(sensor_id, date)` = one partition per sensor per day
- **Clustering key**: `reading_time DESC` = most recent first
- **TTL**: 30 days = automatic expiration

### Query Patterns

**Single day (most common, fastest):**
```cql
SELECT * FROM sensor_data WHERE sensor_id = ? AND date = '2026-05-11';
```

**Time window within day:**
```cql
SELECT * FROM sensor_data
WHERE sensor_id = ? AND date = '2026-05-11'
AND reading_time >= '2026-05-11 08:00:00'
AND reading_time <= '2026-05-11 12:00:00';
```

**Multi-day range (application-level):**
```typescript
const dates = ['2026-05-09', '2026-05-10', '2026-05-11'];
for (const date of dates) {
  const data = await client.execute(
    'SELECT * FROM sensor_data WHERE sensor_id = ? AND date = ?',
    [sensorId, date]
  );
  results.push(...data.rows);
}
```

## Key Concepts

### Bucket Size Selection

| Write Rate | Recommended Bucket | Rows/Partition | Size |
|-----------|-------------------|---------------|------|
| 10/sec | Hourly | 36,000 | ~1.8 MB |
| 1/sec | Daily | 86,400 | ~4.3 MB |
| 1/min | Daily | 1,440 | ~72 KB |
| 1/hour | Monthly | 720 | ~36 KB |

**Rule of thumb**: Aim for 1K-100K rows per partition, under 100 MB.

### TTL (Time-To-Live)

How TTL works:
1. Each cell has an expiration timestamp
2. After TTL seconds, data becomes a tombstone
3. Compaction removes expired data permanently
4. No manual DELETE jobs needed

Benefits:
- Automatic data lifecycle management
- Disk space reclaimed without operator intervention
- Eliminates tombstone accumulation (data just expires)
- Combine with TWCS for optimal efficiency

### Time-Window Compaction Strategy (TWCS)

TWCS is ideal for time-series with TTL:
- Groups SSTables by time window
- When ALL data in an SSTable expires, the entire file is dropped
- No compaction I/O needed for expired windows
- Most storage-efficient strategy for bounded-retention data

### Partition Distribution

1000 sensors * 365 days = 365,000 partitions per year:
- Excellent distribution across cluster
- No hot partitions (each sensor is independent)
- Linear scalability with more sensors

## Production Considerations

- **Compaction**: Use TWCS with window matching your bucket size
- **TTL alignment**: Set TTL to match retention policy (30 days, 90 days, etc.)
- **Write batching**: For >10 readings/sec per sensor, batch into single mutation
- **Consistency level**: CL=ONE for max write throughput (IoT data is idempotent)
- **Monitoring**: Track partition sizes, pending compactions, SSTable count
- **Multi-DC**: Async replication for disaster recovery

## Interview Tips

### Common Questions

**Q: "How would you design a sensor data storage system?"**
A: Partition by (sensor_id, date) with timestamp as clustering key. Daily buckets for 1/min readings, hourly for 1/sec. TTL for automatic expiration. TWCS compaction. Cassandra handles high write volume naturally via LSM trees.

**Q: "How do you handle data retention?"**
A: Use TTL on the table (default_time_to_live). Data automatically expires after the retention period. Combined with TWCS, entire SSTables are dropped when all data expires - no compaction needed, most efficient approach.

**Q: "How does this scale to millions of sensors?"**
A: Each sensor+date combination is a separate partition. 1M sensors * 365 days = 365M partitions, distributed across the cluster by consistent hashing. Linear scalability - add nodes to handle more sensors.

**Q: "What about range queries across many days?"**
A: Application queries each day's partition separately and merges results. Most queries are "recent data" (today or last hour) = single partition. Historical queries span more partitions but are less frequent.

### Key Takeaways

1. Time-series is a classic Cassandra use case
2. Time-based bucketing prevents unbounded partition growth
3. TTL eliminates operational burden of data cleanup
4. TWCS compaction drops entire expired SSTables (most efficient)
5. Write-optimized architecture handles millions of writes/second
6. Partition per sensor per time bucket = excellent cluster distribution

## Further Reading

- [Time-Window Compaction](https://cassandra.apache.org/doc/latest/cassandra/operating/compaction/twcs.html)
- [TTL and Expiration](https://cassandra.apache.org/doc/latest/cassandra/cql/dml.html#expiring-data)
- [IoT Data Modeling](https://docs.datastax.com/en/dse/6.8/cql/cql/cql_using/useIOT.html)
