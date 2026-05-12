import type { FlinkClient } from '../../client.js';
import type { FlinkExample, Logger } from '../../../../lib/types.js';

export const statelessOperatorsExample: FlinkExample = {
  name: 'Stateless Operators: Map, Filter, FlatMap',
  description: 'Understanding stateless transformations in Flink DataStream API',

  async run(client: FlinkClient, logger: Logger): Promise<void> {
    logger.section('🔄 Flink Stateless Operators: Map, Filter, FlatMap');
    logger.info('Understanding stateless transformations in stream processing\n');

    // Step 1: Explain Stateless vs Stateful
    logger.step('Step 1: Understanding Stateless Operations');
    logger.info('Stateless operators process each element independently:');
    logger.info('  • No memory between events');
    logger.info('  • Each input produces output(s) without looking at other events');
    logger.info('  • Can be parallelized easily across partitions');
    logger.production('Stateless operators scale horizontally without coordination overhead\n');

    // Step 2: Map Operator
    logger.step('Step 2: Map Operator - One-to-One Transformation');
    logger.info('Map transforms each element into exactly one output element:');
    logger.command('// Example: Convert strings to uppercase');
    logger.command('DataStream<String> input = env.fromElements("hello", "world");');
    logger.command('DataStream<String> uppercase = input.map(value -> value.toUpperCase());');
    logger.command('// Result: ["HELLO", "WORLD"]');
    logger.production('Map is ideal for field transformations, parsing, or enrichment\n');

    logger.info('Common map use cases:');
    logger.info('  • Parse JSON strings to objects');
    logger.info('  • Extract fields from complex structures');
    logger.info('  • Apply calculations (e.g., temperature conversion)');
    logger.info('  • Format timestamps or data types\n');

    // Step 3: Filter Operator
    logger.step('Step 3: Filter Operator - Conditional Selection');
    logger.info('Filter selects elements based on a boolean condition:');
    logger.command('// Example: Keep only long strings');
    logger.command('DataStream<String> input = env.fromElements("hi", "hello", "world");');
    logger.command('DataStream<String> filtered = input.filter(value -> value.length() > 3);');
    logger.command('// Result: ["hello", "world"]');
    logger.production('Filter reduces data volume by dropping unwanted events\n');

    logger.info('Common filter use cases:');
    logger.info('  • Remove invalid or malformed events');
    logger.info('  • Keep only events matching business criteria');
    logger.info('  • Filter by time ranges or geographic regions');
    logger.info('  • Data quality checks and validation\n');

    // Step 4: FlatMap Operator
    logger.step('Step 4: FlatMap Operator - One-to-Many Transformation');
    logger.info('FlatMap transforms each element into zero or more output elements:');
    logger.command('// Example: Split sentences into words');
    logger.command('DataStream<String> sentences = env.fromElements("hello world", "apache flink");');
    logger.command('DataStream<String> words = sentences.flatMap(');
    logger.command('  (String sentence, Collector<String> out) -> {');
    logger.command('    for (String word : sentence.split(" ")) {');
    logger.command('      out.collect(word);');
    logger.command('    }');
    logger.command('  }');
    logger.command(');');
    logger.command('// Result: ["hello", "world", "apache", "flink"]');
    logger.production('FlatMap is powerful for expanding nested data or splitting records\n');

    logger.info('Common flatMap use cases:');
    logger.info('  • Split delimited records (CSV, logs)');
    logger.info('  • Explode arrays or nested structures');
    logger.info('  • Generate multiple events from one input');
    logger.info('  • Conditional expansion (0 or more outputs)\n');

    // Step 5: Operator Chaining
    logger.step('Step 5: Chaining Operators Together');
    logger.info('Operators can be chained for complex transformations:');
    logger.command('// Example: Parse log lines, filter errors, extract timestamps');
    logger.command('DataStream<String> logs = env.addSource(new LogSource());');
    logger.command('DataStream<LogEvent> parsed = logs');
    logger.command('  .map(line -> parseLogLine(line))           // Parse to object');
    logger.command('  .filter(event -> event.level == "ERROR")   // Keep only errors');
    logger.command('  .map(event -> event.timestamp);            // Extract field');
    logger.production('Chained operators form an execution pipeline within the same task\n');

    logger.info('Operator chaining benefits:');
    logger.info('  • Reduced serialization/deserialization overhead');
    logger.info('  • Lower network transfer between operators');
    logger.info('  • Better CPU cache locality');
    logger.info('  • Flink automatically chains compatible operators\n');

    // Step 6: Practical Example - Complete Pipeline
    logger.step('Step 6: Complete Stateless Pipeline Example');
    logger.info('Building a sensor data processing pipeline:');
    logger.command('// Input: Raw sensor readings as JSON strings');
    logger.command('DataStream<String> rawData = env.addSource(new SensorSource());');
    logger.command('');
    logger.command('// Pipeline:');
    logger.command('DataStream<Alert> alerts = rawData');
    logger.command('  .map(json -> parseSensorReading(json))              // String -> SensorReading');
    logger.command('  .filter(reading -> reading.value != null)           // Remove invalid readings');
    logger.command('  .map(reading -> convertUnits(reading))              // Fahrenheit -> Celsius');
    logger.command('  .filter(reading -> reading.temperature > 100)       // Detect high temperature');
    logger.command('  .map(reading -> new Alert(reading.sensorId, "HIGH_TEMP")); // Create alert');
    logger.command('');
    logger.command('alerts.addSink(new AlertSink());');
    logger.production('Each operator processes records independently and in parallel\n');

    // Step 7: Parallelism in Stateless Operators
    logger.step('Step 7: Parallelism and Performance');
    logger.info('Stateless operators can scale to arbitrary parallelism:');
    logger.command('// Set parallelism for an operator');
    logger.command('DataStream<Result> results = input');
    logger.command('  .map(value -> expensiveTransform(value))');
    logger.command('  .setParallelism(16);  // 16 parallel instances');
    logger.production('Each parallel instance processes a partition of the stream independently\n');

    logger.info('Parallelism considerations:');
    logger.info('  • Higher parallelism = more throughput (up to a limit)');
    logger.info('  • Limited by available task slots in the cluster');
    logger.info('  • Stateless operators have no coordination overhead');
    logger.info('  • Balance parallelism with network shuffle costs\n');

    // Step 8: Performance Tips
    logger.step('Step 8: Performance Best Practices');
    logger.info('Optimizing stateless operator performance:');
    logger.info('  ✓ Use map for simple transformations (faster than flatMap)');
    logger.info('  ✓ Filter early to reduce data volume downstream');
    logger.info('  ✓ Avoid heavy computation in operators (use async I/O for external calls)');
    logger.info('  ✓ Let Flink chain operators automatically (don\'t disable unless needed)');
    logger.info('  ✓ Use appropriate serializers (Avro, Protobuf) for complex types');
    logger.production('Well-designed pipelines can process millions of events per second\n');

    // Summary
    logger.success('\n✓ Stateless operators demonstrated!');
    logger.info('Key Concepts:');
    logger.info('  • Map: One-to-one transformations (element -> element)');
    logger.info('  • Filter: Conditional selection (element -> true/false)');
    logger.info('  • FlatMap: One-to-many transformations (element -> 0+ elements)');
    logger.info('  • Operators can be chained for complex pipelines');
    logger.info('  • Stateless operations scale horizontally without coordination');
    logger.info('  • Operator chaining optimizes performance automatically\n');

    logger.info('Note: Phase 1 demonstrates operators conceptually.');
    logger.info('Actual JAR compilation and execution will be added in future phases.\n');
  },
};
