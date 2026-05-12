# DynamoDB Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete DynamoDB technology section with 8 progressive examples (basics to production patterns), matching Redis/PostgreSQL quality for system design interview preparation.

**Architecture:** Docker-based development with DynamoDB Local + dynamodb-admin GUI. TypeScript examples follow existing pattern (Example interface, Logger, CLI integration). Each example has runnable code + comprehensive README with DynamoDB vs alternatives discussion.

**Tech Stack:** DynamoDB Local, @aws-sdk/client-dynamodb, @aws-sdk/lib-dynamodb, TypeScript, Docker Compose

---

## File Structure Overview

**Infrastructure:**
- Modify: `docker-compose.yml` - Add DynamoDB Local + dynamodb-admin services
- Modify: `.env.example` - Add DynamoDB environment variables
- Modify: `package.json` - Add DynamoDB dependencies and scripts
- Create: `scripts/reset-dynamodb.ts` - Reset script to delete all tables
- Create: `scripts/test-dynamodb-examples.ts` - Integration test runner
- Modify: `scripts/reset-all.ts` - Include DynamoDB reset
- Modify: `scripts/test-all-examples.ts` - Include DynamoDB tests

**Type System:**
- Modify: `src/lib/types.ts` - Add DynamoDBExample type
- Create: `src/technologies/dynamodb/client.ts` - DynamoDB client wrapper

**CLI Integration:**
- Modify: `src/cli.ts` - Add DynamoDB to menu, imports, connection handling

**Main README:**
- Create: `src/technologies/dynamodb/README.md` - Technology guide (~400 lines)

**Examples (8 total):**
- Create: `src/technologies/dynamodb/examples/01-basics/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/02-indexing/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/03-consistency-models/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/04-transactions/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/05-single-table-design/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/06-streams/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/07-performance/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/08-production-patterns/index.ts` + `README.md`

**Documentation:**
- Modify: `README.md` - Add DynamoDB to technologies list

---

### Task 1: Docker Infrastructure Setup

**Files:**
- Modify: `docker-compose.yml:122-` (after volumes section)
- Modify: `.env.example:1-`

- [ ] **Step 1: Add DynamoDB services to docker-compose.yml**

Add after the `kafka-ui` service definition (around line 119):

```yaml
  dynamodb-local:
    image: amazon/dynamodb-local:latest
    container_name: system-design-dynamodb
    ports:
      - "${DYNAMODB_PORT:-8000}:8000"
    command: "-jar DynamoDBLocal.jar -sharedDb -inMemory"
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8000 || exit 1"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 256M

  dynamodb-admin:
    image: aaronshaf/dynamodb-admin:latest
    container_name: system-design-dynamodb-admin
    ports:
      - "${DYNAMODB_ADMIN_PORT:-8003}:8001"
    environment:
      - DYNAMO_ENDPOINT=http://dynamodb-local:8000
      - AWS_REGION=us-east-1
      - AWS_ACCESS_KEY_ID=local
      - AWS_SECRET_ACCESS_KEY=local
    depends_on:
      dynamodb-local:
        condition: service_healthy
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 128M
```

- [ ] **Step 2: Add DynamoDB environment variables to .env.example**

Add to `.env.example`:

```bash
# DynamoDB Local
DYNAMODB_PORT=8000
DYNAMODB_ADMIN_PORT=8003
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

- [ ] **Step 3: Test Docker services start**

Run: `docker-compose up -d dynamodb-local dynamodb-admin`
Expected: Services start successfully, healthcheck passes

- [ ] **Step 4: Verify dynamodb-admin accessible**

Run: `curl http://localhost:8003`
Expected: HTML response (dynamodb-admin interface)

- [ ] **Step 5: Commit Docker infrastructure**

```bash
git add docker-compose.yml .env.example
git commit -m "feat: add DynamoDB Local and dynamodb-admin services"
```

---

### Task 2: Package Dependencies

**Files:**
- Modify: `package.json:25-33` (dependencies section)
- Modify: `package.json:7-23` (scripts section)

- [ ] **Step 1: Add DynamoDB SDK dependencies**

Add to `dependencies` section in `package.json`:

```json
"@aws-sdk/client-dynamodb": "^3.0.0",
"@aws-sdk/lib-dynamodb": "^3.0.0"
```

- [ ] **Step 2: Add DynamoDB scripts**

Add to `scripts` section in `package.json`:

