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
    return Promise.all([
      this.checkRedisHealth(),
      this.checkElasticsearchHealth(),
      this.checkKibanaHealth(),
      this.checkPostgresHealth(),
    ]);
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
   * Reset all services
   */
  static async resetAll(): Promise<void> {
    await this.resetRedis();
    await this.resetPostgres();
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
