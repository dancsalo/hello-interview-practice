import type { FlinkClient } from '../../client.js';
import type { FlinkExample, Logger } from '../../../../lib/types.js';

export const basicsExample: FlinkExample = {
  name: 'Basics: DataStream API & Job Submission',
  description: 'Core Flink concepts - DataStream API, sources, sinks, and job lifecycle',

  async run(client: FlinkClient, logger: Logger): Promise<void> {
    logger.section('🌊 Flink Basics: DataStream API & Job Submission');
    logger.info('Understanding the fundamentals of Apache Flink stream processing\n');

    // Step 1: Explain the Flink Architecture
    logger.step('Step 1: Understanding Flink Job Structure');
    logger.info('Flink jobs follow a simple pattern:');
    logger.info('  Source → Operators → Sink\n');
    logger.production('Sources ingest data, operators transform it, sinks write results\n');

    // Step 2: Demonstrate DataStream API Concepts
    logger.step('Step 2: DataStream API Concepts');
    logger.info('DataStream API is Flink\'s core abstraction for processing streams:');
    logger.command('// Example DataStream job structure (Java)');
    logger.command('StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();');
    logger.command('DataStream<String> stream = env.addSource(new FlinkKafkaConsumer<>(...));');
    logger.command('stream.map(value -> transform(value)).addSink(new FlinkKafkaSink<>(...));');
    logger.command('env.execute("My Flink Job");');
    logger.production('DataStream represents an immutable stream of records that can be transformed\n');

    // Step 3: Explain Job Submission Workflow
    logger.step('Step 3: Job Submission Workflow');
    logger.info('In production, Flink jobs are submitted as compiled JARs:');
    logger.command('1. Package job as JAR: mvn clean package');
    logger.command('2. Upload JAR: client.uploadJar(jarPath)');
    logger.command('3. Submit job: client.submitJob(jarId, entryClass)');
    logger.command('4. Monitor status: client.getJobStatus(jobId)');
    logger.production('JAR contains compiled Java/Scala code with job definition\n');

    // Step 4: Check Cluster Status
    logger.step('Step 4: Checking Cluster Status');
    try {
      const overview = await client.getOverview();
      logger.command('client.getOverview()');
      logger.info(`TaskManagers: ${overview.taskmanagers}`);
      logger.info(`Total slots: ${overview.slots}`);
      logger.info(`Available slots: ${overview['slots-available']}`);
      logger.assert(overview.taskmanagers > 0, 'Flink cluster is running with TaskManagers');
      logger.production('TaskManagers execute tasks; slots are units of parallelism\n');
    } catch (error) {
      logger.error(`Failed to get cluster status: ${error}`);
      throw error;
    }

    // Step 5: List Running Jobs
    logger.step('Step 5: Viewing Job Status');
    try {
      const jobs = await client.listJobs();
      logger.command('client.listJobs()');
      if (jobs.length === 0) {
        logger.info('No jobs currently running');
      } else {
        for (const job of jobs) {
          logger.info(`Job ${job.jobId}: ${job.status}`);
        }
      }
      logger.production('Jobs can be in states: CREATED, RUNNING, FINISHED, FAILED, CANCELED\n');
    } catch (error) {
      logger.error(`Failed to list jobs: ${error}`);
      throw error;
    }

    // Step 6: Explain Job Lifecycle
    logger.step('Step 6: Job Lifecycle Management');
    logger.info('Flink job lifecycle:');
    logger.command('CREATED → RUNNING → FINISHED');
    logger.info('  or');
    logger.command('CREATED → RUNNING → FAILED');
    logger.info('  or');
    logger.command('CREATED → RUNNING → CANCELED');
    logger.production('Jobs can be canceled, savepointed, and restarted from checkpoints\n');

    // Summary
    logger.success('\n✓ Flink basics demonstrated!');
    logger.info('Key Concepts:');
    logger.info('  • DataStream API provides functional transformations on streams');
    logger.info('  • Jobs are compiled to JARs and submitted to the cluster');
    logger.info('  • Source → Operators → Sink pattern');
    logger.info('  • TaskManagers execute tasks in parallel slots');
    logger.info('  • Jobs have lifecycle states and can be monitored via REST API\n');

    logger.info('Note: Phase 1 demonstrates the workflow conceptually.');
    logger.info('Actual JAR compilation and execution will be added in future phases.\n');
  },
};