```json
"test:dynamodb": "tsx scripts/test-dynamodb-examples.ts",
"reset:dynamodb": "tsx scripts/reset-dynamodb.ts"
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: Dependencies install successfully

- [ ] **Step 4: Verify SDK installed**

Run: `npm list @aws-sdk/client-dynamodb`
Expected: Shows version 3.x.x

- [ ] **Step 5: Commit package changes**

```bash
git add package.json package-lock.json
git commit -m "feat: add DynamoDB SDK dependencies and scripts"
```

---

### Task 3: Type System Extension

**Files:**
- Modify: `src/lib/types.ts:27-40`

- [ ] **Step 1: Add DynamoDB client import**

Add to imports at top of `src/lib/types.ts`:

```typescript
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import type { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
```

- [ ] **Step 2: Define DynamoDBExample type**

Add after `KafkaExample` type definition (line 26):

```typescript
export interface DynamoDBClients {
  client: DynamoDBClient;
  docClient: DynamoDBDocumentClient;
}

export type DynamoDBExample = Example<DynamoDBClients>;
```

- [ ] **Step 3: Verify types compile**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 4: Commit type changes**

```bash
git add src/lib/types.ts
git commit -m "feat: add DynamoDB types to type system"
```

---

### Task 4: DynamoDB Client Wrapper

**Files:**
- Create: `src/technologies/dynamodb/client.ts`

- [ ] **Step 1: Create DynamoDB client wrapper**

Create `src/technologies/dynamodb/client.ts`:

```typescript
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
    } catch {
      return false;
    }
  }

  async reset(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    const { TableNames } = await this.client.send(new ListTablesCommand({}));

    if (TableNames && TableNames.length > 0) {
      for (const tableName of TableNames) {
        await this.client.send(new DeleteTableCommand({ TableName: tableName }));
      }
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
```

- [ ] **Step 2: Verify client compiles**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 3: Test client connection**

Run: `docker-compose up -d dynamodb-local`
Then: `tsx -e "import {DynamoDBClientWrapper} from './src/technologies/dynamodb/client.js'; const c = new DynamoDBClientWrapper(); await c.connect(); console.log(await c.healthCheck()); await c.disconnect()"`
Expected: Prints `true`

- [ ] **Step 4: Commit client wrapper**

```bash
git add src/technologies/dynamodb/client.ts
git commit -m "feat: add DynamoDB client wrapper with connection management"
```

---

### Task 5: Reset Script

**Files:**
- Create: `scripts/reset-dynamodb.ts`
- Modify: `scripts/reset-all.ts:1-50`

- [ ] **Step 1: Create reset-dynamodb.ts script**

Create `scripts/reset-dynamodb.ts`:

```typescript
import chalk from 'chalk';
import { DynamoDBClientWrapper } from '../src/technologies/dynamodb/client.js';

async function resetDynamoDB() {
  console.log(chalk.blue('🔄 Resetting DynamoDB...'));

  const client = new DynamoDBClientWrapper();

  try {
    await client.connect();
    console.log(chalk.green('✓ Connected to DynamoDB'));

    await client.reset();
    console.log(chalk.green('✓ All tables deleted'));

    await client.disconnect();
    console.log(chalk.green('✓ DynamoDB reset complete\n'));
  } catch (error) {
    console.error(chalk.red(`✗ Error resetting DynamoDB: ${error}`));
    process.exit(1);
  }
}

resetDynamoDB();
```

- [ ] **Step 2: Test reset script**

Run: `npm run reset:dynamodb`
Expected: Script runs successfully, reports no tables to delete

- [ ] **Step 3: Add DynamoDB to reset-all.ts**

Read the existing `scripts/reset-all.ts` and add a DynamoDB reset call after the Kafka reset. Import the DynamoDB client and call its reset method following the same pattern as Redis/PostgreSQL/Kafka.

- [ ] **Step 4: Test reset-all includes DynamoDB**

Run: `npm run reset`
Expected: DynamoDB reset runs alongside other services

- [ ] **Step 5: Commit reset scripts**

```bash
git add scripts/reset-dynamodb.ts scripts/reset-all.ts
git commit -m "feat: add DynamoDB reset scripts"
```

---

### Task 6: Test Infrastructure

**Files:**
- Create: `scripts/test-dynamodb-examples.ts`
- Modify: `scripts/test-all-examples.ts:1-100`

- [ ] **Step 1: Create test-dynamodb-examples.ts**

Create `scripts/test-dynamodb-examples.ts` following the pattern from `test-redis-examples.ts`:

```typescript
import chalk from 'chalk';
import { DynamoDBClientWrapper } from '../src/technologies/dynamodb/client.js';
import { Logger } from '../src/lib/logger.js';

// Import all examples (will add as we create them)
import { basicsExample } from '../src/technologies/dynamodb/examples/01-basics/index.js';

const EXAMPLES = [
  basicsExample,
  // Will add more as we implement them
];

async function testDynamoDBExamples() {
  console.log(chalk.blue.bold('\n🧪 Testing DynamoDB Examples\n'));

  const client = new DynamoDBClientWrapper();
  const logger = new Logger();

  try {
    // Connect
    await client.connect();
    console.log(chalk.green('✓ Connected to DynamoDB\n'));

    // Run each example
    let passed = 0;
    let failed = 0;

    for (const example of EXAMPLES) {
      try {
        console.log(chalk.cyan(`\nRunning: ${example.name}`));
        const clients = client.getClients();
        await example.run(clients, logger);
        passed++;
        console.log(chalk.green(`✓ ${example.name} passed`));
      } catch (error) {
        failed++;
        console.error(chalk.red(`✗ ${example.name} failed: ${error}`));
      }

      // Reset after each example
      await client.reset();
    }

    // Summary
    console.log(chalk.blue.bold('\n📊 Test Summary\n'));
    console.log(chalk.green(`  Passed: ${passed}/${EXAMPLES.length}`));
    if (failed > 0) {
      console.log(chalk.red(`  Failed: ${failed}/${EXAMPLES.length}`));
    }

    await client.disconnect();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`\nFatal error: ${error}`));
    await client.disconnect();
    process.exit(1);
  }
}

