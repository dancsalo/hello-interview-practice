# Redis Proximity Search

## What

Demonstrates Redis geospatial capabilities for location-based queries like "find nearby restaurants" or "nearest delivery driver."

## Why

Geospatial queries power:
- Food delivery (restaurants, drivers)
- Ride-sharing (find nearby drivers)
- Real estate (homes in area)
- Social apps (nearby users)
- IoT (device locations)

Redis provides fast, in-memory proximity search without needing a specialized geospatial database for many use cases.

## How

The example demonstrates:
1. **GEOADD**: Store locations (restaurants, drivers)
2. **GEOSEARCH**: Find locations within radius or bounding box
3. **GEODIST**: Calculate distance between two points
4. **GEOHASH**: View internal geohash encoding
5. **Real-time tracking**: Update driver locations

## Key Commands

- `GEOADD key longitude latitude member` - Add location
- `GEOSEARCH key FROMLONLAT lon lat BYRADIUS radius unit` - Find nearby
- `GEOSEARCH key FROMLONLAT lon lat BYBOX width height unit` - Find in box
- `GEODIST key member1 member2 unit` - Distance between points
- `GEOHASH key member [member ...]` - Get geohash
- `GEOPOS key member [member ...]` - Get coordinates
- `ZREM key member` - Remove location (geo uses sorted sets)

## Try It

Run the example and observe:
1. Adding restaurant locations
2. Radius search (2km around user)
3. Distance calculations
4. Sorted results (closest first)
5. Bounding box queries
6. Real-time driver tracking

## Production Considerations

### How It Works Internally

Redis Geo commands are backed by **sorted sets** (ZADD, ZREM, etc.):

1. Location (lat/lon) → **Geohash** (base32 string)
2. Geohash → **52-bit integer**
3. Integer stored as sorted set score

Example:
```
Location: 37.7749° N, 122.4194° W
Geohash: 9q8yyk8yuv8
Integer: 3750183509590286
```

This means:
- You can use `ZREM` to remove locations
- You can use `ZCARD` to count locations
- Underlying data structure is sorted set

### Geohash Precision

Geohash length determines accuracy:

| Characters | Precision | Use Case |
|------------|-----------|----------|
| 1 | ±2500 km | Country |
| 3 | ±78 km | City |
| 5 | ±2.4 km | Neighborhood |
| 7 | ±76 m | Street |
| 9 | ±2.4 m | Building |
| 11 | ±0.076 m | Room |

Redis uses 52-bit integers = ~11 character geohashes = ~1 meter accuracy.

**Implication**: Perfect for most applications, but not for:
- Centimeter-level precision (surveying)
- Indoor positioning (floor level)

### Performance Complexity

**GEOADD**: `O(log(N))` - same as ZADD
**GEOSEARCH**: `O(N + log(M))`
- `N` = number of elements inside radius/box
- `M` = total elements in set

Example with 1 million locations:
- Search 1km radius in city = ~100 results
- `O(100 + log(1,000,000))` = `O(100 + 20)` ≈ 120 operations
- **Extremely fast** (microseconds)

**Why so fast?**
Geohash allows **spatial indexing** - Redis only checks relevant grid cells, not all 1M locations.

### Memory Usage

~100 bytes per location:
```
Key overhead: 20 bytes
Member name: 20-50 bytes
Score (geohash): 8 bytes
Sorted set overhead: 20-30 bytes
Total: ~100 bytes
```

1 million locations = ~100 MB (very efficient!)

### Updating Locations

**GEOADD overwrites** existing members:
```typescript
// Initial position
await redis.geoAdd('drivers', { lon: -122.4, lat: 37.7, member: 'driver:1' });

// Update (overwrites)
await redis.geoAdd('drivers', { lon: -122.5, lat: 37.8, member: 'driver:1' });
```

For high-frequency updates:
```typescript
// Batch updates every 5 seconds instead of every GPS ping
const updates = [];
for (const driver of activeDrivers) {
  updates.push({
    longitude: driver.lon,
    latitude: driver.lat,
    member: driver.id,
  });
}
await redis.geoAdd('drivers', updates);
```

### Radius vs Bounding Box

**Radius** (circle):
```typescript
GEOSEARCH key FROMLONLAT lon lat BYRADIUS 5 km
```
- Natural for "nearby" queries
- More database-friendly

**Bounding Box** (rectangle):
```typescript
GEOSEARCH key FROMLONLAT lon lat BYBOX 10 8 km
```
- Better for map viewports
- Easier to tile for caching

### GEOSEARCHSTORE for Caching

Store search results for reuse:
```typescript
// Calculate once
await redis.geoSearchStore(
  'results:user:1001', // destination key
  'restaurants',       // source key
  { longitude: -122.4, latitude: 37.7 },
  { radius: 5, unit: 'km' }
);

// Multiple consumers can read cached results
const results = await redis.geoSearch('results:user:1001', ...);

// Set TTL on cache
await redis.expire('results:user:1001', 300); // 5 minutes
```

### TTL Pattern for Expiring Locations

Geo commands don't support TTL directly. Pattern:

```typescript
// Add location
await redis.geoAdd('drivers:active', {
  longitude: driver.lon,
  latitude: driver.lat,
  member: driver.id,
});

// Store timestamp separately
await redis.set(`driver:${driver.id}:last_seen`, Date.now(), { EX: 300 });

// Cleanup job (runs periodically)
async function cleanupInactiveDrivers() {
  const allDrivers = await redis.zRange('drivers:active', 0, -1);

  for (const driverId of allDrivers) {
    const lastSeen = await redis.get(`driver:${driverId}:last_seen`);
    if (!lastSeen) {
      // TTL expired, remove from geo index
      await redis.zRem('drivers:active', driverId);
    }
  }
}
```

### Dealing with Edges

**Date Line** (longitude ±180°):
- Redis handles wraparound correctly
- Query near Hawaii works across date line

**Poles** (latitude ±90°):
- Geohash becomes less accurate near poles
- Rarely an issue (few users at poles)
- Consider special handling if needed

### Scaling Considerations

**Single Redis Instance**:
- Handles millions of locations
- Sub-millisecond queries
- Good for most applications

**When to Shard**:
- Billions of locations
- Very high write rate (updating all locations frequently)

**Sharding Strategy**:
```typescript
// Shard by region
const region = getRegion(lat, lon); // 'us-west', 'us-east', etc.
const key = `locations:${region}`;
await redis.geoAdd(key, location);

// Query might need multiple shards
const results = await Promise.all([
  redis.geoSearch('locations:us-west', ...),
  redis.geoSearch('locations:us-east', ...),
]);
```

### When to Use PostGIS Instead

Use PostgreSQL + PostGIS if:

**Complex Spatial Queries**:
```sql
-- Find restaurants in polygon with specific attributes
SELECT * FROM restaurants
WHERE ST_Within(location, ST_GeomFromText('POLYGON(...)'))
  AND rating >= 4.0
  AND cuisine = 'Italian'
  AND price_level <= 2;
```

**Spatial Joins**:
```sql
-- Find drivers within 2km of any restaurant with pending order
SELECT d.id, r.name
FROM drivers d, restaurants r
WHERE ST_DWithin(d.location, r.location, 2000)
  AND r.has_pending_order = true;
```

**Persistent Data**:
- Locations are primary data (not cache)
- Need ACID transactions
- Complex relationships

**Large Historical Data**:
- Billions of historical points
- Time-series analysis
- Not real-time queries

### Use Redis When:

- **Real-time queries** (drivers, users moving)
- **Simple proximity search** (radius, nearest)
- **High read/write throughput**
- **Low latency required** (< 10ms)
- **Location as cache** (can rebuild from DB)

### Hybrid Approach

Best of both worlds:

```typescript
// PostgreSQL: Source of truth
await db.query('INSERT INTO drivers (id, lat, lon) VALUES ($1, $2, $3)');

// Redis: Fast queries
await redis.geoAdd('drivers:active', { lat, lon, member: driverId });

// Query Redis for speed
const nearby = await redis.geoSearch('drivers:active', ...);

// Enrich from PostgreSQL
const driversData = await db.query(
  'SELECT * FROM drivers WHERE id = ANY($1)',
  [nearby.map(d => d.member)]
);
```

### Testing Geospatial Queries

```typescript
describe('Proximity Search', () => {
  it('finds locations within radius', async () => {
    await redis.geoAdd('test:locations', [
      { lon: -122.4, lat: 37.7, member: 'a' },
      { lon: -122.5, lat: 37.8, member: 'b' },
      { lon: -122.4, lat: 37.7001, member: 'c' }, // ~11m away
    ]);

    const nearby = await redis.geoSearch(
      'test:locations',
      { longitude: -122.4, latitude: 37.7 },
      { radius: 100, unit: 'm' }
    );

    expect(nearby.map(r => r.member)).toContain('a');
    expect(nearby.map(r => r.member)).toContain('c');
    expect(nearby.map(r => r.member)).not.toContain('b');
  });

  it('calculates distance correctly', async () => {
    await redis.geoAdd('test:locations', [
      { lon: -122.4, lat: 37.7, member: 'a' },
      { lon: -122.4, lat: 37.8, member: 'b' },
    ]);

    const dist = await redis.geoDist('test:locations', 'a', 'b', 'km');
    expect(dist).toBeCloseTo(11.1, 1); // ~11.1 km
  });
});
```

### Monitoring

Track these metrics:
- Query latency (P50, P99)
- Result set sizes
- Memory usage per geo key
- Update frequency
- Cache hit rate (if using GEOSEARCHSTORE)

Alert on:
- Slow queries (> 10ms)
- Large result sets (> 1000)
- Memory growth (leaking locations)

## Further Reading

- [Redis Geospatial Commands](https://redis.io/docs/data-types/geospatial/)
- [Geohash Algorithm](https://en.wikipedia.org/wiki/Geohash)
- [PostGIS for complex queries](https://postgis.net/)
- [Uber's Geospatial Index](https://eng.uber.com/h3/)
