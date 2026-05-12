import { Client } from '@elastic/elasticsearch';

async function resetElasticsearch() {
  const client = new Client({
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  });

  console.log('🔄 Resetting Elasticsearch data...');

  try {
    await client.indices.delete({
      index: '*,-.*',
      ignore_unavailable: true,
      allow_no_indices: true,
    });

    console.log('✅ Elasticsearch data reset successfully');
  } catch (error) {
    console.error('❌ Failed to reset Elasticsearch:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

resetElasticsearch();