# Redis Bloom Filters

## What

Demonstrates probabilistic data structures for space-efficient membership testing using RedisBloom module.

## Why

Bloom filters solve the "is this item in a set?" question with:
- **90-99% less memory** than regular sets
- **Constant O(k) time** regardless of set size
- **Trade-off**: Small chance of false positives

Use cases:
- Username availability (avoid DB query)
- URL deduplication (web crawling)
- Email spam detection
- Malicious IP blocking
- Cache filtering (avoid cache misses)
- Database query reduction

## How

The example demonstrates:
1. **BF.RESERVE**: Create bloom filter with error rate
2. **BF.ADD**: Add items
3. **BF.EXISTS**: Check membership
4. **BF.MADD/BF.MEXISTS**: Bulk operations
5. **False positive rate**: Measure accuracy
6. **Memory comparison**: Bloom filter vs regular set
7. **Scalable filters**: Auto-expansion

## Key Commands

**Note**: Requires RedisBloom module (included in Redis Stack)

- `BF.RESERVE key error_rate capacity [EXPANSION expansion]` - Create filter
- `BF.ADD key item` - Add item (returns 0 if already exists)
- `BF.MADD key item [item ...]` - Add multiple items
- `BF.EXISTS key item` - Check if item exists (1 = maybe, 0 = definitely not)
- `BF.MEXISTS key item [item ...]` - Check multiple items
- `BF.INFO key` - Get filter statistics
- `BF.INSERT key [CAPACITY capacity] [ERROR error_rate] ITEMS item [item ...]` - Insert with auto-create

## Try It

Run the example and observe:
1. Bloom filter creation with error rate
2. Adding usernames
3. Membership checks (true positives)
4. False positive demonstration
5. Memory savings vs regular set
6. Bulk operations
7. Auto-scaling behavior

## Production Considerations

### How Bloom Filters Work

**Internal structure**:
1. Bit array of size `m`
2. `k` hash functions
3. Add item: Set `k` bits to 1
4. Check item: Test if all `k` bits are 1

**Example with k=3**:
```
Add "alice":
  hash1("alice") % m = 5  → bit[5] = 1
  hash2("alice") % m = 12 → bit[12] = 1
  hash3("alice") % m = 23 → bit[23] = 1

Check "alice":
  Are bits 5, 12, 23 all 1? Yes → "alice" MAY be in set

Check "bob":
  hash1("bob") % m = 5  → bit[5] = 1 ✓
  hash2("bob") % m = 30 → bit[30] = 0 ✗
  Not all bits set → "bob" is DEFINITELY NOT in set
```

### False Positives (But Never False Negatives)

**False positive** - Says "yes" when answer is "no":
```typescript
await bf.add('alice');
await bf.exists('alice'); // true (correct)
await bf.exists('alicia'); // might be true (false positive)
```

Happens when an item's hash positions collide with other items' bits.

**False negative** - NEVER happens:
```typescript
await bf.add('alice');
await bf.exists('alice'); // always true (never false negative)
```

**Why?** If item was added, its bits are definitely set. We might incorrectly think other items are in the set (collision), but we'll never miss an item that was actually added.

### Error Rate Configuration

**Formula**: `m = -n * ln(p) / (ln(2))^2`
- `n` = expected items
- `p` = desired error rate
- `m` = bits needed

**Example configurations**:

| Error Rate | Bytes per Item | Use Case |
|------------|----------------|----------|
| 1% (0.01) | 1.2 bytes | General purpose |
| 0.1% (0.001) | 1.8 bytes | Low false positives |
| 0.01% (0.0001) | 2.4 bytes | Critical applications |
| 10% (0.10) | 0.6 bytes | Aggressive space savings |

**Creating bloom filter**:
```typescript
// 1 million items, 1% error rate
await redis.sendCommand(['BF.RESERVE', 'usernames', '0.01', '1000000']);

// Calculates:
// - Optimal bit array size
// - Optimal number of hash functions
```

**Comparison with regular set**:
```typescript
// Regular set: ~100 bytes per item
// 1M items = 100 MB

// Bloom filter: 1.2 bytes per item (1% error)
// 1M items = 1.2 MB

// Space savings: 98.8%
```

### Memory Usage

**Space formula**: `bytes = (n * bits_per_item) / 8`

