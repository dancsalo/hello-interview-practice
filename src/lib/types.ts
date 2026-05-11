import type { RedisClientType } from 'redis';
import type { Producer, Consumer, Admin } from 'kafkajs';

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

export interface RedisExample {
  name: string;
  description: string;
  run: (client: RedisClientType, logger: Logger) => Promise<void>;
  cleanup?: (client: RedisClientType) => Promise<void>;
}

export interface KafkaExample {
  name: string;
  description: string;
  run: (client: any, logger: Logger) => Promise<void>;
}

export type Example = RedisExample | KafkaExample;

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
