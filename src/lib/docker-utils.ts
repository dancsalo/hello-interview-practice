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
    ];

    // Map display names to actual docker-compose service names
    const serviceNameMap: Record<string, string> = {
      'Redis': 'redis',
      'PostgreSQL': 'postgres',
      'RedisInsight': 'redis-insight',
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
