import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const timeSeriesExample: Example = {
  name: 'Time Series',
  description: 'Time series data with RedisTimeSeries module',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Example: Time Series Data');
    logger.info('Server metrics: CPU usage, memory, request rate\n');

    const cpuKey = 'metrics:cpu:server1';
    const memoryKey = 'metrics:memory:server1';
    const requestsKey = 'metrics:requests:server1';

    // Check if RedisTimeSeries module is available
    try {
      await client.sendCommand(['TS.CREATE', cpuKey, 'RETENTION', '3600000', 'LABELS', 'server', 'server1', 'metric', 'cpu']);
      logger.command('TS.CREATE metrics:cpu:server1 RETENTION 3600000 LABELS server server1 metric cpu');
      logger.info('Created time series: 1 hour retention\n');
    } catch (error: any) {
      if (error.message.includes('unknown command') || error.message.includes('WRONGTYPE')) {
        logger.warning('⚠️  RedisTimeSeries module not available');
        logger.info('Install with: docker run -p 6379:6379 redis/redis-stack-server');
        logger.info('\nContinuing with simulated time series behavior...\n');

        await demonstrateTimeSeriesConcept(client, logger);
        return;
      } else if (!error.message.includes('key already exists')) {
        throw error;
      }
      logger.info('Time series already exists\n');
    }

    // Create memory and requests time series
    try {
      await client.sendCommand(['TS.CREATE', memoryKey, 'RETENTION', '3600000', 'LABELS', 'server', 'server1', 'metric', 'memory']);
      await client.sendCommand(['TS.CREATE', requestsKey, 'RETENTION', '3600000', 'LABELS', 'server', 'server1', 'metric', 'requests']);
    } catch (error: any) {
      if (!error.message.includes('key already exists')) {
        throw error;
      }
    }

    // Step 1: Add Data Points
    logger.step('Step 1: Record Metrics (TS.ADD)');

    const now = Date.now();
    const dataPoints = [
      { time: now - 300000, cpu: 45, memory: 2048, requests: 120 },
      { time: now - 240000, cpu: 52, memory: 2156, requests: 145 },
      { time: now - 180000, cpu: 48, memory: 2089, requests: 132 },
      { time: now - 120000, cpu: 61, memory: 2234, requests: 178 },
      { time: now - 60000, cpu: 58, memory: 2198, requests: 165 },
      { time: now, cpu: 55, memory: 2178, requests: 152 },
    ];

    for (const dp of dataPoints) {
      await client.sendCommand(['TS.ADD', cpuKey, dp.time.toString(), dp.cpu.toString()]);
      await client.sendCommand(['TS.ADD', memoryKey, dp.time.toString(), dp.memory.toString()]);
      await client.sendCommand(['TS.ADD', requestsKey, dp.time.toString(), dp.requests.toString()]);
    }

    logger.command(`TS.ADD ${cpuKey} ${now} 55`);
    logger.command(`TS.ADD ${memoryKey} ${now} 2178`);
    logger.command(`TS.ADD ${requestsKey} ${now} 152`);
    logger.success(`Added ${dataPoints.length} data points for each metric\n`);

    // Step 2: Query Time Range
    logger.step('Step 2: Query Time Range (TS.RANGE)');

    const fiveMinutesAgo = now - 300000;
    const cpuData = await client.sendCommand(['TS.RANGE', cpuKey, fiveMinutesAgo.toString(), now.toString()]);

    logger.command(`TS.RANGE ${cpuKey} ${fiveMinutesAgo} ${now}`);
    logger.info('CPU usage over last 5 minutes:');

    if (Array.isArray(cpuData)) {
      cpuData.forEach((point: any) => {
        const timestamp = new Date(parseInt(point[0])).toLocaleTimeString();
        const value = point[1];
        logger.info(`  ${timestamp}: ${value}%`);
      });
    }
    logger.success('');

    // Step 3: Aggregation
    logger.step('Step 3: Aggregated Queries (TS.RANGE with AGGREGATION)');

    const avgCpu = await client.sendCommand([
      'TS.RANGE',
      cpuKey,
      fiveMinutesAgo.toString(),
      now.toString(),
      'AGGREGATION',
      'AVG',
      '60000', // 1 minute buckets
    ]);

    logger.command(`TS.RANGE ${cpuKey} ${fiveMinutesAgo} ${now} AGGREGATION AVG 60000`);
    logger.info('Average CPU per minute:');

    if (Array.isArray(avgCpu)) {
      avgCpu.forEach((point: any) => {
        const timestamp = new Date(parseInt(point[0])).toLocaleTimeString();
        const value = parseFloat(point[1]).toFixed(2);
        logger.info(`  ${timestamp}: ${value}%`);
      });
    }
    logger.success('');

    // Step 4: Multiple Aggregation Types
    logger.step('Step 4: Different Aggregation Types');

    const aggregations = ['MIN', 'MAX', 'AVG', 'SUM', 'COUNT'];
    logger.info('Request count aggregations over 5 minutes:\n');

    for (const agg of aggregations) {
      const result = await client.sendCommand([
        'TS.RANGE',
        requestsKey,
        fiveMinutesAgo.toString(),
        now.toString(),
        'AGGREGATION',
        agg,
        '300000', // Full 5 minute window
      ]);

      if (Array.isArray(result) && result.length > 0) {
        const firstPoint = result[0];
        if (Array.isArray(firstPoint) && firstPoint.length > 1) {
          const value = firstPoint[1];
          logger.info(`  ${agg}: ${value}`);
        }
      }
    }
    logger.success('');

    // Step 5: Compaction Rules
    logger.step('Step 5: Downsampling with Compaction Rules');
    logger.info('Create aggregated time series for long-term storage\n');

    const cpuAvgKey = 'metrics:cpu:server1:avg_1m';

    try {
      await client.sendCommand(['TS.CREATE', cpuAvgKey, 'RETENTION', '86400000']); // 24h retention
      await client.sendCommand(['TS.CREATERULE', cpuKey, cpuAvgKey, 'AGGREGATION', 'AVG', '60000']);

      logger.command(`TS.CREATE ${cpuAvgKey} RETENTION 86400000`);
      logger.command(`TS.CREATERULE ${cpuKey} ${cpuAvgKey} AGGREGATION AVG 60000`);
      logger.success('Compaction rule: 1-minute averages, 24h retention');
      logger.production('Raw data: 1h retention, Aggregated: 24h retention = storage efficiency\n');
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        logger.info('Compaction rule already exists\n');
      } else {
        throw error;
      }
    }

    // Step 6: Multi-Series Query
    logger.step('Step 6: Query Multiple Series (TS.MRANGE)');

    const allMetrics = await client.sendCommand([
      'TS.MRANGE',
      fiveMinutesAgo.toString(),
      now.toString(),
      'AGGREGATION',
      'AVG',
      '60000',
      'FILTER',
      'server=server1',
    ]);

    logger.command('TS.MRANGE <from> <to> AGGREGATION AVG 60000 FILTER server=server1');
    logger.info('All server1 metrics (averaged per minute):\n');

    if (Array.isArray(allMetrics)) {
      allMetrics.forEach((series: any) => {
        if (Array.isArray(series) && series.length >= 3) {
          const key = series[0];
          const labels = series[1];
          const data = series[2];

          if (Array.isArray(labels)) {
            const metricLabel = labels.find((l: any) => Array.isArray(l) && l[0] === 'metric');
            const metricName = metricLabel && Array.isArray(metricLabel) ? metricLabel[1] : 'unknown';

            logger.info(`  ${metricName}:`);
            if (Array.isArray(data) && data.length > 0) {
              const lastPoint = data[data.length - 1];
              if (Array.isArray(lastPoint) && lastPoint.length > 1) {
                const value = parseFloat(String(lastPoint[1])).toFixed(2);
                logger.info(`    Latest: ${value}`);
              }
            }
          }
        }
      });
    }
    logger.success('');

    // Step 7: Latest Value
    logger.step('Step 7: Get Latest Value (TS.GET)');

    const latestCpu = await client.sendCommand(['TS.GET', cpuKey]);
    logger.command(`TS.GET ${cpuKey}`);

    if (Array.isArray(latestCpu) && latestCpu.length >= 2) {
      const tsValue = latestCpu[0];
      const timestamp = new Date(parseInt(String(tsValue))).toLocaleTimeString();
      const value = latestCpu[1];
      logger.info(`Latest CPU: ${value}% at ${timestamp}\n`);
    }

    // Step 8: Info
    logger.step('Step 8: Time Series Info (TS.INFO)');

    const info = await client.sendCommand(['TS.INFO', cpuKey]);
    logger.command(`TS.INFO ${cpuKey}`);

    if (Array.isArray(info)) {
      logger.info('Time series information:');
      for (let i = 0; i < info.length; i += 2) {
        const key = info[i];
        const value = info[i + 1];
        if (key === 'totalSamples' || key === 'memoryUsage' || key === 'retentionTime') {
          logger.info(`  ${key}: ${value}`);
        }
      }
    }
    logger.success('');

    logger.production('\nProduction Considerations:');
    logger.production('- TS.ADD: O(1) insertion');
    logger.production('- TS.RANGE: O(n) where n = points in range');
    logger.production('- Set retention policies to auto-delete old data');
    logger.production('- Use compaction rules for downsampling (save space)');
    logger.production('- Labels enable multi-series queries and filtering');
    logger.production('- Aggregations: MIN, MAX, AVG, SUM, COUNT, FIRST, LAST, STD.P, STD.S, VAR.P, VAR.S');
    logger.production('- Consider dedicated TSDBs (InfluxDB, TimescaleDB) for large scale');
    logger.production('- RedisTimeSeries good for: real-time dashboards, hot data, simple queries');
    logger.production('- Memory: ~24 bytes per sample (very efficient!)\n');

    logger.success('✓ Time series patterns demonstrated!');
  },
};

