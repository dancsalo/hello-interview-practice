import { Client, types } from 'cassandra-driver';
import type { TechnologyClient } from '../../lib/types.js';

export class CassandraClient implements TechnologyClient {
  private client: Client | null = null;
  private host: string;
  private port: number;
  private localDataCenter: string;

  constructor() {
    this.host = process.env.CASSANDRA_HOST || 'localhost';
    this.port = parseInt(process.env.CASSANDRA_PORT || '9042', 10);
    this.localDataCenter = process.env.CASSANDRA_DC || 'datacenter1';
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = new Client({
      contactPoints: [this.host],
      localDataCenter: this.localDataCenter,
      keyspace: 'system',
      protocolOptions: {
        port: this.port,
      },
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.shutdown();
      this.client = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const result = await this.client.execute('SELECT cluster_name FROM system.local');
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }

  async reset(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    // Get all keyspaces
    const result = await this.client.execute(
      'SELECT keyspace_name FROM system_schema.keyspaces'
    );

    // Drop non-system keyspaces
    for (const row of result.rows) {
      const keyspace = row.keyspace_name;
      if (!keyspace.startsWith('system')) {
        await this.client.execute(`DROP KEYSPACE IF EXISTS ${keyspace}`);
      }
    }
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }
    return this.client;
  }
}

// Re-export types for convenience
export { types };
