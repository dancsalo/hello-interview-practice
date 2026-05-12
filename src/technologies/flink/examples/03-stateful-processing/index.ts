import type { FlinkClient } from '../../client.js';
import type { FlinkExample, Logger } from '../../../../lib/types.js';

export const statefulProcessingExample: FlinkExample = {
  name: 'Stateful Processing: ValueState, ListState, MapState',
  description: 'Understanding stateful transformations and state management in Flink',

  async run(client: FlinkClient, logger: Logger): Promise<void> {
    logger.section('💾 Flink Stateful Processing: ValueState, ListState, MapState');
    logger.info('Understanding stateful transformations in stream processing\n');

    // Step 1: Explain Stateful vs Stateless Processing
    logger.step('Step 1: Stateful vs Stateless Processing');
    logger.info('Stateful processing maintains memory between events:');
    logger.info('  • Stateless: Each event processed independently (map, filter)');
    logger.info('  • Stateful: Operators remember information across events');
    logger.info('  • State is partitioned by key for parallel processing');
    logger.production('Stateful processing enables aggregations, joins, and pattern detection\n');

    logger.info('Why state matters:');
    logger.info('  • Count events per user (running totals)');
    logger.info('  • Track sessions (timeout-based grouping)');
    logger.info('  • Detect patterns (fraud, anomalies)');
    logger.info('  • Join streams (enrich events with context)\n');

    // Step 2: Keyed State Overview
    logger.step('Step 2: Keyed State in Flink');
    logger.info('State is organized by key after using keyBy():');
    logger.command('DataStream<Event> stream = env.addSource(...);');
    logger.command('KeyedStream<Event, String> keyed = stream.keyBy(event -> event.userId);');
    logger.command('// Now each key has its own isolated state');
    logger.production('Each key\'s state is independent and can be processed in parallel\n');

    logger.info('Key benefits:');
    logger.info('  • State is partitioned across parallel tasks');
    logger.info('  • Each key\'s state is isolated (user1 state != user2 state)');
    logger.info('  • Flink manages state lifecycle automatically');
    logger.info('  • State survives failures via checkpointing\n');

    // Step 3: ValueState - Single Value per Key
    logger.step('Step 3: ValueState - Storing a Single Value');
    logger.info('ValueState stores one value per key:');
    logger.command('// Example: Count login events per user');
    logger.command('public class LoginCounter extends RichMapFunction<Event, Alert> {');
    logger.command('  private transient ValueState<Integer> countState;');
    logger.command('  ');
    logger.command('  @Override');
    logger.command('  public void open(Configuration config) {');
    logger.command('    ValueStateDescriptor<Integer> descriptor =');
    logger.command('      new ValueStateDescriptor<>("loginCount", Integer.class);');
    logger.command('    countState = getRuntimeContext().getState(descriptor);');
    logger.command('  }');
    logger.command('  ');
    logger.command('  @Override');
    logger.command('  public Alert map(Event event) throws Exception {');
    logger.command('    Integer count = countState.value();');
    logger.command('    count = (count == null) ? 1 : count + 1;');
    logger.command('    countState.update(count);');
    logger.command('    ');
    logger.command('    if (count > 10) {');
    logger.command('      return new Alert(event.userId, "HIGH_LOGIN_COUNT");');
    logger.command('    }');
    logger.command('    return null;');
    logger.command('  }');
    logger.command('}');
    logger.production('ValueState is perfect for counters, flags, and single aggregated values\n');

    logger.info('Common ValueState use cases:');
    logger.info('  • Running counts or sums per key');
    logger.info('  • Last seen value (e.g., latest price)');
    logger.info('  • Boolean flags (is user active?)');
    logger.info('  • Aggregated metrics per key\n');

    // Step 4: ListState - Collection of Values
    logger.step('Step 4: ListState - Storing Multiple Values');
    logger.info('ListState maintains a list of values per key:');
    logger.command('// Example: Track last N events per sensor');
    logger.command('public class RecentEventsTracker extends RichFlatMapFunction<Event, Alert> {');
    logger.command('  private transient ListState<Event> recentEvents;');
    logger.command('  ');
    logger.command('  @Override');
    logger.command('  public void open(Configuration config) {');
    logger.command('    ListStateDescriptor<Event> descriptor =');
    logger.command('      new ListStateDescriptor<>("recentEvents", Event.class);');
    logger.command('    recentEvents = getRuntimeContext().getListState(descriptor);');
    logger.command('  }');
    logger.command('  ');
    logger.command('  @Override');
    logger.command('  public void flatMap(Event event, Collector<Alert> out) throws Exception {');
    logger.command('    // Add new event to list');
    logger.command('    recentEvents.add(event);');
    logger.command('    ');
    logger.command('    // Get all events for analysis');
    logger.command('    List<Event> events = new ArrayList<>();');
    logger.command('    for (Event e : recentEvents.get()) {');
    logger.command('      events.add(e);');
    logger.command('    }');
    logger.command('    ');
    logger.command('    // Keep only last 100 events (manual cleanup)');
    logger.command('    if (events.size() > 100) {');
    logger.command('      events = events.subList(events.size() - 100, events.size());');
    logger.command('      recentEvents.update(events);');
    logger.command('    }');
    logger.command('    ');
    logger.command('    // Analyze pattern across recent events');
    logger.command('    if (detectAnomaly(events)) {');
    logger.command('      out.collect(new Alert(event.sensorId, "ANOMALY_DETECTED"));');
    logger.command('    }');
    logger.command('  }');
    logger.command('}');
    logger.production('ListState is ideal for tracking event history or sliding windows\n');

    logger.info('Common ListState use cases:');
    logger.info('  • Recent event history (last N events)');
    logger.info('  • Buffering for batch operations');
    logger.info('  • Pattern detection across sequences');
    logger.info('  • Custom windowing logic\n');

    // Step 5: MapState - Key-Value Storage
    logger.step('Step 5: MapState - Storing Key-Value Pairs');
    logger.info('MapState stores key-value mappings per key:');
    logger.command('// Example: Track feature flags per user');
    logger.command('public class FeatureFlagProcessor extends RichMapFunction<Event, EnrichedEvent> {');
    logger.command('  private transient MapState<String, Boolean> featureFlags;');
    logger.command('  ');
    logger.command('  @Override');
    logger.command('  public void open(Configuration config) {');
    logger.command('    MapStateDescriptor<String, Boolean> descriptor =');
    logger.command('      new MapStateDescriptor<>("featureFlags", String.class, Boolean.class);');
    logger.command('    featureFlags = getRuntimeContext().getMapState(descriptor);');
    logger.command('  }');
    logger.command('  ');
    logger.command('  @Override');
    logger.command('  public EnrichedEvent map(Event event) throws Exception {');
    logger.command('    if (event.type.equals("ENABLE_FEATURE")) {');
    logger.command('      featureFlags.put(event.featureName, true);');
    logger.command('    } else if (event.type.equals("DISABLE_FEATURE")) {');
    logger.command('      featureFlags.put(event.featureName, false);');
    logger.command('    }');
    logger.command('    ');
    logger.command('    // Check if feature is enabled for this user');
    logger.command('    Boolean darkModeEnabled = featureFlags.get("dark_mode");');
    logger.command('    ');
    logger.command('    return new EnrichedEvent(event, darkModeEnabled);');
    logger.command('  }');
    logger.command('}');
    logger.production('MapState is perfect for storing configuration or lookup data per key\n');

    logger.info('Common MapState use cases:');
    logger.info('  • Feature flags or user preferences');
    logger.info('  • Lookup tables per key (e.g., product catalog)');
    logger.info('  • Metrics grouped by dimension (e.g., counts by region)');
    logger.info('  • Join state (store right-side events by join key)\n');

    // Step 6: State Backends
    logger.step('Step 6: State Backends - Where State Lives');
    logger.info('Flink provides different storage options for state:');
    logger.command('// Configure state backend in job');
    logger.command('StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();');
    logger.command('');
    logger.command('// Option 1: Memory State Backend (default, for dev/small state)');
    logger.command('env.setStateBackend(new HashMapStateBackend());');
    logger.command('');
    logger.command('// Option 2: RocksDB State Backend (for large state, GBs-TBs)');
    logger.command('env.setStateBackend(new EmbeddedRocksDBStateBackend());');
    logger.production('Choose state backend based on state size and performance requirements\n');

    logger.info('State backend comparison:');
    logger.info('  • HashMapStateBackend (Memory):');
    logger.info('    - Fast access (all state in memory)');
    logger.info('    - Limited by TaskManager heap size');
    logger.info('    - Good for small state (MBs)');
    logger.info('  • EmbeddedRocksDBStateBackend:');
    logger.info('    - State stored on disk, cached in memory');
    logger.info('    - Scales to TBs of state per key');
    logger.info('    - Slower access but handles large state');
    logger.info('    - Incremental checkpointing support\n');

    // Step 7: Checkpointing and Fault Tolerance
    logger.step('Step 7: Checkpointing - State Survives Failures');
    logger.info('Checkpointing saves state snapshots for fault tolerance:');
    logger.command('// Enable checkpointing every 60 seconds');
    logger.command('env.enableCheckpointing(60000);');
    logger.command('');
    logger.command('// Configure checkpoint storage');
    logger.command('env.getCheckpointConfig().setCheckpointStorage("s3://my-bucket/checkpoints");');
    logger.command('');
    logger.command('// Set checkpoint mode');
    logger.command('env.getCheckpointConfig().setCheckpointingMode(CheckpointingMode.EXACTLY_ONCE);');
    logger.production('Checkpoints enable exactly-once processing guarantees\n');

    logger.info('How checkpointing works:');
    logger.info('  1. Flink coordinator triggers checkpoint at interval');
    logger.info('  2. Special barrier markers flow through the stream');
    logger.info('  3. Each operator snapshots its state when barrier arrives');
    logger.info('  4. State snapshots written to durable storage (S3, HDFS)');
    logger.info('  5. On failure, job restarts from last successful checkpoint\n');

    logger.info('Checkpoint configuration:');
    logger.info('  • Interval: How often to checkpoint (e.g., 60s)');
    logger.info('  • Timeout: Max time for checkpoint to complete');
    logger.info('  • Min pause: Minimum time between checkpoints');
    logger.info('  • Max concurrent: How many checkpoints can run simultaneously');
    logger.info('  • Externalized: Keep checkpoints after job stops\n');

    // Step 8: State TTL (Time-To-Live)
    logger.step('Step 8: State TTL - Preventing Unbounded Growth');
    logger.info('State TTL automatically cleans up old state:');
    logger.command('// Configure TTL for state descriptor');
    logger.command('StateTtlConfig ttlConfig = StateTtlConfig');
    logger.command('  .newBuilder(Time.days(7))  // State expires after 7 days');
    logger.command('  .setUpdateType(UpdateType.OnCreateAndWrite)  // Reset TTL on writes');
    logger.command('  .setStateVisibility(StateVisibility.NeverReturnExpired)  // Don\'t return expired state');
    logger.command('  .build();');
    logger.command('');
    logger.command('ValueStateDescriptor<Integer> descriptor =');
    logger.command('  new ValueStateDescriptor<>("count", Integer.class);');
    logger.command('descriptor.enableTimeToLive(ttlConfig);');
    logger.production('TTL prevents state from growing indefinitely for inactive keys\n');

    logger.info('TTL use cases:');
    logger.info('  • Remove state for inactive users (e.g., 30 days)');
    logger.info('  • Clean up temporary session data');
    logger.info('  • Limit memory usage for long-running jobs');
    logger.info('  • Comply with data retention policies\n');

    // Step 9: Complete Example - Session Tracking
    logger.step('Step 9: Complete Example - User Session Tracking');
    logger.info('Building a session tracker with stateful processing:');
    logger.command('// Track user sessions with timeout-based sessionization');
    logger.command('DataStream<Event> events = env.addSource(new EventSource());');
    logger.command('');
    logger.command('DataStream<SessionSummary> sessions = events');
    logger.command('  .keyBy(event -> event.userId)  // Partition by user');
    logger.command('  .process(new SessionProcessor());  // Stateful processing');
    logger.command('');
    logger.command('public class SessionProcessor extends KeyedProcessFunction<String, Event, SessionSummary> {');
    logger.command('  // ValueState: Session start time');
    logger.command('  private ValueState<Long> sessionStartState;');
    logger.command('  // ListState: Events in current session');
    logger.command('  private ListState<Event> sessionEventsState;');
    logger.command('  // MapState: Counters by event type');
    logger.command('  private MapState<String, Integer> eventCountsState;');
    logger.command('  ');
    logger.command('  @Override');
    logger.command('  public void processElement(Event event, Context ctx, Collector<SessionSummary> out) {');
    logger.command('    Long sessionStart = sessionStartState.value();');
    logger.command('    ');
    logger.command('    // Start new session if needed');
    logger.command('    if (sessionStart == null) {');
    logger.command('      sessionStart = event.timestamp;');
    logger.command('      sessionStartState.update(sessionStart);');
    logger.command('    }');
    logger.command('    ');
    logger.command('    // Add event to session');
    logger.command('    sessionEventsState.add(event);');
    logger.command('    ');
    logger.command('    // Update counters');
    logger.command('    Integer count = eventCountsState.get(event.type);');
    logger.command('    eventCountsState.put(event.type, (count == null ? 1 : count + 1));');
    logger.command('    ');
    logger.command('    // Register timer to close session after 30 minutes of inactivity');
    logger.command('    ctx.timerService().registerEventTimeTimer(event.timestamp + 1800000);');
    logger.command('  }');
    logger.command('  ');
    logger.command('  @Override');
    logger.command('  public void onTimer(long timestamp, OnTimerContext ctx, Collector<SessionSummary> out) {');
    logger.command('    // Session timeout - emit summary and clear state');
    logger.command('    List<Event> events = new ArrayList<>();');
    logger.command('    for (Event e : sessionEventsState.get()) events.add(e);');
    logger.command('    ');
    logger.command('    Map<String, Integer> counts = new HashMap<>();');
    logger.command('    for (Map.Entry<String, Integer> entry : eventCountsState.entries()) {');
    logger.command('      counts.put(entry.getKey(), entry.getValue());');
    logger.command('    }');
    logger.command('    ');
    logger.command('    out.collect(new SessionSummary(ctx.getCurrentKey(), sessionStartState.value(), events.size(), counts));');
    logger.command('    ');
    logger.command('    // Clear session state');
    logger.command('    sessionStartState.clear();');
    logger.command('    sessionEventsState.clear();');
    logger.command('    eventCountsState.clear();');
    logger.command('  }');
    logger.command('}');
    logger.production('This example combines all three state types for complex sessionization\n');

    // Step 10: Performance Considerations
    logger.step('Step 10: State Performance Best Practices');
    logger.info('Optimizing stateful processing:');
    logger.info('  ✓ Use TTL to prevent unbounded state growth');
    logger.info('  ✓ Choose appropriate state backend (Memory vs RocksDB)');
    logger.info('  ✓ Increase checkpoint interval for large state (reduce overhead)');
    logger.info('  ✓ Use incremental checkpointing with RocksDB (faster checkpoints)');
    logger.info('  ✓ Partition keys carefully (avoid hot keys with high load)');
    logger.info('  ✓ Monitor state size per key (prevent memory issues)');
    logger.info('  ✓ Use clear() to remove state when no longer needed');
    logger.production('Well-managed state enables processing TBs of data with low latency\n');

    // Summary
    logger.success('\n✓ Stateful processing demonstrated!');
    logger.info('Key Concepts:');
    logger.info('  • ValueState: Single value per key (counters, flags)');
    logger.info('  • ListState: Collection of values per key (history, buffers)');
    logger.info('  • MapState: Key-value pairs per key (lookups, configurations)');
    logger.info('  • State is partitioned by key for parallel processing');
    logger.info('  • Checkpointing provides fault tolerance and exactly-once guarantees');
    logger.info('  • State backends control where state is stored (memory vs disk)');
    logger.info('  • TTL prevents unbounded state growth\n');

    logger.info('Note: Phase 1 demonstrates stateful processing conceptually.');
    logger.info('Actual JAR compilation and execution will be added in future phases.\n');
  },
};
