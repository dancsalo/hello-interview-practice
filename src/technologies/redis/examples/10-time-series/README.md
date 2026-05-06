# Redis Time Series

## What

Demonstrates time series data management using RedisTimeSeries module for metrics, monitoring, and real-time analytics.

## Why

Time series data is everywhere:
- Server metrics (CPU, memory, disk)
- Application metrics (request rate, latency, errors)
- IoT sensor data (temperature, pressure)
- Financial data (stock prices, trades)
- User analytics (page views, clicks)

RedisTimeSeries provides:
- Fast ingestion (millions of samples/sec)
- Efficient storage (24 bytes per sample)
- Built-in aggregations
- Automatic retention and downsampling
- Real-time queries

## How

The example demonstrates:
1. **TS.CREATE**: Create time series with retention
2. **TS.ADD**: Add data points
3. **TS.RANGE**: Query time range
4. **TS.RANGE with AGGREGATION**: Compute averages, min, max, etc.
5. **TS.CREATERULE**: Set up downsampling
6. **TS.MRANGE**: Query multiple series with labels
7. **TS.GET**: Get latest value
8. **TS.INFO**: Inspect series metadata

## Key Commands

**Note**: Requires RedisTimeSeries module (included in Redis Stack)

- `TS.CREATE key [RETENTION ms] [LABELS label value ...]` - Create series
- `TS.ADD key timestamp value` - Add data point
- `TS.MADD key timestamp value [key timestamp value ...]` - Add multiple
- `TS.RANGE key from to [AGGREGATION type bucket]` - Query range
- `TS.REVRANGE key from to` - Query in reverse
- `TS.MRANGE from to FILTER label=value` - Multi-series query
- `TS.GET key` - Get latest value
- `TS.CREATERULE sourceKey destKey AGGREGATION type bucket` - Downsampling
- `TS.INFO key` - Get metadata
- `TS.ALTER key [RETENTION ms] [LABELS ...]` - Modify series

## Try It

Run the example and observe:
1. Creating time series with retention
2. Adding metric data points
3. Querying time ranges
4. Aggregations (AVG, MIN, MAX)
5. Compaction rules for downsampling
6. Multi-series queries with labels
7. Getting latest values

## Production Considerations

### Time Series vs Regular Data Structures

**Why not use sorted sets?**

```typescript
// Sorted set approach (works but inefficient)
await redis.zAdd('metrics:cpu', { score: timestamp, value: JSON.stringify({ value: 55 }) });
const data = await redis.zRangeByScore('metrics:cpu', from, to);

// Problems:
// - No automatic retention
// - No built-in aggregation
// - No compression (100+ bytes per sample)
// - Manual downsampling
// - No multi-series queries
```

**RedisTimeSeries advantages**:
- Automatic retention and expiration
- Built-in aggregations (AVG, MIN, MAX, etc.)
- Efficient compression (~24 bytes per sample)
- Compaction rules (downsampling)
- Labels for filtering and grouping
- Purpose-built for time series workloads

### Memory Usage

**Storage**: ~24 bytes per sample

```
Timestamp: 8 bytes (64-bit)
Value: 8 bytes (double)
Overhead: ~8 bytes (compression, indexing)
Total: ~24 bytes
```

**Example**:
- 1 metric, 1 sample/sec, 1 hour = 3,600 samples = 86 KB
- 100 metrics, 1 sample/sec, 1 hour = 8.6 MB
- 1,000 metrics, 1 sample/sec, 24 hours = 2 GB

**Comparison**:
- Sorted set: ~100 bytes per sample (4x larger)
- InfluxDB: ~40 bytes per sample (2x larger)
- PostgreSQL: ~100-200 bytes per row

### Retention Policies

**Set retention to auto-delete old data**:

```typescript
// Keep only 1 hour of raw data
await redis.sendCommand(['TS.CREATE', 'metrics:cpu', 'RETENTION', '3600000']);

// 24 hours = 86400000ms
await redis.sendCommand(['TS.CREATE', 'metrics:daily', 'RETENTION', '86400000']);

// 30 days = 2592000000ms
await redis.sendCommand(['TS.CREATE', 'metrics:monthly', 'RETENTION', '2592000000']);
```

