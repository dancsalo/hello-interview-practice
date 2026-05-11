import { Kafka, Producer, Consumer, Admin } from 'kafkajs';
import type { TechnologyClient } from '../../lib/types.js';

export class KafkaClient implements TechnologyClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private admin: Admin | null = null;
  private consumers: Consumer[] = [];
  private broker: string;

  constructor() {
    this.broker = process.env.KAFKA_BROKER || 'localhost:9092';
    this.kafka = new Kafka({
      clientId: 'system-design-examples',
      brokers: [this.broker],
      retry: {
        retries: 5,
        initialRetryTime: 300,
      },
    });
  }

  async connect(): Promise<void> {
    if (this.producer) {
      return;
    }

    this.producer = this.kafka.producer({
      idempotent: true,
      maxInFlightRequests: 5,
      transactionalId: undefined,
    });

    this.admin = this.kafka.admin();

    await this.producer.connect();
    await this.admin.connect();
  }

  async disconnect(): Promise<void> {
    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }

    if (this.admin) {
      await this.admin.disconnect();
      this.admin = null;
    }

    for (const consumer of this.consumers) {
      await consumer.disconnect();
    }
    this.consumers = [];
  }

  async healthCheck(): Promise<boolean> {
    try {
      if (!this.admin) {
        return false;
      }
      await this.admin.listTopics();
      return true;
    } catch (error) {
      return false;
    }
  }

  async reset(): Promise<void> {
    if (!this.admin) {
      throw new Error('Admin not connected');
    }

    const topics = await this.admin.listTopics();
    const userTopics = topics.filter(
      (t) => !t.startsWith('__') && !t.startsWith('_')
    );

    if (userTopics.length > 0) {
      try {
        await this.admin.deleteTopics({ topics: userTopics });
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('Error resetting Kafka topics:', error);
      }
    }
  }

  getProducer(): Producer {
    if (!this.producer) {
      throw new Error('Producer not connected. Call connect() first.');
    }
    return this.producer;
  }

  getAdmin(): Admin {
    if (!this.admin) {
      throw new Error('Admin not connected. Call connect() first.');
    }
    return this.admin;
  }

  createConsumer(groupId: string): Consumer {
    const consumer = this.kafka.consumer({ groupId });
    this.consumers.push(consumer);
    return consumer;
  }

  async resetTopics(topics: string[]): Promise<void> {
    const admin = this.getAdmin();

    try {
      await admin.deleteTopics({ topics });
    } catch (error) {
      // Topics might not exist, that's okay
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
