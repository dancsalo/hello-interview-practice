import type { RedisClientType } from 'redis';
import type { Example, Logger } from '../../../../lib/types.js';

export const proximitySearchExample: Example = {
  name: 'Proximity Search',
  description: 'Geospatial queries for location-based services',

  async run(client: RedisClientType, logger: Logger): Promise<void> {
    logger.section('📦 Redis Example: Proximity Search');
    logger.info('Food delivery: find nearby restaurants\n');

    const restaurantsKey = 'locations:restaurants';
    const driversKey = 'locations:drivers';

    // Step 1: Add restaurant locations
    logger.step('Step 1: Add Restaurant Locations (GEOADD)');

    const restaurants = [
      { name: 'Pizza Palace', longitude: -122.4194, latitude: 37.7749 }, // SF Downtown
      { name: 'Burger Haven', longitude: -122.4312, latitude: 37.7849 }, // SF North
      { name: 'Sushi Spot', longitude: -122.4083, latitude: 37.7849 }, // SF Northeast
      { name: 'Taco Town', longitude: -122.4194, latitude: 37.7649 }, // SF South
      { name: 'Pasta Place', longitude: -122.4294, latitude: 37.7749 }, // SF West
    ];

    for (const restaurant of restaurants) {
      await client.geoAdd(restaurantsKey, {
        longitude: restaurant.longitude,
        latitude: restaurant.latitude,
        member: restaurant.name,
      });
    }

    logger.command(
      `GEOADD ${restaurantsKey} ${restaurants.map(r => `${r.longitude} ${r.latitude} "${r.name}"`).join(' ')}`
    );
    logger.success(`Added ${restaurants.length} restaurants\n`);

    // Step 2: Find nearby restaurants
    logger.step('Step 2: Find Restaurants Within 2km (GEOSEARCH)');

    const userLocation = { longitude: -122.4194, latitude: 37.7749 }; // Downtown SF
    logger.info(`User location: ${userLocation.latitude}, ${userLocation.longitude}\n`);

    const nearbyRestaurants = await client.geoSearch(
      restaurantsKey,
      userLocation,
      { radius: 2, unit: 'km' }
    ) as string[];

    logger.command(
      `GEOSEARCH ${restaurantsKey} FROMLONLAT ${userLocation.longitude} ${userLocation.latitude} BYRADIUS 2 km`
    );

    logger.info('Nearby restaurants:');
    for (const result of nearbyRestaurants) {
      logger.info(`  - ${result}`);
    }
    logger.success(`Found ${nearbyRestaurants.length} restaurants\n`);

    // Step 3: Find distance between two points
    logger.step('Step 3: Calculate Distance Between Restaurants (GEODIST)');

    const distance = await client.geoDist(restaurantsKey, 'Pizza Palace', 'Burger Haven', 'km');
    logger.command(`GEODIST ${restaurantsKey} "Pizza Palace" "Burger Haven" km`, `${distance?.toFixed(2)}km`);

    if (distance) {
      logger.info(`Distance between Pizza Palace and Burger Haven: ${distance.toFixed(2)}km\n`);
    }

    // Step 4: Find closest restaurants (sorted by distance)
    logger.step('Step 4: Find 3 Closest Restaurants (GEOSEARCH with COUNT)');

    const closest = await client.geoSearch(
      restaurantsKey,
      userLocation,
      { radius: 10, unit: 'km' }
    ) as string[];

    logger.command(
      `GEOSEARCH ${restaurantsKey} FROMLONLAT ${userLocation.longitude} ${userLocation.latitude} BYRADIUS 10 km COUNT 3`
    );

    logger.info('3 closest restaurants:');
    closest.slice(0, 3).forEach((result, index) => {
      logger.info(`  ${index + 1}. ${result}`);
    });
    logger.success('');

    // Step 5: Find restaurants in a bounding box
    logger.step('Step 5: Find Restaurants in Area (GEOSEARCHSTORE)');

    const boxResults = await client.geoSearch(
      restaurantsKey,
      userLocation,
      { width: 3, height: 3, unit: 'km' }
    ) as string[];

    logger.command(
      `GEOSEARCH ${restaurantsKey} FROMLONLAT ${userLocation.longitude} ${userLocation.latitude} BYBOX 3 3 km`
    );

    logger.info(`Restaurants in 3km x 3km box: ${boxResults.length}`);
    boxResults.forEach(result => {
      logger.info(`  - ${result}`);
    });
    logger.success('');

    // Step 6: Real-time driver tracking
    logger.step('Step 6: Real-Time Driver Locations');
    logger.info('Track delivery drivers and find nearest to restaurant\n');

    const drivers = [
      { id: 'driver:001', longitude: -122.4184, latitude: 37.7759 },
      { id: 'driver:002', longitude: -122.4204, latitude: 37.7739 },
      { id: 'driver:003', longitude: -122.4304, latitude: 37.7849 },
    ];

    for (const driver of drivers) {
      await client.geoAdd(driversKey, {
        longitude: driver.longitude,
        latitude: driver.latitude,
        member: driver.id,
      });
    }

    logger.command(`GEOADD ${driversKey} [${drivers.length} drivers]`);

    // Find nearest driver to Pizza Palace
    const pizzaPalaceLocation = restaurants.find(r => r.name === 'Pizza Palace')!;
    const nearestDrivers = await client.geoSearch(
      driversKey,
      { longitude: pizzaPalaceLocation.longitude, latitude: pizzaPalaceLocation.latitude },
      { radius: 5, unit: 'km' }
    ) as string[];

    logger.command(
      `GEOSEARCH ${driversKey} FROMLONLAT ${pizzaPalaceLocation.longitude} ${pizzaPalaceLocation.latitude} BYRADIUS 5 km COUNT 1`
    );

    if (nearestDrivers.length > 0) {
      const driver = nearestDrivers[0];
      logger.success(`Nearest driver to Pizza Palace: ${driver}\n`);
    }

    // Step 7: Get geohash
    logger.step('Step 7: Geohash Encoding (GEOHASH)');

    const geohashes = await client.geoHash(restaurantsKey, ['Pizza Palace', 'Burger Haven']);
    logger.command(`GEOHASH ${restaurantsKey} "Pizza Palace" "Burger Haven"`);

    logger.info('Geohashes (used internally for indexing):');
    geohashes.forEach((hash, index) => {
      const name = index === 0 ? 'Pizza Palace' : 'Burger Haven';
      logger.info(`  ${name}: ${hash}`);
    });
    logger.production('\nGeohash allows efficient spatial indexing and proximity queries\n');

    logger.production('\nProduction Considerations:');
    logger.production('- Complexity: O(N+log(M)) where N=radius results, M=total items');
    logger.production('- Geohash precision: 11 characters = ~1 meter accuracy');
    logger.production('- Update locations atomically with GEOADD (overwrites)');
    logger.production('- Use GEOSEARCHSTORE to cache results for multiple consumers');
    logger.production('- Redis Geo is backed by sorted sets (can use ZREM to remove)');
    logger.production('- Consider PostGIS for complex spatial queries');
    logger.production('- Expires not supported - use separate TTL pattern');
    logger.production('- Memory: ~100 bytes per location (efficient!)\n');

    logger.success('✓ Proximity search patterns demonstrated!');
  },
};