testDynamoDBExamples();
```

- [ ] **Step 2: Update test-all-examples.ts**

Add DynamoDB test execution after Kafka tests in `scripts/test-all-examples.ts`, following the same pattern as other technologies.

- [ ] **Step 3: Verify test infrastructure compiles**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 4: Commit test infrastructure**

```bash
git add scripts/test-dynamodb-examples.ts scripts/test-all-examples.ts
git commit -m "feat: add DynamoDB test infrastructure"
```

---

### Task 7: CLI Integration - DockerUtils

**Files:**
- Modify: `src/lib/docker-utils.ts:1-100`

- [ ] **Step 1: Read existing DockerUtils**

Read `src/lib/docker-utils.ts` to understand the structure.

- [ ] **Step 2: Add DynamoDB service check**

Add DynamoDB service to the services array in `checkServices()` method:

```typescript
{
  name: 'DynamoDB Local',
  container: 'system-design-dynamodb',
  url: 'http://localhost:8003',
},
```

- [ ] **Step 3: Verify Docker utils compile**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 4: Test Docker service detection**

Run: `docker-compose up -d` then `tsx -e "import {DockerUtils} from './src/lib/docker-utils.js'; console.log(await DockerUtils.checkServices())"`
Expected: Shows DynamoDB as healthy

- [ ] **Step 5: Commit DockerUtils changes**

```bash
git add src/lib/docker-utils.ts
git commit -m "feat: add DynamoDB to Docker service health checks"
```

---

### Task 8: CLI Integration - Main CLI

**Files:**
- Modify: `src/cli.ts:1-70` (imports, examples arrays)
- Modify: `src/cli.ts:70-110` (constructor, client initialization)
- Modify: `src/cli.ts:200-400` (technology selection menu, connection methods)

- [ ] **Step 1: Add DynamoDB client import**

Add to imports section (around line 6):

```typescript
import { DynamoDBClientWrapper } from './technologies/dynamodb/client.js';
```

- [ ] **Step 2: Add DynamoDB example imports**

Add after Kafka imports (will start with just basics):

```typescript
// Import DynamoDB examples
import { basicsExample as dynamoBasicsExample } from './technologies/dynamodb/examples/01-basics/index.js';
```

- [ ] **Step 3: Create DynamoDB examples array**

Add after `KAFKA_EXAMPLES` array:

```typescript
const DYNAMODB_EXAMPLES: DynamoDBExample[] = [
  dynamoBasicsExample,
];
```

- [ ] **Step 4: Add DynamoDB client to CLI class**

In the CLI class constructor, add:

```typescript
private dynamoClient: DynamoDBClientWrapper;

