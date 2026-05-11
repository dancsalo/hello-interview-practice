import type { Client } from 'cassandra-driver';
import type { CassandraExample, Logger } from '../../../../lib/types.js';
import { types } from 'cassandra-driver';

export const ticketmasterTicketsExample: CassandraExample = {
  name: 'Ticketmaster Tickets: Section-Based Partitioning',
  description: 'Event ticketing with UX-driven data modeling and denormalized aggregates',

  async run(client: Client, logger: Logger): Promise<void> {
    logger.section('🎫 Cassandra Example: Ticketmaster Tickets');
    logger.info('Section-based partitioning and denormalized aggregates\n');

    // Create keyspace
    await client.execute(`
      CREATE KEYSPACE IF NOT EXISTS ticketing_demo
      WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    `);

    // Step 1: The original schema problem
    logger.step('Step 1: Original Schema (THE PROBLEM)');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ticketing_demo.tickets_v1 (
        event_id BIGINT,
        seat_id BIGINT,
        section_id BIGINT,
        price DECIMAL,
        available BOOLEAN,
        PRIMARY KEY (event_id, seat_id)
      )
    `);
    logger.command('CREATE TABLE tickets_v1 (PRIMARY KEY (event_id, seat_id))');
    logger.info('');
    logger.warning('Problems with this schema:');
    logger.warning('  1. Large events (50K+ seats) = HUGE partition');
    logger.warning('     - NFL stadium: 70,000 seats in ONE partition');
    logger.warning('     - 70K rows * ~100 bytes = 7 MB (borderline, grows with columns)');
    logger.warning('');
    logger.warning('  2. Aggregations require full partition scan:');
    logger.warning('     - "How many tickets available in Section A?" = scan all 70K rows');
    logger.warning('     - "Price range for Section B?" = scan all 70K rows');
    logger.warning('');
    logger.warning('  3. Popular events create hot partitions:');
    logger.warning('     - Taylor Swift concert: millions of concurrent queries');
    logger.warning('     - All hitting ONE partition on ONE node');
    logger.info('');

    // Step 2: UX-driven design
    logger.step('Step 2: UX Drives the Data Model');
    logger.info('Ticketmaster user flow:');
    logger.info('');
    logger.info('  Step 1: User opens event page');
    logger.info('    -> Shows venue map with sections');
    logger.info('    -> Each section shows: available count, price range');
    logger.info('    -> Query: "Get all sections for event X" (aggregate view)');
    logger.info('');
    logger.info('  Step 2: User clicks "Section A"');
    logger.info('    -> Shows individual seats in that section');
    logger.info('    -> Each seat shows: row, number, price, availability');
    logger.info('    -> Query: "Get all seats in Section A for event X" (detail view)');
    logger.info('');
    logger.info('These 2 UX steps = 2 different query patterns = 2 tables.\n');

    // Step 3: Fixed schema
    logger.step('Step 3: Fixed Schemas (THE SOLUTION)');

    // Table 1: Individual tickets by section
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ticketing_demo.tickets (
        event_id BIGINT,
        section_id BIGINT,
        seat_id BIGINT,
        row_name TEXT,
        seat_number INT,
        price DECIMAL,
        available BOOLEAN,
        PRIMARY KEY ((event_id, section_id), seat_id)
      )
    `);
    logger.command('CREATE TABLE tickets (PRIMARY KEY ((event_id, section_id), seat_id))');
    logger.success('Partition: (event_id, section_id) = tickets distributed across sections');
    logger.info('  - 70K seats / 20 sections = 3,500 seats per partition (small!)');
    logger.info('  - Load distributed across multiple nodes');
    logger.info('');

    // Table 2: Section aggregates (denormalized)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS ticketing_demo.event_sections (
        event_id BIGINT,
        section_id BIGINT,
        section_name TEXT,
        total_seats INT,
        available_seats INT,
        price_floor DECIMAL,
        price_ceiling DECIMAL,
        PRIMARY KEY (event_id, section_id)
      )
    `);
    logger.command('CREATE TABLE event_sections (PRIMARY KEY (event_id, section_id))');
    logger.success('Denormalized aggregates: pre-computed section-level stats');
    logger.info('  - Single partition read gets ALL section summaries');
    logger.info('  - No need to scan 70K individual tickets for aggregates\n');

    // Step 4: Insert event data
    logger.step('Step 4: Populate Event Data');
    const eventId = BigInt(1001);

    const sections = [
      { id: BigInt(1), name: 'Floor A', seats: 200, price: 350.00 },
      { id: BigInt(2), name: 'Floor B', seats: 200, price: 300.00 },
      { id: BigInt(3), name: 'Lower Bowl', seats: 500, price: 150.00 },
      { id: BigInt(4), name: 'Upper Bowl', seats: 800, price: 75.00 },
      { id: BigInt(5), name: 'Nosebleed', seats: 1000, price: 40.00 },
    ];

    // Insert section aggregates
    for (const section of sections) {
      const availableSeats = Math.floor(section.seats * 0.7); // 70% available
      await client.execute(
        'INSERT INTO ticketing_demo.event_sections (event_id, section_id, section_name, total_seats, available_seats, price_floor, price_ceiling) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [eventId, section.id, section.name, section.seats, availableSeats, section.price, section.price * 1.5],
        { prepare: true }
      );
    }
    logger.command('INSERT 5 sections into event_sections', 'Pre-computed aggregates');

    // Insert individual tickets for first 2 sections (sample)
    for (const section of sections.slice(0, 2)) {
      const sampleSize = 10; // Insert 10 tickets per section for demo
      for (let i = 1; i <= sampleSize; i++) {
        const available = Math.random() > 0.3; // 70% available
        await client.execute(
          'INSERT INTO ticketing_demo.tickets (event_id, section_id, seat_id, row_name, seat_number, price, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [eventId, section.id, BigInt(i), `Row ${String.fromCharCode(65 + Math.floor(i / 5))}`, i, section.price + Math.random() * 50, available],
          { prepare: true }
        );
      }
    }
    logger.command('INSERT 10 tickets per section (Floor A, Floor B)', 'Distributed across 2 partitions');
    logger.info('');
    logger.info('In production: 70K tickets across 20 sections = 3,500 per partition');
    logger.info('Each section partition is small and fast to query\n');

    // Step 5: Query - Event overview (UX Step 1)
    logger.step('Step 5: Query - Event Section Overview (UX Step 1)');
    logger.info('User opens event page, sees all sections with availability:\n');

    const sectionResults = await client.execute(
      'SELECT section_name, available_seats, total_seats, price_floor, price_ceiling FROM ticketing_demo.event_sections WHERE event_id = ?',
      [eventId],
      { prepare: true }
    );
    logger.command('SELECT * FROM event_sections WHERE event_id = ?', `${sectionResults.rows.length} sections`);
    for (const row of sectionResults.rows) {
      const pctAvailable = Math.round((row.available_seats / row.total_seats) * 100);
      logger.info(`  ${row.section_name}: ${row.available_seats}/${row.total_seats} available (${pctAvailable}%) | $${row.price_floor}-$${row.price_ceiling}`);
    }
    logger.success('\nSingle partition read! All section summaries in one query.');
    logger.info('No scanning 70K individual tickets for this overview.\n');

    // Step 6: Query - Section detail (UX Step 2)
    logger.step('Step 6: Query - Section Detail (UX Step 2)');
    logger.info('User clicks "Floor A", sees individual seats:\n');

    const seatResults = await client.execute(
      'SELECT seat_id, row_name, seat_number, price, available FROM ticketing_demo.tickets WHERE event_id = ? AND section_id = ?',
      [eventId, BigInt(1)],
      { prepare: true }
    );
    logger.command('SELECT * FROM tickets WHERE event_id = ? AND section_id = 1', `${seatResults.rows.length} seats`);
    let availableCount = 0;
    for (const row of seatResults.rows.slice(0, 5)) {
      const status = row.available ? 'AVAILABLE' : 'SOLD';
      if (row.available) availableCount++;
      logger.info(`  Seat ${row.seat_number} (${row.row_name}): $${Number(row.price).toFixed(2)} [${status}]`);
    }
    if (seatResults.rows.length > 5) {
      logger.info(`  ... and ${seatResults.rows.length - 5} more seats`);
    }
    logger.success('\nSingle partition read! Only seats in selected section.');
    logger.info('Partition: (event_id=1001, section_id=1) = just Floor A seats.\n');

    // Step 7: Explain denormalization strategy
    logger.step('Step 7: Denormalization and Write Strategy');
    logger.info('When a ticket is purchased, update BOTH tables:\n');
    logger.info('  1. UPDATE tickets SET available = false WHERE event_id = ? AND section_id = ? AND seat_id = ?');
    logger.info('  2. UPDATE event_sections SET available_seats = available_seats - 1 WHERE event_id = ? AND section_id = ?');
    logger.info('');
    logger.info('Consistency strategy:');
    logger.info('  - Use lightweight transactions (LWT) for seat purchase:');
    logger.info('    UPDATE tickets SET available = false WHERE ... IF available = true');
    logger.info('  - Prevents double-booking (compare-and-set)');
    logger.info('  - event_sections counter can be eventually consistent');
    logger.info('    (slight staleness in "available count" is acceptable UX)');
    logger.info('');
    logger.production('Production notes:');
    logger.production('  - LWT has higher latency (Paxos consensus)');
    logger.production('  - Only use for the actual purchase (not browsing)');
    logger.production('  - event_sections aggregate updated async (acceptable lag)');
    logger.production('  - Alternative: Use Cassandra counters for available_seats\n');

    // Step 8: Why UX drives the model
    logger.step('Step 8: UX-Driven Design Principles');
    logger.info('');
    logger.info('UX Requirement              | Table              | Partition Key');
    logger.info('---------------------------|--------------------|-----------------------');
    logger.info('View all sections overview | event_sections     | (event_id)');
    logger.info('View seats in section      | tickets            | (event_id, section_id)');
    logger.info('');
    logger.info('Design principles:');
    logger.info('  1. Map each UI screen/view to a table');
    logger.info('  2. Partition key = how users navigate (event -> section -> seat)');
    logger.info('  3. Pre-compute aggregates to avoid scanning');
    logger.info('  4. Hierarchical data = opportunity for section-based partitioning');
    logger.info('');
    logger.info('Why section-based partitioning works:');
    logger.success('  - Sections are fixed (venue doesn\'t change)');
    logger.success('  - Bounded partition size (section has finite seats)');
    logger.success('  - Distributes hot event load across multiple nodes');
    logger.success('  - Matches how users actually browse tickets\n');

    // Step 9: Assertions
    logger.step('Step 9: Verification');

    logger.assert(
      sectionResults.rows.length === 5,
      'Event sections query returns all 5 sections',
      `Expected 5 sections, got ${sectionResults.rows.length}`
    );

    logger.assert(
      seatResults.rows.length === 10,
      'Section detail query returns all 10 seats for Floor A',
      `Expected 10 seats, got ${seatResults.rows.length}`
    );

    // Verify section data is complete
    const firstSection = sectionResults.rows[0];
    logger.assert(
      firstSection.section_name !== null && firstSection.available_seats !== null,
      'Section aggregates contain name and availability data',
      'Section data incomplete'
    );

    logger.info('\n');
    logger.production('Key Interview Takeaways:');
    logger.production('1. UX requirements inform partition key design');
    logger.production('2. Hierarchical data (event->section->seat) = section-based partitioning');
    logger.production('3. Denormalized aggregates avoid expensive full-partition scans');
    logger.production('4. Section-based partitioning distributes hot events across nodes');
    logger.production('5. LWT (compare-and-set) prevents double-booking');
    logger.production('6. Eventual consistency acceptable for aggregate counts');
  },

  async cleanup(client: Client): Promise<void> {
    await client.execute('DROP KEYSPACE IF EXISTS ticketing_demo');
  },
};
