# Geospatial Search: Location Queries

## What

Demonstrates Elasticsearch's geospatial capabilities using geo_point fields for location-based queries: proximity search, radius filtering, distance sorting, and bounding box queries.

## Why

Geospatial search is critical for location-based services like Yelp (find nearby restaurants), Uber (match riders to drivers), real estate (find properties), and retail (store locators). Elasticsearch's native geo support makes these queries fast and straightforward.

## How

The example demonstrates restaurant discovery:
- **geo_point Field**: Store latitude/longitude coordinates
- **geo_distance Query**: Find locations within radius of a point
- **Distance Sorting**: Sort results by proximity
- **Combined Filters**: Proximity + cuisine/price/rating filters
- **Bounding Box**: Find locations within rectangular area

## Key Commands

- `geo_distance` - Find documents within radius of a point
- `_geo_distance` sort - Sort by distance from location
- `geo_bounding_box` - Find documents within rectangular bounds
- `bool` query - Combine geospatial with other filters

## Try It

Run the example and observe:
1. geo_point field stores {lat, lon} coordinates
2. geo_distance finds restaurants within 1km radius
3. Results sorted by distance (closest first)
4. Combining proximity with filters (price, rating)
5. Bounding box for map viewport searches
6. Distance calculated and returned in sort results

Check Kibana's Maps feature to visualize restaurant locations.

## Production Considerations

**Geospatial Field Types:**
- geo_point: Single lat/lon coordinate (restaurants, users, addresses)
- geo_shape: Complex geometries (delivery zones, neighborhoods, polygons)
- Store as object {lat, lon} or array [lon, lat] or string "lat,lon"
- BKD trees provide O(log n) spatial indexing

**Query Performance:**
- geo_distance queries are efficient with proper indexing
- Smaller radius = faster queries (less candidate documents)
- Distance calculation is approximate for performance (Haversine distance)
- Use geo_bounding_box for rectangular viewport searches

**Accuracy:**
- Default distance calculation is within 0.5% accuracy
- Precision setting controls geohash grid resolution
- For very high precision, use geo_shape with exact geometries
- Earth is not a perfect sphere - calculations are approximations

**Combining with Filters:**
- Use bool query to combine geo with filters
- Put filters in filter context (not scored) for better performance
- Sort by distance for "nearest first" UX
- Limit results with size parameter for pagination

**Scaling:**
- Geospatial queries don't scale differently than text queries
- Shard by region for very large datasets (e.g., global coverage)
- Consider dedicated indices per city/region
- Cache common queries (e.g., "restaurants near Times Square")

**Alternatives:**
- PostGIS (Postgres extension) for relational data with geo
- Redis geospatial for simple use cases (less feature-rich)
- Google Maps API for consumer applications (simpler, hosted)
- For very complex polygons, specialized GIS databases

**Interview Examples:**
- "Design Yelp" - Find nearby restaurants with filters
- "Design Uber" - Match riders to nearby drivers
- "Find nearby friends" - Social network proximity
- "Store locator" - Retail locations within radius
- "Real estate search" - Properties in area with filters

## Further Reading

- [Geo Queries](https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-queries.html)
- [Geo Point Field Type](https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-point.html)
- [Geo Shape Field Type](https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html)