Where `bits_per_item = -log2(p) / ln(2)` ≈ `1.44 * log2(1/p)`

**Examples**:
```
1% error: 1.44 * log2(100) = 9.6 bits/item = 1.2 bytes/item
0.1% error: 14.4 bits/item = 1.8 bytes/item
0.01% error: 19.2 bits/item = 2.4 bytes/item
```

**Real numbers**:
- 1 million usernames, 1% error: ~1.2 MB
- 1 billion URLs, 0.1% error: ~1.8 GB
- 10 million IPs, 0.01% error: ~24 MB

### Performance

**Time complexity**: `O(k)` where k = number of hash functions
- Typically k = 7-10 for 1% error rate
- **Constant time** regardless of items in filter

**Comparison**:
```
Bloom filter: O(7) = constant
Hash table: O(1) average, O(n) worst case
Binary search: O(log n)
Database query: O(1) with index, but 10-100ms latency
```

**Throughput**:
- BF.EXISTS: ~100k ops/sec per core
- BF.ADD: ~80k ops/sec per core
- Much faster than database query

### When to Use Bloom Filters

**Great use cases**:

**1. Avoiding expensive operations**:
```typescript
// Bad: Check database for every username
async function isUsernameTaken(username: string): Promise<boolean> {
  return await db.query('SELECT 1 FROM users WHERE username = $1', [username]);
  // Cost: 10-50ms per query
}

// Good: Check bloom filter first
async function isUsernameTaken(username: string): Promise<boolean> {
  const mightExist = await redis.sendCommand(['BF.EXISTS', 'usernames', username]);

  if (!mightExist) {
    return false; // Definitely available (0ms to user!)
  }

  // Only query DB if bloom filter says "maybe"
  return await db.query('SELECT 1 FROM users WHERE username = $1', [username]);
  // False positive rate: 1% of checks hit DB
}
```

**2. URL deduplication in web crawler**:
```typescript
const seenUrls = 'crawler:seen';

async function shouldCrawl(url: string): Promise<boolean> {
  const seen = await redis.sendCommand(['BF.EXISTS', seenUrls, url]);

  if (seen) {
    return false; // Probably crawled already
  }

  await redis.sendCommand(['BF.ADD', seenUrls, url]);
  return true; // Definitely not crawled
}

// Handles billions of URLs in a few GB of RAM
```

**3. Spam/malware detection**:
```typescript
// 100M known malicious IPs, 0.01% error, ~240 MB
await redis.sendCommand(['BF.RESERVE', 'malicious_ips', '0.0001', '100000000']);

async function isBlockedIP(ip: string): Promise<boolean> {
  return await redis.sendCommand(['BF.EXISTS', 'malicious_ips', ip]) === 1;
  // < 1ms check vs database query or API call
}
```

**4. Cache negative lookups**:
```typescript
// Problem: Cache misses hit database
async function getUser(userId: string) {
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  // DB query for every miss (expensive)
  const user = await db.getUser(userId);
  if (user) await redis.set(`user:${userId}`, JSON.stringify(user));
  return user;
}

// Solution: Bloom filter of existing user IDs
async function getUser(userId: string) {
  const cached = await redis.get(`user:${userId}`);
  if (cached) return JSON.parse(cached);

  // Check bloom filter first
  const exists = await redis.sendCommand(['BF.EXISTS', 'user_ids', userId]);
  if (!exists) {
    return null; // Definitely doesn't exist, skip DB
  }

  const user = await db.getUser(userId);
  if (user) await redis.set(`user:${userId}`, JSON.stringify(user));
  return user;
}
```

### When NOT to Use Bloom Filters

**Bad use cases**:

**1. Need to delete items**:
```typescript
// Cannot remove from bloom filter
await redis.sendCommand(['BF.ADD', 'blocked_users', 'user:123']);
// User unblocked - can't remove!

// Solution: Use Cuckoo filter (CF.ADD/CF.DEL) or regular set
```

**2. Small datasets** (< 1000 items):
```typescript
// Not worth complexity for 100 items
// Regular set uses 5-10 KB anyway
```

**3. Zero false positives required**:
```typescript
// Financial transactions, security decisions
// Use exact data structures (hash sets, databases)
```

