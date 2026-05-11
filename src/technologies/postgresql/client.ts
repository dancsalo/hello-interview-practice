import { Client } from 'pg';
import type { TechnologyClient } from '../../lib/types.js';

export class PostgreSQLClient implements TechnologyClient {
  private client: Client | null = null;
  private host: string;
  private port: number;
  private user: string;
  private password: string;
  private database: string;

  constructor() {
    this.host = process.env.POSTGRES_HOST || 'localhost';
    this.port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
    this.user = process.env.POSTGRES_USER || 'demo';
    this.password = process.env.POSTGRES_PASSWORD || 'demo';
    this.database = process.env.POSTGRES_DB || 'ecommerce';
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = new Client({
      host: this.host,
      port: this.port,
      user: this.user,
      password: this.password,
      database: this.database,
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.end();
      this.client = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  async reset(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    // Drop all tables in public schema
    await this.client.query(`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO ${this.user};
      GRANT ALL ON SCHEMA public TO public;
    `);
  }

  getClient(): Client {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }
    return this.client;
  }
}
