import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { CassandraClient } from './client.js';

describe('CassandraClient', () => {
  let client: CassandraClient;

  beforeAll(async () => {
    client = new CassandraClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should connect successfully', async () => {
    const isHealthy = await client.healthCheck();
    expect(isHealthy).toBe(true);
  });

  it('should return client instance', () => {
    const cassandraClient = client.getClient();
    expect(cassandraClient).toBeDefined();
  });
});
