import { Client } from '@elastic/elasticsearch';
import type { TechnologyClient } from '../../lib/types.js';

export class ElasticsearchClient implements TechnologyClient {
  private client: Client | null = null;
  private url: string;

  constructor() {
    this.url = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = new Client({
      node: this.url,
      requestTimeout: 120000, // 120 seconds for slow disk operations
      maxRetries: 3,
    });

    // Verify connection
    await this.client.ping();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const health = await this.client.cluster.health();
      return health.status !== 'red';
    } catch (error) {
      return false;
    }
  }

  async reset(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    await this.client.indices.delete({
      index: '*,-.*',
      ignore_unavailable: true,
      allow_no_indices: true,
    });
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }
    return this.client;
  }
}
