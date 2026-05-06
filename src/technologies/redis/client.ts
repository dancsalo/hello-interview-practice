import { createClient, RedisClientType } from 'redis';
import type { TechnologyClient } from '../../lib/types.js';

export class RedisClient implements TechnologyClient {
  private client: RedisClientType | null = null;
  private host: string;
  private port: number;

  constructor() {
    this.host = process.env.REDIS_HOST || 'localhost';
    this.port = parseInt(process.env.REDIS_PORT || '6379', 10);
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.client = createClient({
      socket: {
        host: this.host,
        port: this.port,
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            return new Error('Max reconnection attempts reached');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      const pong = await this.client.ping();
      return pong === 'PONG';
    } catch (error) {
      return false;
    }
  }

  async reset(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    await this.client.flushAll();
  }

  getClient(): RedisClientType {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }
    return this.client;
  }
}
