import type { RedisClientType } from 'redis';
import type { Client } from 'pg';
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

export interface Example<TClient = RedisClientType> {
  name: string;
  description: string;
  run: (client: TClient, logger: Logger) => Promise<void>;
  cleanup?: (client: TClient) => Promise<void>;
}

export type RedisExample = Example<RedisClientType>;
export type PostgreSQLExample = Example<Client>;
export type KafkaExample = Example<any>;

export interface FlinkExample {
  name: string;
  description: string;
  run(client: any, logger: Logger): Promise<void>;
}

export interface FlinkJobSubmission {
  jobId: string;
  status: 'CREATED' | 'RUNNING' | 'FINISHED' | 'FAILED' | 'CANCELED';
}

export interface FlinkJobStatus {
  jobId: string;
  status: string;
  startTime: number;
  endTime?: number;
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
