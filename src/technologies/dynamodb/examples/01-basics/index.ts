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
    logger.assert(!!(filterResult.Items && filterResult.Items.length === 3), 'Filter returned SF users');
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
