import * as zookeeper from 'node-zookeeper-client';
import type { TechnologyClient } from '../../lib/types.js';

export interface Stat {
  czxid: Buffer;
  mzxid: Buffer;
  ctime: Buffer;
  mtime: Buffer;
  version: number;
  cversion: number;
  aversion: number;
  ephemeralOwner: Buffer;
  dataLength: number;
  numChildren: number;
  pzxid: Buffer;
}

export enum CreateMode {
  PERSISTENT = 0,
  EPHEMERAL = 1,
  PERSISTENT_SEQUENTIAL = 2,
  EPHEMERAL_SEQUENTIAL = 3,
}

export class ZooKeeperClient implements TechnologyClient {
  private client: zookeeper.Client | null = null;
  private connectionString: string;
  private sessionTimeout: number;

  constructor() {
    this.connectionString = process.env.ZOOKEEPER_HOST || 'localhost:2181';
    this.sessionTimeout = parseInt(process.env.ZOOKEEPER_SESSION_TIMEOUT || '10000', 10);
  }

  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.client = zookeeper.createClient(this.connectionString, {
        sessionTimeout: this.sessionTimeout,
        retries: 3,
      });

      const timeout = setTimeout(() => {
        this.client = null;
        reject(new Error('Connection timeout'));
      }, 5000);

      const handleConnected = () => {
        clearTimeout(timeout);
        resolve();
      };

      this.client.once('connected', handleConnected);
      this.client.once('connectedReadOnly', handleConnected);

      this.client.on('disconnected', () => {
        console.warn('ZooKeeper client disconnected');
      });

      this.client.on('expired', () => {
        console.warn('ZooKeeper session expired');
      });

      this.client.connect();
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.close();
      this.client = null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) {
      return false;
    }

    try {
      await this.exists('/');
      return true;
    } catch (error) {
      return false;
    }
  }

  async reset(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const children = await this.getChildren('/');
    for (const child of children) {
      if (child.startsWith('demo-') || child.startsWith('test-')) {
        await this.deleteRecursive(`/${child}`);
      }
    }
  }

  getClient(): zookeeper.Client {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }
    return this.client;
  }

  async create(path: string, data: Buffer, mode: CreateMode): Promise<string> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.create(path, data, mode, (error, createdPath) => {
        if (error) {
          reject(error);
        } else {
          resolve(createdPath);
        }
      });
    });
  }

  async getData(path: string, watch: boolean = false): Promise<{ data: Buffer; stat: Stat }> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    return new Promise((resolve, reject) => {
      if (watch) {
        // If watch is true, we need to provide a watcher function (empty for now)
        this.client!.getData(path, () => {}, (error, data, stat) => {
          if (error) {
            reject(error);
          } else {
            resolve({ data, stat: stat as unknown as Stat });
          }
        });
      } else {
        this.client!.getData(path, (error, data, stat) => {
          if (error) {
            reject(error);
          } else {
            resolve({ data, stat: stat as unknown as Stat });
          }
        });
      }
    });
  }

  async setData(path: string, data: Buffer, version: number = -1): Promise<Stat> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.setData(path, data, version, (error, stat) => {
        if (error) {
          reject(error);
        } else {
          resolve(stat as unknown as Stat);
        }
      });
    });
  }

  async getChildren(path: string, watch: boolean = false): Promise<string[]> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    return new Promise((resolve, reject) => {
      if (watch) {
        this.client!.getChildren(path, () => {}, (error, children) => {
          if (error) {
            reject(error);
          } else {
            resolve(children);
          }
        });
      } else {
        this.client!.getChildren(path, (error, children) => {
          if (error) {
            reject(error);
          } else {
            resolve(children);
          }
        });
      }
    });
  }

  async exists(path: string, watch: boolean = false): Promise<Stat | null> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    return new Promise((resolve, reject) => {
      if (watch) {
        this.client!.exists(path, () => {}, (error, stat) => {
          if (error) {
            reject(error);
          } else {
            resolve(stat ? (stat as unknown as Stat) : null);
          }
        });
      } else {
        this.client!.exists(path, (error, stat) => {
          if (error) {
            reject(error);
          } else {
            resolve(stat ? (stat as unknown as Stat) : null);
          }
        });
      }
    });
  }

  async remove(path: string, version: number = -1): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    return new Promise((resolve, reject) => {
      this.client!.remove(path, version, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async ensurePath(path: string): Promise<void> {
    const parts = path.split('/').filter((p) => p);
    let currentPath = '';

    for (const part of parts) {
      currentPath += `/${part}`;
      const stat = await this.exists(currentPath);
      if (!stat) {
        try {
          await this.create(currentPath, Buffer.from(''), CreateMode.PERSISTENT);
        } catch (error: any) {
          if (error.name !== 'NODE_EXISTS') {
            throw error;
          }
        }
      }
    }
  }

  async deleteRecursive(path: string): Promise<void> {
    try {
      const children = await this.getChildren(path);
      for (const child of children) {
        await this.deleteRecursive(`${path}/${child}`);
      }
      await this.remove(path);
    } catch (error: any) {
      if (error.name !== 'NO_NODE') {
        throw error;
      }
    }
  }
}
