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
        url: 'http://localhost:8080',
      },
      {
        name: 'Flink JobManager',
        healthy: false,
        url: 'http://localhost:8081',
      },
      {
        name: 'Flink TaskManager',
        healthy: false,
      },
    ];

    // Map display names to actual docker-compose service names
    const serviceNameMap: Record<string, string> = {
      'Redis': 'redis',
      'PostgreSQL': 'postgres',
      'RedisInsight': 'redis-insight',
      'Kafka': 'kafka',
      'Zookeeper': 'zookeeper',
      'Kafka UI': 'kafka-ui',
      'Flink JobManager': 'flink-jobmanager',
      'Flink TaskManager': 'flink-taskmanager',
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
   * Reset Flink by cancelling all running jobs
   */
  static async resetFlink(): Promise<void> {
    try {
      // Get all running job IDs
      const { stdout } = await execAsync(
        'curl -s http://localhost:8081/jobs | jq -r \'.jobs[] | select(.status == "RUNNING") | .id\''
      );

      const jobIds = stdout.trim().split('\n').filter(id => id.length > 0);

      for (const jobId of jobIds) {
        await execAsync(`curl -X PATCH http://localhost:8081/jobs/${jobId}`);
      }
    } catch (error) {
      // No jobs to cancel or command failed - that's okay
    }
  }

  /**
   * Reset all services
   */
  static async resetAll(): Promise<void> {
    await this.resetRedis();
    await this.resetPostgres();
    await this.resetKafka();
    await this.resetFlink();
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
