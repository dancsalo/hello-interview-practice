import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@elastic/elasticsearch';
import { StepByStepLogger } from '../src/lib/step-by-step-logger.js';
import { ELASTICSEARCH_EXAMPLES } from '../src/technologies/elasticsearch/index.js';

describe('Elasticsearch Examples', () => {
  let client: Client;
  let logger: StepByStepLogger;

  beforeAll(async () => {
    client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    });
    logger = new StepByStepLogger();

    await waitForElasticsearch(client, 30000);
  });

  afterAll(async () => {
    await client.close();
  });

  for (const example of ELASTICSEARCH_EXAMPLES) {
    it(`should run ${example.name} without errors`, async () => {
      await example.run(client, logger, { nonInteractive: true });
      await example.cleanup?.(client);
      expect(logger.hasErrors()).toBe(false);
    });
  }
});

async function waitForElasticsearch(client: Client, timeout: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      await client.cluster.health();
      return;
    } catch {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Elasticsearch not ready');
}