constructor() {
  // ... existing clients ...
  this.dynamoClient = new DynamoDBClientWrapper();
  // ...
}
```

- [ ] **Step 5: Add DynamoDB to shutdown handler**

In `handleShutdown()` method, add after Kafka disconnect:

```typescript
await this.dynamoClient.disconnect();
this.logger.success('Disconnected from DynamoDB');
```

- [ ] **Step 6: Add connectDynamoDB method**

Add method after `connectKafka()`:

```typescript
private async connectDynamoDB(): Promise<boolean> {
  const spinner = ora('Connecting to DynamoDB...').start();

  try {
    await this.dynamoClient.connect();
    const healthy = await this.dynamoClient.healthCheck();

    if (healthy) {
      spinner.succeed('Connected to DynamoDB');
      return true;
    } else {
      spinner.fail('DynamoDB health check failed');
      return false;
    }
  } catch (error) {
    spinner.fail(`Failed to connect to DynamoDB: ${error}`);
    return false;
  }
}
```

- [ ] **Step 7: Add DynamoDB to technology selection menu**

In the main `start()` method's technology selection, add 'DynamoDB' option after 'PostgreSQL':

```typescript
const technology = await select({
  message: 'Select a technology to explore:',
  choices: [
    { name: 'Redis', value: 'redis' },
    { name: 'PostgreSQL', value: 'postgresql' },
    { name: 'DynamoDB', value: 'dynamodb' },
    { name: 'Kafka', value: 'kafka' },
    { name: 'Exit', value: 'exit' },
  ],
});
```

- [ ] **Step 8: Add DynamoDB case to technology switch**

Add case for DynamoDB:

```typescript
case 'dynamodb': {
  const connected = await this.connectDynamoDB();
  if (connected) {
    await this.runDynamoDBExamples();
  }
  break;
}
```

- [ ] **Step 9: Add runDynamoDBExamples method**

Add method following the pattern of `runRedisExamples()`:

```typescript
private async runDynamoDBExamples(): Promise<void> {
  let continueExamples = true;

  while (continueExamples) {
    console.log();

    const example = await select({
      message: 'Select a DynamoDB example:',
      choices: [
        ...DYNAMODB_EXAMPLES.map((ex, idx) => ({
          name: `${idx + 1}. ${ex.name} - ${ex.description}`,
          value: ex,
        })),
        { name: 'Return to main menu', value: null },
      ],
    });

    if (!example) {
      break;
    }

    console.log();

    try {
      const clients = this.dynamoClient.getClients();
      await example.run(clients, this.logger);

      const action = await select({
        message: 'What would you like to do next?',
        choices: [
          { name: 'Run another example', value: 'continue' },
          { name: 'Reset DynamoDB data', value: 'reset' },
          { name: 'Return to main menu', value: 'exit' },
        ],
      });

      if (action === 'reset') {
        const spinner = ora('Resetting DynamoDB...').start();
        await this.dynamoClient.reset();
        spinner.succeed('DynamoDB data reset complete');
      } else if (action === 'exit') {
        continueExamples = false;
      }
    } catch (error) {
      this.logger.error(`Example failed: ${error}`);

      const retry = await confirm({
        message: 'Would you like to try another example?',
        default: true,
      });

      if (!retry) {
        continueExamples = false;
      }
    }
  }

  await this.dynamoClient.disconnect();
}
```

- [ ] **Step 10: Verify CLI compiles**

Run: `npm run type-check`
Expected: No type errors

- [ ] **Step 11: Commit CLI integration**

```bash
git add src/cli.ts
git commit -m "feat: integrate DynamoDB into CLI with menu and examples runner"
```

---

### Task 9: Example 01 - Basics

**Files:**
- Create: `src/technologies/dynamodb/examples/01-basics/index.ts`
- Create: `src/technologies/dynamodb/examples/01-basics/README.md`

- [ ] **Step 1: Create basics example index.ts**

Create `src/technologies/dynamodb/examples/01-basics/index.ts`:

```typescript
import {
  CreateTableCommand,
  DeleteTableCommand,
  PutItemCommand,
  GetItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import type { DynamoDBExample, Logger, DynamoDBClients } from '../../../../lib/types.js';

export const basicsExample: DynamoDBExample = {
  name: 'Basics: Core Operations',
  description: 'CRUD, Query vs Scan, partition/sort keys',

  async run(clients: DynamoDBClients, logger: Logger): Promise<void> {
    const { client } = clients;

    logger.section('📦 DynamoDB Basics: Core Operations');
    logger.info('Creating tables, CRUD operations, Query vs Scan\n');

    // Step 1: Create table
    logger.step('Step 1: Create users table with partition key');

    await client.send(
      new CreateTableCommand({
        TableName: 'users',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'user_id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST',
      })
    );

    logger.command('CreateTable users (partition key: user_id)');
    logger.success('Table created successfully\n');

    // Wait for table to be active
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Step 2: PutItem (Create)
    logger.step('Step 2: PutItem - Create user record');

    await client.send(
      new PutItemCommand({
        TableName: 'users',
        Item: marshall({
          user_id: 'user-001',
          name: 'Alice Johnson',
          email: 'alice@example.com',
          age: 28,
          city: 'San Francisco',
        }),
      })
    );

    logger.command('PutItem user-001');
    logger.success('User created\n');

    // Step 3: GetItem (Read)
    logger.step('Step 3: GetItem - Read user record');

    const getResult = await client.send(
      new GetItemCommand({
        TableName: 'users',
        Key: marshall({ user_id: 'user-001' }),
      })
    );

    const user = getResult.Item ? unmarshall(getResult.Item) : null;
    logger.command('GetItem user-001', JSON.stringify(user, null, 2));
    logger.assert(user?.name === 'Alice Johnson', 'User retrieved correctly\n');

    // Step 4: UpdateItem (Update)
    logger.step('Step 4: UpdateItem - Update user age');

    await client.send(
      new UpdateItemCommand({
        TableName: 'users',
        Key: marshall({ user_id: 'user-001' }),
        UpdateExpression: 'SET age = :age',
        ExpressionAttributeValues: marshall({ ':age': 29 }),
      })
    );

    logger.command('UpdateItem user-001 SET age = 29');
    logger.success('User updated\n');

    // Step 5: Add more users for Query/Scan demo
    logger.step('Step 5: Add more users for Query/Scan comparison');

    for (let i = 2; i <= 5; i++) {
      await client.send(
        new PutItemCommand({
          TableName: 'users',
          Item: marshall({
            user_id: `user-00${i}`,
            name: `User ${i}`,
            email: `user${i}@example.com`,
            age: 20 + i,
            city: i % 2 === 0 ? 'New York' : 'San Francisco',
          }),
        })
      );
    }

    logger.command('PutItem user-002 through user-005');
    logger.success('Multiple users created\n');

    // Step 6: Query specific user
    logger.step('Step 6: Query - Get specific user by partition key');

    const startQuery = Date.now();
    const queryResult = await client.send(
      new QueryCommand({
        TableName: 'users',
        KeyConditionExpression: 'user_id = :id',
        ExpressionAttributeValues: marshall({ ':id': 'user-003' }),
      })
    );
    const queryTime = Date.now() - startQuery;

    logger.command(`Query user-003 (${queryTime}ms)`);
    logger.assert(queryResult.Items?.length === 1, 'Query returned 1 item');
    logger.production('Query uses partition key - efficient for retrieving specific items\n');

    // Step 7: Scan entire table
    logger.step('Step 7: Scan - Read all users (expensive!)');

    const startScan = Date.now();
    const scanResult = await client.send(
      new ScanCommand({
        TableName: 'users',
      })
    );
    const scanTime = Date.now() - startScan;

    logger.command(`Scan all users (${scanTime}ms)`);
    logger.assert(scanResult.Items?.length === 5, 'Scan returned 5 items');
    logger.warning(`Scan is slower (${scanTime}ms vs ${queryTime}ms) and reads ALL items`);
    logger.production('Avoid Scan in production - use Query with partition key instead\n');

    // Step 8: FilterExpression with Scan
    logger.step('Step 8: Scan with FilterExpression');

    const filterResult = await client.send(
      new ScanCommand({
        TableName: 'users',
        FilterExpression: 'city = :city',
        ExpressionAttributeValues: marshall({ ':city': 'San Francisco' }),
      })
    );

    logger.command('Scan with FilterExpression city = "San Francisco"');
    logger.assert(filterResult.Items && filterResult.Items.length === 3, 'Filter returned SF users');
    logger.warning('FilterExpression still reads all items, then filters - not efficient\n');

    // Step 9: DeleteItem
    logger.step('Step 9: DeleteItem - Remove user');

    await client.send(
      new DeleteItemCommand({
        TableName: 'users',
        Key: marshall({ user_id: 'user-005' }),
      })
    );

    logger.command('DeleteItem user-005');
    logger.success('User deleted\n');

    // Step 10: Clean up
    logger.step('Step 10: Clean up - Delete table');

    await client.send(
      new DeleteTableCommand({
        TableName: 'users',
      })
    );

    logger.command('DeleteTable users');
    logger.success('Table deleted');

    logger.success('\n✓ DynamoDB basics complete!');
    logger.info('\n💡 Key takeaways:');
    logger.info('  • Partition key required for efficient queries');
    logger.info('  • Query uses keys (fast), Scan reads everything (slow)');
    logger.info('  • Schema-less: items can have different attributes');
    logger.info('  • Use GetItem for single-item reads');
    logger.info('  • FilterExpression still scans all items\n');
  },
};
```

- [ ] **Step 2: Create basics README.md**

Create `src/technologies/dynamodb/examples/01-basics/README.md`:

```markdown
# Example 1: DynamoDB Basics - Core Operations

Learn DynamoDB fundamentals: tables, partition keys, CRUD operations, and Query vs Scan.

## What You'll Learn

- Creating tables with partition keys
- CRUD operations (PutItem, GetItem, UpdateItem, DeleteItem)
- Query vs Scan operations and performance implications
- Understanding item structure and schema-less design
- FilterExpressions and when they're (in)efficient

## Key Concepts

### Partition Key

- **Required** for every table
- Determines physical storage location (via hashing)
- Enables efficient queries
- Must be unique (or unique when combined with sort key)

### Query vs Scan

**Query:**
- Uses partition key (and optionally sort key)
- Only reads matching items
- Efficient and fast
- Recommended for production

**Scan:**
- Reads **every item** in the table
- Slow and expensive for large tables
- Can filter after reading (still reads all)
- Avoid in production except for small tables

### Schema-less Design

- No predefined schema required
- Each item can have different attributes
- Flexibility comes at cost (application validation needed)
- Attribute types: String (S), Number (N), Binary (B), Boolean (BOOL), Null (NULL), List (L), Map (M), String Set (SS), Number Set (NS), Binary Set (BS)

## How It Works

1. **Create table** with `user_id` partition key
2. **PutItem** to create user records
3. **GetItem** to retrieve by partition key
4. **UpdateItem** to modify attributes
5. **Query** to efficiently find specific user
6. **Scan** to read all users (demonstrates inefficiency)
7. **FilterExpression** shows scan + filter still reads all items
8. **DeleteItem** to remove a user
9. **DeleteTable** to clean up

## Running the Example

```bash
# Ensure DynamoDB Local is running
docker-compose up -d dynamodb-local

# Run the example
npm start
# Select: DynamoDB → Basics
```

## Expected Output

- Table created with partition key
- User created and retrieved
- Query returns 1 item quickly
- Scan reads all 5 items (slower)
- FilterExpression still scans entire table
- User deleted successfully

## Visualizing in dynamodb-admin

```bash
# Open dynamodb-admin
open http://localhost:8003

# You'll see:
# - "users" table
# - Items with user_id, name, email, age, city
# - Click table to browse items
```

## Interview Relevance

**Foundation for all DynamoDB discussions.** Interviewers expect you to:

1. **Know partition key is required** - Explains distribution and query patterns
2. **Explain Query vs Scan** - Shows understanding of performance implications
3. **Describe schema-less model** - Contrast with PostgreSQL's strict schema
4. **Discuss when to use DynamoDB** - Key-value access patterns, high scale

**Common questions:**
- "How does DynamoDB distribute data?" → Partition key hashing
- "Why is Scan slow?" → Reads every item regardless of filter
- "How do you query efficiently?" → Use Query with partition key (+ sort key)

## Production Considerations

### Performance

- **Always use Query over Scan** when possible
- GetItem is fastest for single-item retrieval (O(1))
- Scan reads entire table - costly at scale
- FilterExpression doesn't improve Scan performance (still reads all)

### Capacity Planning

- Each Query/GetItem consumes RCUs (Read Capacity Units)
- Scan consumes RCUs for every item read
- 1 RCU = 4KB strongly consistent or 8KB eventually consistent
- Large scans can exhaust capacity and throttle

### Data Modeling

- Choose partition key that distributes data evenly (avoid hot keys)
- Consider access patterns upfront (can't easily change partition key)
- Normalize data if only reading subset of attributes frequently
- Item size limit: 400KB (including attribute names)

### Cost Implications

- Pay per RCU consumed
- Scan operations expensive for large tables
- Consider on-demand vs provisioned capacity
- Secondary indexes add cost (separate RCU/WCU)

## DynamoDB vs Alternatives

### vs Cassandra

**Similarities:**
- Partition key concept (Cassandra calls it "partition key")
- Wide-column NoSQL model
- Eventually consistent by default

**Differences:**
- Cassandra uses CQL (SQL-like), DynamoDB uses SDK
- Cassandra has tunable consistency per request (ONE, QUORUM, ALL)
- Cassandra is open-source, self-hosted (or DataStax Astra managed)

**When to use Cassandra:**
- Need open-source solution (no vendor lock-in)
- On-premises deployment
- Multi-datacenter replication built-in (free)
- Cost-sensitive (no per-request charges)

### vs MongoDB

**Similarities:**
- Schema-less (flexible attributes)
- Document/item storage
- Secondary indexes supported

**Differences:**
- MongoDB: richer query language, no partition key requirement
- MongoDB: BSON format with nested documents
- MongoDB: better for ad-hoc queries

**When to use MongoDB:**
- Need flexible, complex queries without partition keys
- Rapidly evolving schema
- Nested document structures
- ACID transactions across documents

### vs PostgreSQL

**Similarities:**
- ACID transactions (DynamoDB supports since 2018)
- Indexes for faster queries
- Primary key concept

**Differences:**
- PostgreSQL: relational model with JOINs
- PostgreSQL: SQL query language
- PostgreSQL: always strongly consistent
- PostgreSQL: harder to scale writes horizontally

**When to use PostgreSQL:**
- Need complex JOINs across tables
- Relational data with foreign keys
- Strong consistency required everywhere
- Moderate scale (vertical scaling sufficient)

### vs Redis

**Similarities:**
- Key-value access pattern
- Fast reads (DynamoDB: single-digit ms, Redis: sub-ms)
- Simple data structures

**Differences:**
- Redis: in-memory (DynamoDB: disk-based)
- Redis: microsecond latency (DynamoDB: milliseconds)
- Redis: limited persistence (DynamoDB: durable)
- Redis: simpler data types (no complex queries)

**When to use Redis:**
- Pure caching layer
- Microsecond latency required
- Simple data structures (strings, hashes, lists)
- Temporary data (sessions, rate limiting)

## Summary Decision Table

| Requirement | DynamoDB | Cassandra | MongoDB | PostgreSQL | Redis |
|-------------|----------|-----------|---------|------------|-------|
| Key-value access | ✅ Excellent | ✅ Excellent | ✅ Good | ⚠️ Possible | ✅ Excellent |
| Complex queries | ❌ Limited | ❌ Limited | ✅ Excellent | ✅ Excellent | ❌ None |
| Horizontal scale | ✅ Automatic | ✅ Built-in | ✅ Sharding | ⚠️ Manual | ⚠️ Cluster |
| Strong consistency | ✅ Optional | ⚠️ Tunable | ✅ Default | ✅ Always | ✅ Single-leader |
| Vendor lock-in | ❌ AWS-only | ✅ Open-source | ✅ Open-source | ✅ Open-source | ✅ Open-source |
| Operational overhead | ✅ None | ❌ High | ⚠️ Medium | ⚠️ Medium | ⚠️ Medium |

## Further Reading

- [DynamoDB Core Components](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html)
- [Query vs Scan](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html)
- [DynamoDB Data Types](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html)
- [DynamoDB Paper (2022)](https://www.amazon.science/publications/amazon-dynamodb-a-scalable-predictably-performant-and-fully-managed-nosql-database-service)
- [Cassandra vs DynamoDB](https://www.datastax.com/blog/cassandra-vs-dynamodb)
- [MongoDB vs DynamoDB](https://www.mongodb.com/compare/mongodb-dynamodb)
```

- [ ] **Step 3: Update test script to include basics example**

In `scripts/test-dynamodb-examples.ts`, uncomment the import for `basicsExample` (already done in Task 6).

- [ ] **Step 4: Test basics example runs**

Run: `npm run test:dynamodb`
Expected: Basics example passes

- [ ] **Step 5: Commit Example 01**

```bash
git add src/technologies/dynamodb/examples/01-basics/
git commit -m "feat: add DynamoDB Example 01 - Basics (CRUD, Query vs Scan)"
```

---

### Task 10: Main README

**Files:**
- Create: `src/technologies/dynamodb/README.md`

- [ ] **Step 1: Create main technology README**

Due to the README length (~400 lines), I'll provide the structure. Create `src/technologies/dynamodb/README.md` with these sections following the pattern from `src/technologies/redis/README.md` and `src/technologies/postgresql/README.md`:

**Section 1: What is DynamoDB?** (lines 1-30)
- Key characteristics (fully-managed, key-value/document, AWS-specific)
- Differentiators (serverless, auto-scaling, millisecond latency)
- Vendor lock-in acknowledgment

**Section 2: Why DynamoDB for Interviews?** (lines 31-65)
- Versatility (transactions, consistency options, scalability)
- When interviewers allow AWS services
- When to discuss alternatives (Cassandra, MongoDB)
- Depth over breadth for system design

**Section 3: 8 DynamoDB Examples** (lines 66-250)
- Example 1: Basics (CRUD, Query vs Scan)
- Example 2: Indexing (GSI, LSI, projections)
- Example 3: Consistency Models (eventual vs strong)
- Example 4: Transactions (ACID, optimistic locking)
- Example 5: Single-Table Design (composite keys, overloaded GSIs)
- Example 6: Streams (CDC, event-driven)
- Example 7: Performance (DAX, batch ops, hot partitions)
- Example 8: Production Patterns (capacity planning, Global Tables, TTL)

Each example includes:
- What you'll learn
- Key concepts
- Interview relevance
- Example path

**Section 4: Key Concepts Across Examples** (lines 251-320)
- Data model (tables, items, attributes)
- Partition and sort keys (hashing, B-trees)
- CAP theorem positioning (AP default, CP with strong reads)
- Consistency models (eventual vs strong, trade-offs)
- Pricing basics (RCU/WCU, per-request costs)

**Section 5: Getting Started** (lines 321-360)
- Running examples (Docker, CLI)
- Using dynamodb-admin GUI
- Resetting data

**Section 6: Production Considerations** (lines 361-410)
- Capacity planning (RCU/WCU calculations)
- Cost estimation (back-of-envelope)
- Monitoring (CloudWatch metrics)
- Common pitfalls (hot partitions, scan operations, over-indexing)

**Section 7: Interview Tips** (lines 411-460)
- Do's: Discuss partition key strategy, explain consistency trade-offs, mention alternatives
- Don'ts: Assume DynamoDB for everything, ignore costs, forget item size limits
- Common questions with answers

**Section 8: DynamoDB vs Alternatives** (lines 461-520)
- vs Cassandra/ScyllaDB (open-source, multi-DC, cost)
- vs MongoDB (flexible queries, schema evolution)
- vs PostgreSQL (relational, JOINs, strong consistency)
- vs Redis (in-memory, caching, latency)

**Section 9: Further Reading** (lines 521-550)
- AWS documentation links
- DynamoDB paper
- Comparison articles
- Open-source alternatives

**Section 10: Common Use Cases Summary** (lines 551-580)
- Table: use case → DynamoDB feature → example

Reference the key_technologies document: `../../../key_technologies/dynamodb/original.md`

- [ ] **Step 2: Verify README follows pattern**

Compare structure to `src/technologies/redis/README.md` - should have similar sections and tone.

- [ ] **Step 3: Check README length**

Run: `wc -l src/technologies/dynamodb/README.md`
Expected: ~400-450 lines (similar to Redis)

- [ ] **Step 4: Commit main README**

```bash
git add src/technologies/dynamodb/README.md
git commit -m "docs: add comprehensive DynamoDB technology README"
```

---

### Task 11: Update Root README

**Files:**
- Modify: `README.md:30-36`

- [ ] **Step 1: Add DynamoDB to technologies list**

Update the "What's Inside" section in root `README.md`:

```markdown
### Technologies

- ✅ **Redis** (10 examples) - Cache, distributed locks, leaderboards, rate limiting, pub/sub, and more
- ✅ **PostgreSQL** (7 examples) - SQL operations, transactions, indexing, read/write scaling, optimization
- ✅ **DynamoDB** (8 examples) - NoSQL key-value, indexes, consistency, transactions, single-table design
- ✅ **Kafka** (2 examples, more coming) - Event streaming, partitioning, message ordering
- 🔜 **Cassandra** - Coming soon
- 🔜 **Elasticsearch** - Coming soon
```

- [ ] **Step 2: Add DynamoDB to scripts documentation**

Update the "Available Commands" section:

```markdown
npm run test:dynamodb     # Run DynamoDB integration tests
npm run reset:dynamodb    # Reset only DynamoDB data
```

- [ ] **Step 3: Add DynamoDB examples section**

Add after PostgreSQL examples section:

```markdown
## DynamoDB Examples

The DynamoDB technology includes 8 comprehensive examples:

1. **Basics** - CRUD operations, Query vs Scan, partition/sort keys
2. **Indexing** - GSIs and LSIs, projection strategies, access patterns
3. **Consistency Models** - Eventual vs strong consistency, CAP theorem
4. **Transactions** - ACID guarantees, optimistic locking, multi-item writes
5. **Single-Table Design** - Composite keys, overloaded GSIs, adjacency lists
6. **Streams (CDC)** - Change data capture, event-driven architecture
7. **Performance** - DAX caching, batch operations, hot partition handling
8. **Production Patterns** - Capacity planning, Global Tables, TTL, monitoring

Each example includes:
- What it demonstrates
- Why you'd use this pattern
- How it works
- Key DynamoDB concepts
- Production considerations
- DynamoDB vs alternatives (Cassandra, MongoDB, PostgreSQL, Redis)
- Further reading

See `src/technologies/dynamodb/README.md` for more details.
```

- [ ] **Step 4: Update services documentation**

Add DynamoDB to services list:

```markdown
### DynamoDB Local
- **Port**: 8000
- **UI**: dynamodb-admin at http://localhost:8003
- **Image**: amazon/dynamodb-local (official AWS image)
```

- [ ] **Step 5: Commit root README updates**

```bash
git add README.md
git commit -m "docs: add DynamoDB to root README with examples overview"
```

---

### Task 12: Remaining Examples Stubs

**Note:** This task creates placeholder files for Examples 2-8 so the CLI doesn't break. Each will be a minimal stub that can be expanded later.

**Files:**
- Create: `src/technologies/dynamodb/examples/02-indexing/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/03-consistency-models/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/04-transactions/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/05-single-table-design/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/06-streams/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/07-performance/index.ts` + `README.md`
- Create: `src/technologies/dynamodb/examples/08-production-patterns/index.ts` + `README.md`

- [ ] **Step 1: Create stub for Example 02 - Indexing**

Create `src/technologies/dynamodb/examples/02-indexing/index.ts`:

```typescript
import type { DynamoDBExample, Logger, DynamoDBClients } from '../../../../lib/types.js';

export const indexingExample: DynamoDBExample = {
  name: 'Indexing: GSIs and LSIs',
  description: 'Global and Local Secondary Indexes',

  async run(clients: DynamoDBClients, logger: Logger): Promise<void> {
    logger.section('🔍 DynamoDB Indexing: GSIs and LSIs');
    logger.warning('This example is coming soon!\n');
    logger.info('Will demonstrate:');
    logger.info('  • Creating Global Secondary Indexes (GSI)');
    logger.info('  • Creating Local Secondary Indexes (LSI)');
    logger.info('  • Projection strategies (ALL, KEYS_ONLY, INCLUDE)');
    logger.info('  • Query patterns with indexes\n');
  },
};
```

Create `src/technologies/dynamodb/examples/02-indexing/README.md`:

```markdown
# Example 2: Indexing - GSIs and LSIs

*Coming soon!*

This example will demonstrate Global and Local Secondary Indexes in DynamoDB.
```

- [ ] **Step 2: Create stub for Example 03 - Consistency Models**

Create similar stub files for `03-consistency-models`:

```typescript
export const consistencyExample: DynamoDBExample = {
  name: 'Consistency Models',
  description: 'Eventual vs Strong Consistency',
  // ... similar stub structure
};
```

- [ ] **Step 3: Create stubs for Examples 04-08**

Create minimal stub files for:
- `04-transactions/index.ts` + `README.md`
- `05-single-table-design/index.ts` + `README.md`
- `06-streams/index.ts` + `README.md`
- `07-performance/index.ts` + `README.md`
- `08-production-patterns/index.ts` + `README.md`

Each with name, description, and "coming soon" message.

- [ ] **Step 4: Add stub imports to CLI**

Update `src/cli.ts` to import all 8 examples (the stubs will satisfy TypeScript):

```typescript
import { basicsExample as dynamoBasicsExample } from './technologies/dynamodb/examples/01-basics/index.js';
import { indexingExample } from './technologies/dynamodb/examples/02-indexing/index.js';
import { consistencyExample } from './technologies/dynamodb/examples/03-consistency-models/index.js';
import { transactionsExample as dynamoTransactionsExample } from './technologies/dynamodb/examples/04-transactions/index.js';
import { singleTableExample } from './technologies/dynamodb/examples/05-single-table-design/index.js';
import { streamsExample } from './technologies/dynamodb/examples/06-streams/index.js';
import { performanceExample } from './technologies/dynamodb/examples/07-performance/index.js';
import { productionExample } from './technologies/dynamodb/examples/08-production-patterns/index.js';
```

Update `DYNAMODB_EXAMPLES` array:

```typescript
const DYNAMODB_EXAMPLES: DynamoDBExample[] = [
  dynamoBasicsExample,
  indexingExample,
  consistencyExample,
  dynamoTransactionsExample,
  singleTableExample,
  streamsExample,
  performanceExample,
  productionExample,
];
```

- [ ] **Step 5: Verify CLI shows all 8 examples**

Run: `npm start`
Select: DynamoDB
Expected: Shows all 8 examples in menu

- [ ] **Step 6: Commit example stubs**

```bash
git add src/technologies/dynamodb/examples/ src/cli.ts
git commit -m "feat: add placeholder stubs for DynamoDB examples 2-8"
```

---

## Self-Review Checklist

After completing all tasks, verify:

**Spec coverage:**
- ✅ Docker infrastructure (DynamoDB Local + dynamodb-admin)
- ✅ NPM dependencies (@aws-sdk packages)
- ✅ Type system (DynamoDBExample, DynamoDBClients)
- ✅ Client wrapper (connection, health check, reset)
- ✅ CLI integration (menu, connection, examples runner)
- ✅ Reset scripts (dynamodb, all)
- ✅ Test infrastructure (test-dynamodb-examples, test-all)
- ✅ Example 01: Basics (full implementation)
- ✅ Main README (~400 lines)
- ✅ Root README updates
- ✅ Examples 2-8 stubs (so CLI works)

**No placeholders:**
- All code blocks have actual implementation
- No "TBD", "TODO", "implement later"
- File paths are exact
- Commands have expected output

**Type consistency:**
- `DynamoDBExample` type used throughout
- `DynamoDBClients` interface matches client wrapper
- All imports use correct paths (.js extensions)

**Pattern consistency:**
- Matches Redis/PostgreSQL/Kafka structure
- Logger usage consistent
- CLI integration follows existing pattern
- README structure mirrors Redis/PostgreSQL

## Next Steps (Post-Plan)

After completing this plan, Examples 2-8 should be fully implemented following the same pattern as Example 1. Each will require:

1. Full `index.ts` implementation
2. Comprehensive `README.md` (~100-150 lines)
3. DynamoDB vs Alternatives section
4. Test coverage in `test-dynamodb-examples.ts`

This plan focuses on infrastructure + Example 1 + stubs to get the section operational. Subsequent work can implement each example one at a time.