**Multi-tier strategy**:
```typescript
// Raw data: 1 hour retention, 1 second granularity
await redis.sendCommand(['TS.CREATE', 'cpu:raw', 'RETENTION', '3600000']);

// 1-minute averages: 24 hour retention
await redis.sendCommand(['TS.CREATE', 'cpu:1m', 'RETENTION', '86400000']);
await redis.sendCommand(['TS.CREATERULE', 'cpu:raw', 'cpu:1m', 'AGGREGATION', 'AVG', '60000']);

// 1-hour averages: 30 day retention
await redis.sendCommand(['TS.CREATE', 'cpu:1h', 'RETENTION', '2592000000']);
await redis.sendCommand(['TS.CREATERULE', 'cpu:1m', 'cpu:1h', 'AGGREGATION', 'AVG', '3600000']);
```

**Result**:
- Real-time: 1-second data for last hour
- Recent: 1-minute data for last day
- Historical: 1-hour data for last month
- Massive space savings

### Compaction Rules (Downsampling)

**Problem**: Raw high-frequency data uses too much space

**Solution**: Aggregate into larger time buckets

```typescript
// Source: raw CPU data
await redis.sendCommand(['TS.CREATE', 'cpu:raw', 'RETENTION', '3600000']);

// Destination: 1-minute averages
await redis.sendCommand(['TS.CREATE', 'cpu:avg_1m', 'RETENTION', '86400000']);

// Rule: automatically aggregate raw data into 1-minute buckets
await redis.sendCommand([
  'TS.CREATERULE',
  'cpu:raw',           // source
  'cpu:avg_1m',        // destination
  'AGGREGATION',
  'AVG',               // aggregation type
  '60000',             // bucket size (1 minute)
]);

// Now when you add to cpu:raw, it automatically updates cpu:avg_1m
await redis.sendCommand(['TS.ADD', 'cpu:raw', '*', '55']);
```

**Aggregation types**:
- `AVG` - Average (most common)
- `SUM` - Total (request counts)
- `MIN` - Minimum (low watermark)
- `MAX` - Maximum (peak usage)
- `COUNT` - Number of samples
- `FIRST` - First value in bucket
- `LAST` - Last value in bucket
- `STD.P` - Population standard deviation
- `STD.S` - Sample standard deviation
- `VAR.P` - Population variance
- `VAR.S` - Sample variance

**Example: Multiple aggregations**:
```typescript
// Keep raw data for 1 hour
await redis.sendCommand(['TS.CREATE', 'requests:raw', 'RETENTION', '3600000']);

// Average requests per minute (24h)
await redis.sendCommand(['TS.CREATE', 'requests:avg_1m', 'RETENTION', '86400000']);
await redis.sendCommand(['TS.CREATERULE', 'requests:raw', 'requests:avg_1m', 'AGGREGATION', 'AVG', '60000']);

// Peak requests per minute (24h)
await redis.sendCommand(['TS.CREATE', 'requests:max_1m', 'RETENTION', '86400000']);
await redis.sendCommand(['TS.CREATERULE', 'requests:raw', 'requests:max_1m', 'AGGREGATION', 'MAX', '60000']);

// Total requests per minute (24h)
await redis.sendCommand(['TS.CREATE', 'requests:sum_1m', 'RETENTION', '86400000']);
await redis.sendCommand(['TS.CREATERULE', 'requests:raw', 'requests:sum_1m', 'AGGREGATION', 'SUM', '60000']);
```

### Labels for Organization

**Labels enable filtering and grouping**:

```typescript
// Server 1 metrics
await redis.sendCommand([
  'TS.CREATE', 'cpu:server1',
  'RETENTION', '3600000',
  'LABELS',
  'server', 'server1',
  'datacenter', 'us-east-1',
  'metric', 'cpu',
]);

await redis.sendCommand([
  'TS.CREATE', 'memory:server1',
  'RETENTION', '3600000',
  'LABELS',
  'server', 'server1',
  'datacenter', 'us-east-1',
  'metric', 'memory',
]);

// Server 2 metrics
await redis.sendCommand([
  'TS.CREATE', 'cpu:server2',
  'RETENTION', '3600000',
  'LABELS',
  'server', 'server2',
  'datacenter', 'us-west-2',
  'metric', 'cpu',
]);

// Query all CPU metrics across all servers
const allCpu = await redis.sendCommand([
  'TS.MRANGE', from, to,
  'FILTER', 'metric=cpu',
]);

// Query all metrics for server1
const server1 = await redis.sendCommand([
  'TS.MRANGE', from, to,
  'FILTER', 'server=server1',
]);

// Query CPU for specific datacenter
const eastCpu = await redis.sendCommand([
  'TS.MRANGE', from, to,
  'FILTER', 'datacenter=us-east-1', 'metric=cpu',
]);
```

### Query Patterns

**1. Latest value** (dashboard, alerts):
```typescript
const [timestamp, value] = await redis.sendCommand(['TS.GET', 'cpu:server1']);
if (value > 80) {
  sendAlert('High CPU usage!');
}
```

**2. Time range** (charts, analysis):
```typescript
const data = await redis.sendCommand([
  'TS.RANGE',
  'cpu:server1',
  (Date.now() - 3600000).toString(), // 1 hour ago
  Date.now().toString(),
]);
```

**3. Aggregated range** (smoothed charts):
```typescript
const avgPerMinute = await redis.sendCommand([
  'TS.RANGE',
  'cpu:server1',
  from, to,
  'AGGREGATION', 'AVG', '60000', // 1-minute buckets
]);
```

**4. Multi-series** (compare servers):
```typescript
const allServers = await redis.sendCommand([
  'TS.MRANGE',
  from, to,
  'FILTER', 'metric=cpu',
  'AGGREGATION', 'AVG', '60000',
]);

// Result: array of series with labels
allServers.forEach(series => {
  const [key, labels, data] = series;
  console.log(`${key}:`, data);
});
```

**5. Reverse range** (most recent first):
```typescript
const recent = await redis.sendCommand([
  'TS.REVRANGE',
  'cpu:server1',
  from, to,
  'COUNT', '10', // Last 10 points
]);
```

### Performance

**Ingestion rate**:
- Single core: ~1M samples/sec
- 4 cores: ~3M samples/sec
- With compaction rules: ~500k samples/sec

**Query performance**:
- TS.GET (latest): < 1ms
- TS.RANGE (1 hour raw): 1-5ms
- TS.RANGE (1 hour aggregated): < 1ms
- TS.MRANGE (10 series): 5-20ms

**Comparison**:
| Database | Ingestion | Query | Use Case |
|----------|-----------|-------|----------|
| RedisTimeSeries | 1M/s | < 1ms | Real-time, hot data |
| InfluxDB | 500k/s | 10-100ms | General purpose |
| TimescaleDB | 100k/s | 50-200ms | SQL, complex queries |
| Prometheus | 100k/s | 100-500ms | Monitoring |

### When to Use RedisTimeSeries

**Good for**:
- Real-time dashboards
- Application metrics (request rate, latency)
- IoT sensor data (real-time)
- Gaming leaderboards over time
- Recent data with fast queries (< 10ms)
- Hot data (last hour/day)

**Not good for**:
- Long-term historical data (years)
- Complex analytical queries
- Very large scale (billions of series)
- Strong durability requirements
- SQL queries and joins

### When to Use Dedicated TSDBs

**InfluxDB**:
- Need SQL-like query language (InfluxQL)
- Long retention (months/years)
- Complex queries (joins, subqueries)
- Larger scale (millions of series)

**TimescaleDB**:
- Already using PostgreSQL
- Need SQL and complex queries
- Transactions and ACID
- Relational data with time series

**Prometheus**:
- Kubernetes/cloud native
- Pull-based metrics collection
- Alerting rules
- Service discovery

### Hybrid Approach

**Best practice**: Use Redis for hot data, archive to TSDB

