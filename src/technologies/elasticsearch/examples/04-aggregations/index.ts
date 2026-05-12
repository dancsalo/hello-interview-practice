import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '../../../../lib/types.js';

export const aggregationsExample = {
  name: 'Aggregations: Analytics & Bucketing',
  description: 'Metrics, bucket aggregations, and analytics queries',

  async run(client: Client, logger: Logger, options?: { nonInteractive?: boolean }): Promise<void> {
    logger.section('📦 Elasticsearch Aggregations: Analytics & Bucketing');
    logger.info('E-commerce order analytics and reporting\n');

    // Create index
    logger.step('Step 1: Create orders index');
    await client.indices.create({
      index: 'orders',
      body: {
        mappings: {
          properties: {
            order_id: { type: 'keyword' },
            customer_id: { type: 'keyword' },
            total: { type: 'float' },
            items: { type: 'integer' },
            order_date: { type: 'date' },
            status: { type: 'keyword' },
          },
        },
      },
    });
    logger.command('PUT /orders', JSON.stringify({
      mappings: {
        properties: {
          order_id: { type: 'keyword' },
          customer_id: { type: 'keyword' },
          total: { type: 'float' },
          items: { type: 'integer' },
          order_date: { type: 'date' },
          status: { type: 'keyword' },
        },
      },
    }, null, 2));
    logger.success('Orders index created\n');

    // Index sample orders
    logger.step('Step 2: Index sample orders');
    await client.bulk({
      body: [
        { index: { _index: 'orders' } },
        {
          order_id: 'ORD-001',
          customer_id: 'CUST-123',
          total: 125.50,
          items: 3,
          order_date: '2026-05-01T10:30:00',
          status: 'completed',
        },
        { index: { _index: 'orders' } },
        {
          order_id: 'ORD-002',
          customer_id: 'CUST-456',
          total: 89.99,
          items: 2,
          order_date: '2026-05-01T14:20:00',
          status: 'completed',
        },
        { index: { _index: 'orders' } },
        {
          order_id: 'ORD-003',
          customer_id: 'CUST-123',
          total: 250.00,
          items: 5,
          order_date: '2026-05-02T09:15:00',
          status: 'completed',
        },
        { index: { _index: 'orders' } },
        {
          order_id: 'ORD-004',
          customer_id: 'CUST-789',
          total: 45.25,
          items: 1,
          order_date: '2026-05-02T16:45:00',
          status: 'pending',
        },
        { index: { _index: 'orders' } },
        {
          order_id: 'ORD-005',
          customer_id: 'CUST-456',
          total: 175.80,
          items: 4,
          order_date: '2026-05-03T11:00:00',
          status: 'completed',
        },
        { index: { _index: 'orders' } },
        {
          order_id: 'ORD-006',
          customer_id: 'CUST-123',
          total: 320.00,
          items: 6,
          order_date: '2026-05-03T13:30:00',
          status: 'completed',
        },
        { index: { _index: 'orders' } },
        {
          order_id: 'ORD-007',
          customer_id: 'CUST-789',
          total: 99.50,
          items: 2,
          order_date: '2026-05-04T08:20:00',
          status: 'cancelled',
        },
        { index: { _index: 'orders' } },
        {
          order_id: 'ORD-008',
          customer_id: 'CUST-456',
          total: 150.75,
          items: 3,
          order_date: '2026-05-04T15:10:00',
          status: 'completed',
        },
      ],
      refresh: 'wait_for',
    });
    logger.command('POST /_bulk', '8 orders indexed');
    logger.success('Sample orders indexed\n');

    // Calculate metrics
    logger.step('Step 3: Calculate order metrics');
    const metricsResult = await client.search({
      index: 'orders',
      body: {
        size: 0,
        aggs: {
          avg_order_value: {
            avg: { field: 'total' },
          },
          total_revenue: {
            sum: { field: 'total' },
          },
          min_order: {
            min: { field: 'total' },
          },
          max_order: {
            max: { field: 'total' },
          },
          total_items: {
            sum: { field: 'items' },
          },
        },
      },
    });
    logger.command('GET /orders/_search', JSON.stringify({
      size: 0,
      aggs: {
        avg_order_value: { avg: { field: 'total' } },
        total_revenue: { sum: { field: 'total' } },
      },
    }, null, 2));
    const aggs = metricsResult.aggregations as any;
    logger.info(`Average Order Value: $${aggs.avg_order_value.value.toFixed(2)}`);
    logger.info(`Total Revenue: $${aggs.total_revenue.value.toFixed(2)}`);
    logger.info(`Min Order: $${aggs.min_order.value.toFixed(2)}`);
    logger.info(`Max Order: $${aggs.max_order.value.toFixed(2)}`);
    logger.info(`Total Items Sold: ${aggs.total_items.value}`);
    logger.assert(aggs.total_revenue.value > 1000, 'Metrics calculated successfully');
    logger.production('size: 0 means no documents returned, only aggregations\n');

    // Group by status
    logger.step('Step 4: Group orders by status (terms bucket)');
    const statusResult = await client.search({
      index: 'orders',
      body: {
        size: 0,
        aggs: {
          orders_by_status: {
            terms: {
              field: 'status',
              size: 10,
            },
            aggs: {
              total_revenue: {
                sum: { field: 'total' },
              },
            },
          },
        },
      },
    });
    logger.command('GET /orders/_search', JSON.stringify({
      size: 0,
      aggs: {
        orders_by_status: {
          terms: { field: 'status' },
          aggs: {
            total_revenue: { sum: { field: 'total' } },
          },
        },
      },
    }, null, 2));
    const statusAggs = statusResult.aggregations as any;
    logger.info('Orders by Status:');
    for (const bucket of statusAggs.orders_by_status.buckets) {
      logger.info(`  - ${bucket.key}: ${bucket.doc_count} orders, $${bucket.total_revenue.value.toFixed(2)} revenue`);
    }
    logger.assert(statusAggs.orders_by_status.buckets.length >= 2, 'Status buckets created');
    logger.production('terms aggregation groups by field values, nested aggs run per bucket\n');

    // Time-series analysis
    logger.step('Step 5: Daily order trends (date_histogram)');
    const trendsResult = await client.search({
      index: 'orders',
      body: {
        size: 0,
        aggs: {
          orders_per_day: {
            date_histogram: {
              field: 'order_date',
              calendar_interval: 'day',
            },
            aggs: {
              daily_revenue: {
                sum: { field: 'total' },
              },
              avg_order_value: {
                avg: { field: 'total' },
              },
            },
          },
        },
      },
    });
    logger.command('GET /orders/_search', JSON.stringify({
      size: 0,
      aggs: {
        orders_per_day: {
          date_histogram: {
            field: 'order_date',
            calendar_interval: 'day',
          },
          aggs: {
            daily_revenue: { sum: { field: 'total' } },
          },
        },
      },
    }, null, 2));
    const trendsAggs = trendsResult.aggregations as any;
    logger.info('Daily Order Trends:');
    for (const bucket of trendsAggs.orders_per_day.buckets) {
      const date = new Date(bucket.key_as_string).toISOString().split('T')[0];
      logger.info(`  - ${date}: ${bucket.doc_count} orders, $${bucket.daily_revenue.value.toFixed(2)} revenue, $${bucket.avg_order_value.value.toFixed(2)} avg`);
    }
    logger.assert(trendsAggs.orders_per_day.buckets.length >= 3, 'Daily trends calculated');
    logger.production('date_histogram useful for time-series dashboards and reporting\n');

    // Customer analysis
    logger.step('Step 6: Top customers by order count');
    const customersResult = await client.search({
      index: 'orders',
      body: {
        size: 0,
        aggs: {
          top_customers: {
            terms: {
              field: 'customer_id',
              size: 5,
              order: { _count: 'desc' },
            },
            aggs: {
              total_spent: {
                sum: { field: 'total' },
              },
              avg_order_value: {
                avg: { field: 'total' },
              },
            },
          },
        },
      },
    });
    logger.command('GET /orders/_search', JSON.stringify({
      size: 0,
      aggs: {
        top_customers: {
          terms: {
            field: 'customer_id',
            size: 5,
            order: { _count: 'desc' },
          },
          aggs: {
            total_spent: { sum: { field: 'total' } },
          },
        },
      },
    }, null, 2));
    const customersAggs = customersResult.aggregations as any;
    logger.info('Top Customers:');
    for (const bucket of customersAggs.top_customers.buckets) {
      logger.info(`  - ${bucket.key}: ${bucket.doc_count} orders, $${bucket.total_spent.value.toFixed(2)} total, $${bucket.avg_order_value.value.toFixed(2)} avg`);
    }
    logger.assert(customersAggs.top_customers.buckets.length >= 3, 'Customer analysis complete');
    logger.production('Combine multiple aggs to build powerful analytics dashboards\n');

    logger.success('\n✓ Aggregations and analytics demonstrated!');
  },

  async cleanup(client: Client): Promise<void> {
    await client.indices.delete({ index: 'orders', ignore_unavailable: true });
  },
};
