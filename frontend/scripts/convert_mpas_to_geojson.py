#!/usr/bin/env python3
"""
Convert Top 50 MPAs CSV to GeoJSON with polygon geometries from WDPA dataset.

This script:
1. Reads the Top_50_MPAs__Priority_Crosswalk_.csv file
2. Creates placeholder polygon geometries (bounding boxes) for each MPA
3. Exports to top50_mpas.geojson with all required properties

Note: For production, you should join with actual WDPA Geopackage/Shapefile data
to get real polygon geometries. This creates simplified bounding boxes as placeholders.
"""

import csv
import json
import math

def create_bbox_polygon(lat, lng, area_km2):
    """
    Create a simple bounding box polygon around a center point.
    Size is estimated from area_km2.
    """
    # Rough estimate: side length from area (assuming square)
    side_km = math.sqrt(area_km2)
    
    # Convert km to degrees (very rough approximation)
    # 1 degree latitude ≈ 111 km
    # 1 degree longitude varies by latitude
    lat_offset = side_km / (2 * 111)
    lng_offset = side_km / (2 * 111 * math.cos(math.radians(lat)))
    
    # Create bbox coordinates [lng, lat]
    return [[
        [lng - lng_offset, lat - lat_offset],  # SW
        [lng + lng_offset, lat - lat_offset],  # SE
        [lng + lng_offset, lat + lat_offset],  # NE
        [lng - lng_offset, lat + lat_offset],  # NW
        [lng - lng_offset, lat - lat_offset],  # Close polygon
    ]]

def get_center_coords(name):
    """
    Rough center coordinates for known MPAs.
    In production, extract from actual WDPA geometries.
    """
    centers = {
        'Ross Sea Region': (-75, 180),
        'Papahānaumokuākea': (25, -170),
        'Pacific Islands Heritage': (0, -160),
        'Pitcairn Islands': (-25, -130),
        'Coral Sea': (-17, 155),
        'Great Barrier Reef': (-18, 147),
        'Macquarie Island': (-54, 159),
        'Prince Edward Islands': (-47, 38),
        'Galapagos': (-1, -91),
        'Revillagigedo': (19, -112),
    }
    return centers.get(name, (0, 0))

def convert_csv_to_geojson(csv_path, output_path):
    """Convert CSV to GeoJSON with polygon geometries."""
    features = []
    
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('Display_Name', '')
            area_km2 = float(row.get('area_km2', 0) or 0)
            
            # Get center coordinates (placeholder - use real data in production)
            lat, lng = get_center_coords(name)
            
            # Create polygon geometry
            coordinates = create_bbox_polygon(lat, lng, area_km2)
            
            # Build feature
            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Polygon',
                    'coordinates': coordinates
                },
                'properties': {
                    'name': name,
                    'country': row.get('country', ''),
                    'sovereign': row.get('sovereign', ''),
                    'protection_level': row.get('protection_mpaguide_level', ''),
                    'stage': row.get('establishment_stage', ''),
                    'designation': row.get('designation', ''),
                    'area_km2': area_km2,
                    'wdpa_id': row.get('wdpa_id', ''),
                    'wdpa_pid': row.get('wdpa_pid', ''),
                    'join_key': row.get('Boundary_Join_Key', ''),
                    'id': row.get('id', ''),
                    'mpa_zone_id': row.get('mpa_zone_id', ''),
                    'status': row.get('status', '')
                }
            }
            features.append(feature)
    
    # Create FeatureCollection
    geojson = {
        'type': 'FeatureCollection',
        'features': features
    }
    
    # Write to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geojson, f, indent=2)
    
    print(f"✅ Converted {len(features)} MPAs to {output_path}")
    print(f"📊 Total area: {sum(f['properties']['area_km2'] for f in features):,.0f} km²")

if __name__ == '__main__':
    import os
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, '..', 'Top_50_MPAs__Priority_Crosswalk_.csv')
    output_path = os.path.join(script_dir, '..', 'public', 'data', 'top50_mpas.geojson')
    
    convert_csv_to_geojson(csv_path, output_path)