```typescript
// Real-time: Redis (1 hour)
await redis.sendCommand(['TS.ADD', 'cpu:server1', '*', cpuValue]);

// Archive to InfluxDB every minute
setInterval(async () => {
  const data = await redis.sendCommand([
    'TS.RANGE',
    'cpu:server1',
    (Date.now() - 60000).toString(),
    Date.now().toString(),
  ]);

  await influx.writePoints(data.map(([ts, value]) => ({
    measurement: 'cpu',
    tags: { server: 'server1' },
    fields: { value },
    timestamp: ts,
  })));
}, 60000);
```

**Benefits**:
- Fast real-time queries (Redis)
- Long-term storage (InfluxDB)
- Cost effective (Redis for hot, disk for cold)

### Monitoring

**Metrics to track**:
```typescript
const info = await redis.sendCommand(['TS.INFO', 'cpu:server1']);

// Parse info response
const totalSamples = info[info.indexOf('totalSamples') + 1];
const memoryUsage = info[info.indexOf('memoryUsage') + 1];
const retentionTime = info[info.indexOf('retentionTime') + 1];

logger.metric('timeseries.samples', totalSamples);
logger.metric('timeseries.memory_bytes', memoryUsage);
logger.metric('timeseries.retention_ms', retentionTime);

// Ingestion rate
let addCount = 0;
setInterval(() => {
  logger.metric('timeseries.ingestion_rate', addCount);
  addCount = 0;
}, 60000);
```

**Alerts**:
- Memory usage growing (no retention?)
- Ingestion rate dropping (data loss?)
- Query latency increasing (too much data?)

### Testing

```typescript
describe('Time Series', () => {
  it('stores and retrieves data', async () => {
    await redis.sendCommand(['TS.CREATE', 'test', 'RETENTION', '60000']);

    const ts1 = Date.now();
    await redis.sendCommand(['TS.ADD', 'test', ts1.toString(), '10']);

    const ts2 = ts1 + 1000;
    await redis.sendCommand(['TS.ADD', 'test', ts2.toString(), '20']);

    const data = await redis.sendCommand(['TS.RANGE', 'test', ts1.toString(), ts2.toString()]);
    expect(data).toHaveLength(2);
    expect(data[0][1]).toBe('10');
    expect(data[1][1]).toBe('20');
  });

  it('aggregates data correctly', async () => {
    await redis.sendCommand(['TS.CREATE', 'test', 'RETENTION', '60000']);

    const base = Date.now();
    await redis.sendCommand(['TS.ADD', 'test', base.toString(), '10']);
    await redis.sendCommand(['TS.ADD', 'test', (base + 1000).toString(), '20']);
    await redis.sendCommand(['TS.ADD', 'test', (base + 2000).toString(), '30']);

    const avg = await redis.sendCommand([
      'TS.RANGE', 'test',
      base.toString(), (base + 3000).toString(),
      'AGGREGATION', 'AVG', '5000',
    ]);

    expect(avg).toHaveLength(1);
    expect(parseFloat(avg[0][1])).toBe(20); // Average of 10, 20, 30
  });

  it('respects retention policy', async () => {
    await redis.sendCommand(['TS.CREATE', 'test', 'RETENTION', '1000']); // 1 second

    const old = Date.now() - 2000;
    await redis.sendCommand(['TS.ADD', 'test', old.toString(), '10']);

    await new Promise(resolve => setTimeout(resolve, 1500));

    const data = await redis.sendCommand(['TS.RANGE', 'test', '-', '+']);
    expect(data).toHaveLength(0); // Old data expired
  });
});
```

## Further Reading

- [RedisTimeSeries Documentation](https://redis.io/docs/stack/timeseries/)
- [Time Series Database Comparison](https://db-engines.com/en/system/InfluxDB%3BPrometheus%3BTimescaleDB)
- [Downsampling Strategies](https://docs.influxdata.com/influxdb/v2.0/process-data/downsample-data/)
- [Grafana + Redis Integration](https://grafana.com/grafana/plugins/redis-datasource/)