**4. Need item retrieval**:
```typescript
// Bloom filters only answer "is item in set?"
// Cannot retrieve items, count, or list them
```

### Scalable Bloom Filters

**Problem**: Fixed size filters fill up, error rate increases

**Solution**: Auto-expanding filters
```typescript
// EXPANSION 2 means each new sub-filter is 2x larger
await redis.sendCommand([
  'BF.RESERVE',
  'usernames',
  '0.01',  // target error rate
  '10000', // initial capacity
  'EXPANSION',
  '2',     // growth factor
]);

// Add 100k items (10x capacity)
// Filter automatically creates sub-filters:
// Filter 0: 10k capacity
// Filter 1: 20k capacity
// Filter 2: 40k capacity
// Filter 3: 80k capacity
// ...

// Maintains ~1% error rate overall
```

**Trade-off**: Slightly higher memory usage, but automatic scaling.

### Cuckoo Filters (Alternative)

If you need **deletion**, use Cuckoo filters instead:

```typescript
// Create cuckoo filter
await redis.sendCommand(['CF.RESERVE', 'usernames', '10000']);

// Add item
await redis.sendCommand(['CF.ADD', 'usernames', 'alice']);

// Check existence
await redis.sendCommand(['CF.EXISTS', 'usernames', 'alice']); // 1

// DELETE (not possible with bloom filters!)
await redis.sendCommand(['CF.DEL', 'usernames', 'alice']);

await redis.sendCommand(['CF.EXISTS', 'usernames', 'alice']); // 0
```

**Trade-offs**:
- Cuckoo filters: Can delete, but higher false positive rate
- Bloom filters: Cannot delete, but lower error rate for same space

### Monitoring

**Metrics to track**:
```typescript
const info = await redis.sendCommand(['BF.INFO', 'usernames']);

// Parse response
const capacity = info[1];      // Expected items
const size = info[3];          // Actual items
const filters = info[5];       // Number of sub-filters
const expansion = info[11];    // Expansion rate

logger.metric('bloom.capacity', capacity);
logger.metric('bloom.size', size);
logger.metric('bloom.fill_ratio', size / capacity);

// Measure actual false positive rate
let falsePositives = 0;
for (const item of testSet) {
  const bloomSays = await redis.sendCommand(['BF.EXISTS', 'usernames', item]);
  const actuallyExists = await actualCheck(item);

  if (bloomSays && !actuallyExists) {
    falsePositives++;
  }
}

logger.metric('bloom.false_positive_rate', falsePositives / testSet.length);
```

**Alerts**:
- False positive rate > 2x configured rate
- Fill ratio > 0.8 (filter getting full)
- Memory usage growing unexpectedly

### Testing

```typescript
describe('Bloom Filter', () => {
  it('never has false negatives', async () => {
    await redis.sendCommand(['BF.RESERVE', 'test', '0.01', '1000']);

    const items = ['a', 'b', 'c'];
    for (const item of items) {
      await redis.sendCommand(['BF.ADD', 'test', item]);
    }

    // All added items must be found
    for (const item of items) {
      const exists = await redis.sendCommand(['BF.EXISTS', 'test', item]);
      expect(exists).toBe(1);
    }
  });

  it('has acceptable false positive rate', async () => {
    await redis.sendCommand(['BF.RESERVE', 'test', '0.01', '10000']);

    // Add 1000 items
    for (let i = 0; i < 1000; i++) {
      await redis.sendCommand(['BF.ADD', 'test', `item${i}`]);
    }

    // Test 10000 non-existent items
    let falsePositives = 0;
    for (let i = 10000; i < 20000; i++) {
      const exists = await redis.sendCommand(['BF.EXISTS', 'test', `item${i}`]);
      if (exists) falsePositives++;
    }

    const rate = falsePositives / 10000;
    expect(rate).toBeLessThan(0.02); // < 2% (configured 1%, allow margin)
  });
});
```

## Further Reading

- [RedisBloom Documentation](https://redis.io/docs/stack/bloom/)
- [Bloom Filter Wikipedia](https://en.wikipedia.org/wiki/Bloom_filter)
- [Cuckoo Filters](https://www.cs.cmu.edu/~dga/papers/cuckoo-conext2014.pdf)
- [Bloom Filter Calculator](https://hur.st/bloomfilter/)
