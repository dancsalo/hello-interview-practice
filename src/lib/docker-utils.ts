import { exec } from 'child_process';
import { promisify } from 'util';
import type { ServiceHealth } from './types.js';

const execAsync = promisify(exec);

export class DockerUtils {
  /**
   * Wait for a service to be healthy with timeout
   */
  static async waitForService(
    serviceName: string,
    timeoutMs = 30000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { stdout } = await execAsync(
          `docker-compose ps --format json ${serviceName}`
        );
        const service = JSON.parse(stdout);

        if (service.Health === 'healthy' || service.State === 'running') {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Check Redis health
   */
  static async checkRedisHealth(): Promise<ServiceHealth> {
    try {
      const healthy = await this.waitForService('redis', 5000);
      return {
        name: 'Redis',
        healthy,
      };
    } catch (error) {
      return {
        name: 'Redis',
        healthy: false,
      };
    }
  }

  /**
   * Check PostgreSQL health
   */
  static async checkPostgresHealth(): Promise<ServiceHealth> {
    try {
      const healthy = await this.waitForService('postgres', 5000);
      return {
        name: 'PostgreSQL',
        healthy,
      };
    } catch (error) {
      return {
        name: 'PostgreSQL',
        healthy: false,
      };
    }
  }

  /**
   * Check Elasticsearch health
   */
  static async checkElasticsearchHealth(): Promise<ServiceHealth> {
    try {
      const response = await fetch('http://localhost:9200/_cluster/health');
      if (!response.ok) {
        return {
          name: 'Elasticsearch',
          healthy: false,
          url: 'http://localhost:9200',
        };
      }
      const data = await response.json() as { status?: string };
      return {
        name: 'Elasticsearch',
        healthy: data.status !== 'red',
        url: 'http://localhost:9200',
      };
    } catch (error) {
      return {
        name: 'Elasticsearch',
        healthy: false,
        url: 'http://localhost:9200',
      };
    }
  }

  /**
   * Check Kibana health
   */
  static async checkKibanaHealth(): Promise<ServiceHealth> {
    try {
      const response = await fetch('http://localhost:5601/api/status');
      if (!response.ok) {
        return {
          name: 'Kibana',
          healthy: false,
          url: 'http://localhost:5601',
        };
      }
      const data = await response.json() as { status?: { overall?: { level?: string } } };
      return {
        name: 'Kibana',
        healthy: data.status?.overall?.level === 'available',
        url: 'http://localhost:5601',
      };
    } catch (error) {
      return {
        name: 'Kibana',
        healthy: false,
        url: 'http://localhost:5601',
      };
    }
  }

  /**
   * Check health of all required services
   */
  static async checkServices(): Promise<ServiceHealth[]> {
    const services: ServiceHealth[] = [
      {
        name: 'Redis',
        healthy: false,
      },
      {
        name: 'PostgreSQL',
        healthy: false,
      },
      {
        name: 'RedisInsight',
        healthy: false,
        url: 'http://localhost:8001',
      },
      {
        name: 'Elasticsearch',
        healthy: false,
      },
      {
        name: 'Kibana',
        healthy: false,
        url: 'http://localhost:5601',
      },
      {
        name: 'Kafka',
        healthy: false,
      },
      {
        name: 'Zookeeper',
        healthy: false,
      },
      {
        name: 'Kafka UI',
        healthy: false,
        url: 'http://localhost:8002',
      },
      {
        name: 'DynamoDB Local',
        healthy: false,
      },
      {
        name: 'DynamoDB Admin',
        healthy: false,
        url: 'http://localhost:8004',
      },
      {
        name: 'Cassandra',
        healthy: false,
      },
    ];

    // Map display names to actual docker-compose service names
    const serviceNameMap: Record<string, string> = {
      'Redis': 'redis',
      'PostgreSQL': 'postgres',
      'RedisInsight': 'redis-insight',
      'Elasticsearch': 'elasticsearch',
      'Kibana': 'kibana',
      'Kafka': 'kafka',
      'Zookeeper': 'zookeeper',
      'Kafka UI': 'kafka-ui',
      'DynamoDB Local': 'dynamodb-local',
      'DynamoDB Admin': 'dynamodb-admin',
      'Cassandra': 'cassandra',
    };

    for (const service of services) {
      const serviceName = serviceNameMap[service.name];
      service.healthy = await this.waitForService(serviceName, 5000);
    }

    return services;
  }

  /**
   * Reset Redis data by executing FLUSHALL
   */
  static async resetRedis(): Promise<void> {
    try {
      await execAsync('docker exec system-design-redis redis-cli FLUSHALL');
    } catch (error) {
      throw new Error(`Failed to reset Redis: ${error}`);
    }
  }

  /**
   * Reset PostgreSQL by dropping and recreating database
   */
  static async resetPostgres(): Promise<void> {
    try {
      // Drop all tables in the database
      await execAsync(
        `docker exec system-design-postgres psql -U demo -d ecommerce -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`
      );
    } catch (error) {
      throw new Error(`Failed to reset PostgreSQL: ${error}`);
    }
  }

  /**
   * Reset Elasticsearch by deleting all indices
   */
  static async resetElasticsearch(): Promise<void> {
    try {
      await execAsync(
        'docker exec system-design-elasticsearch curl -X DELETE "localhost:9200/*?pretty" -H "Content-Type: application/json"'
      );
    } catch (error) {
      // No indices to delete or command failed - that's okay
    }
  }

  /**
   * Reset Kafka by deleting all topics
   */
  static async resetKafka(): Promise<void> {
    try {
      await execAsync(
        'docker exec system-design-kafka kafka-topics --bootstrap-server localhost:9092 --list | grep -v "^__" | xargs -I {} kafka-topics --bootstrap-server localhost:9092 --delete --topic {}'
      );
    } catch (error) {
      // No topics to delete or command failed - that's okay
    }
  }

  /**
   * Reset Cassandra by dropping all non-system keyspaces
   */
  static async resetCassandra(): Promise<void> {
    try {
      // Get list of all keyspaces and drop non-system ones
      const { stdout } = await execAsync(
        `docker exec system-design-cassandra cqlsh -e "SELECT keyspace_name FROM system_schema.keyspaces;" | grep -v "^\\s*keyspace_name" | grep -v "^\\s*-" | grep -v "^\\s*$" | grep -v "system"`
      );

      const keyspaces = stdout.trim().split('\n').filter(k => k.trim());

      for (const keyspace of keyspaces) {
        const k = keyspace.trim();
        if (k && !k.startsWith('system')) {
          await execAsync(
            `docker exec system-design-cassandra cqlsh -e "DROP KEYSPACE IF EXISTS ${k};"`
          );
        }
      }
    } catch (error) {
      // No keyspaces to delete or command failed - that's okay
    }
  }

  /**
   * Reset all services
   */
  static async resetAll(): Promise<void> {
    await this.resetRedis();
    await this.resetPostgres();
    await this.resetElasticsearch();
    await this.resetKafka();
    await this.resetCassandra();
  }

  /**
   * Get service status for troubleshooting
   */
  static async getServiceStatus(): Promise<string> {
    try {
      const { stdout } = await execAsync('docker-compose ps');
      return stdout;
    } catch (error) {
      return `Error getting service status: ${error}`;
    }
  }
}