// Simulated time series demonstration when RedisTimeSeries is not available
async function demonstrateTimeSeriesConcept(client: RedisClientType, logger: Logger): Promise<void> {
  logger.step('Simulated Time Series Demonstration');
  logger.info('Using sorted sets to demonstrate concept\n');

  const metricsKey = 'metrics:cpu:demo';

  // Add data points using sorted set (timestamp as score)
  const now = Date.now();
  const dataPoints = [
    { time: now - 300000, value: 45 },
    { time: now - 240000, value: 52 },
    { time: now - 180000, value: 48 },
    { time: now - 120000, value: 61 },
    { time: now - 60000, value: 58 },
    { time: now, value: 55 },
  ];

  for (const dp of dataPoints) {
    await client.zAdd(metricsKey, { score: dp.time, value: `cpu:${dp.value}` });
  }

  logger.info(`Added ${dataPoints.length} data points\n`);

  // Query time range
  logger.step('Query Time Range');

  const fiveMinutesAgo = now - 300000;
  const range = await client.zRangeByScoreWithScores(metricsKey, fiveMinutesAgo, now);

  logger.info('CPU usage over last 5 minutes:');
  range.forEach(point => {
    const timestamp = new Date(point.score).toLocaleTimeString();
    const value = point.value.split(':')[1];
    logger.info(`  ${timestamp}: ${value}%`);
  });

  logger.production('\n\nReal Time Series Benefits (when module available):');
  logger.production('- Built-in aggregations (AVG, MIN, MAX, etc.)');
  logger.production('- Automatic retention and compaction');
  logger.production('- Efficient compression (24 bytes/sample)');
  logger.production('- Multi-series queries with labels');
  logger.production('- Downsampling rules for long-term storage\n');

  logger.success('✓ Time series concept demonstrated!');
}
