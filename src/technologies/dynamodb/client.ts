import { DynamoDBClient, ListTablesCommand, DeleteTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import type { TechnologyClient, DynamoDBClients } from '../../lib/types.js';

export class DynamoDBClientWrapper implements TechnologyClient {
  private client: DynamoDBClient | null = null;
  private docClient: DynamoDBDocumentClient | null = null;
  private readonly endpoint: string;
  private readonly region: string;
  private readonly credentials: { accessKeyId: string; secretAccessKey: string };

  constructor() {
    this.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
    this.region = process.env.AWS_REGION || 'us-east-1';
    this.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
    };
  }

  async connect(): Promise<void> {
    if (this.client) {
      return; // Already connected
    }

    this.client = new DynamoDBClient({
      endpoint: this.endpoint,
      region: this.region,
      credentials: this.credentials,
    });

    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.destroy();
      this.client = null;
      this.docClient = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.client.send(new ListTablesCommand({}));
      return true;
    } catch (error) {
      console.error('DynamoDB health check failed:', error);
      return false;
    }
  }

  async reset(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    try {
      const { TableNames } = await this.client.send(new ListTablesCommand({}));

      if (TableNames && TableNames.length > 0) {
        for (const tableName of TableNames) {
          try {
            await this.client.send(new DeleteTableCommand({ TableName: tableName }));
          } catch (error) {
            console.error(`Failed to delete table ${tableName}:`, error);
            // Continue deleting other tables
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to reset DynamoDB: ${error}`);
    }
  }

  getClients(): DynamoDBClients {
    if (!this.client || !this.docClient) {
      throw new Error('Clients not initialized. Call connect() first.');
    }
    return {
      client: this.client,
      docClient: this.docClient,
    };
  }
}