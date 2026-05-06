import type { RedisClientType } from 'redis';

export interface Logger {
  info(message: string): void;
  success(message: string): void;
  error(message: string): void;
  warning(message: string): void;
  step(message: string): void;
  command(command: string, result?: string): void;
  production(message: string): void;
  assert(condition: boolean, successMessage: string, failMessage?: string): void;
  section(title: string): void;
}

export interface Example {
  name: string;
  description: string;
  run: (client: RedisClientType, logger: Logger) => Promise<void>;
  cleanup?: (client: RedisClientType) => Promise<void>;
}

export interface TechnologyClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
  reset(): Promise<void>;
}

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  url?: string;
}
