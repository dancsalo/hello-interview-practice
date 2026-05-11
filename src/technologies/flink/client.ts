import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import type { FlinkJobSubmission, FlinkJobStatus, FlinkJobStatusType } from '../../lib/types.js';

export class FlinkClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8081') {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/overview`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async getOverview(): Promise<{ taskmanagers: number; slots: number; 'slots-available': number }> {
    try {
      const response = await axios.get(`${this.baseUrl}/overview`);
      return {
        taskmanagers: response.data['taskmanagers'],
        slots: response.data['slots-total'],
        'slots-available': response.data['slots-available'],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get Flink overview: ${error.message}`);
      }
      throw error;
    }
  }

  async uploadJar(jarPath: string): Promise<{ filename: string; status: string }> {
    try {
      if (!fs.existsSync(jarPath)) {
        throw new Error(`JAR file not found: ${jarPath}`);
      }

      const formData = new FormData();
      formData.append('jarfile', fs.createReadStream(jarPath), {
        filename: path.basename(jarPath),
      });

      const response = await axios.post(`${this.baseUrl}/jars/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      return {
        filename: response.data.filename,
        status: response.data.status,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to upload JAR: ${error.message}`);
      }
      throw error;
    }
  }

  async submitJob(
    jarId: string,
    entryClass?: string,
    programArgs?: string
  ): Promise<FlinkJobSubmission> {
    try {
      const params: Record<string, string> = {};
      if (entryClass) {
        params.entry_class = entryClass;
      }
      if (programArgs) {
        params.program_args = programArgs;
      }

      const response = await axios.post(
        `${this.baseUrl}/jars/${jarId}/run`,
        null,
        { params }
      );

      return {
        jobId: response.data.jobid,
        status: this.mapFlinkStatus(response.data.status),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to submit job: ${error.message}`);
      }
      throw error;
    }
  }

  async listJobs(): Promise<FlinkJobStatus[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/jobs`);
      const jobs = response.data.jobs || [];

      return jobs.map((job: any) => ({
        jobId: job.id,
        status: this.mapFlinkStatus(job.status),
        startTime: job['start-time'] || 0,
        endTime: job['end-time'],
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to list jobs: ${error.message}`);
      }
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<FlinkJobStatus> {
    try {
      const response = await axios.get(`${this.baseUrl}/jobs/${jobId}`);

      return {
        jobId: response.data.jid,
        status: this.mapFlinkStatus(response.data.state),
        startTime: response.data['start-time'] || 0,
        endTime: response.data['end-time'],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get job status: ${error.message}`);
      }
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<{ status: string }> {
    try {
      const response = await axios.patch(`${this.baseUrl}/jobs/${jobId}`, null, {
        params: { mode: 'cancel' },
      });

      return {
        status: response.data.status || 'success',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to cancel job: ${error.message}`);
      }
      throw error;
    }
  }

  private mapFlinkStatus(status: string): FlinkJobStatusType {
    const upperStatus = status.toUpperCase();

    switch (upperStatus) {
      case 'CREATED':
        return 'CREATED';
      case 'RUNNING':
        return 'RUNNING';
      case 'FINISHED':
        return 'FINISHED';
      case 'FAILED':
        return 'FAILED';
      case 'CANCELED':
      case 'CANCELLED':
        return 'CANCELED';
      default:
        // Default to CREATED for unknown statuses
        return 'CREATED';
    }
  }
}
