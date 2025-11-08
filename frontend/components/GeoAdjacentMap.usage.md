# GeoAdjacentMap Usage Guide

## Overview
The `GeoAdjacentMap` component provides an accurate 2D map view using MapLibre GL JS (no API keys required). The `DualMapView` component combines this with your existing 3D globe for a synchronized dual-view experience.

## Installation
MapLibre GL is already installed in your package.json:
```json
"maplibre-gl": "^5.11.0"
```

## Quick Start

### Option 1: Standalone 2D Map

```tsx
import GeoAdjacentMap from '@/components/GeoAdjacentMap';

function MyComponent() {
  const locations = [
    { id: 1, lat: 40.7128, lng: -74.0060, name: 'New York', registered: true },
    { id: 2, lat: 34.0522, lng: -118.2437, name: 'Los Angeles', registered: false },
  ];

  return (
    <GeoAdjacentMap
      locations={locations}
      initialView={{ lat: 37.0, lng: -95.0, zoom: 4 }}
      onLocationClick={(loc) => console.log('Clicked:', loc)}
      width="100%"
      height="600px"
    />
  );
}
```

### Option 2: Dual View (3D Globe + 2D Map)

```tsx
import DualMapView from '@/components/DualMapView';

function DashboardPage() {
  const vesselLocations = [
    { 
      id: 'vessel1', 
      lat: 20.5, 
      lng: -30.2, 
      name: 'Fishing Vessel Alpha',
      registered: false,
      count: 1 
    },
    { 
      id: 'cluster1', 
      lat: 25.0, 
      lng: -35.0, 
      name: 'Fleet Cluster',
      registered: true,
      count: 15 
    },
  ];

  return (
    <DualMapView
      locations={vesselLocations}
      landData={landData} // Your existing topojson land data
      onLocationSelect={(location) => {
        console.log('Selected:', location);
        // Open agent panel, etc.
      }}
      initialView={{ lat: 20, lng: -30, altitude: 2.5 }}
      showSplitView={true}
    />
  );
}
```

## Integration with Existing Dashboard

To add the 2D map to your current dashboard (dashboard/page.tsx):

### Step 1: Import the component

```tsx
import GeoAdjacentMap from '@/components/GeoAdjacentMap';
```

### Step 2: Add to your layout

```tsx
// Inside your dashboard return statement, add a container for the map
<div style={{ 
  position: 'absolute', 
  bottom: '20px', 
  right: '20px', 
  width: '400px', 
  height: '300px',
  zIndex: 100,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
  borderRadius: '8px',
  overflow: 'hidden',
}}>
  <GeoAdjacentMap
    locations={clusteredData} // Use your existing clusteredData
    selectedLocation={hoveredVessel}
    onLocationClick={(loc) => {
      // Handle click - maybe open agent panel
      const vessel = loc.markers ? loc.markers[0] : loc;
      setHoveredVessel(vessel);
    }}
    initialView={{ lat: 20, lng: 0, zoom: 2 }}
    width="100%"
    height="100%"
  />
</div>
```

### Step 3: Full Split View (Alternative)

Replace your entire Globe container with DualMapView:

```tsx
<DualMapView
  locations={clusteredData}
  landData={landData}
  onLocationSelect={(location) => {
    if (location?.markers?.[0]) {
      setHoveredVessel(location.markers[0]);
      setAgentPoint({
        lat: location.lat,
        lng: location.lng,
        timestamp: location.markers[0].timestamp,
        mmsi: location.markers[0].mmsi,
        imo: location.markers[0].imo,
        flag: location.markers[0].flag,
        shipName: location.markers[0].shipName,
        geartype: location.markers[0].geartype,
      });
      setIsAgentPanelOpen(true);
    }
  }}
  initialView={{ lat: 20, lng: 0, altitude: 2.5 }}
  showSplitView={true}
/>
```

## Props Reference

### GeoAdjacentMap Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `locations` | `MapLocation[]` | `[]` | Array of locations to display |
| `selectedLocation` | `MapLocation \| null` | `null` | Currently selected location (highlights it) |
| `onLocationClick` | `(loc: MapLocation) => void` | - | Callback when location is clicked |
| `initialView` | `{ lat, lng, zoom? }` | `{ lat: 20, lng: 0, zoom: 2 }` | Initial map view |
| `mapStyle` | `string` | OSM tiles | MapLibre style URL |
| `width` | `string` | `'100%'` | Container width |
| `height` | `string` | `'100%'` | Container height |
| `showControls` | `boolean` | `true` | Show zoom/navigation controls |

### MapLocation Interface

```typescript
interface MapLocation {
  id?: string | number;
  name?: string;
  lat: number;           // Required
  lng: number;           // Required
  color?: string;
  registered?: boolean;  // Green if true, Red if false
  count?: number;        // For clusters
  markers?: any[];       // For cluster data
  [key: string]: any;    // Additional properties
}
```

## Map Styles

You can use custom MapLibre styles:

```tsx
<GeoAdjacentMap
  mapStyle="https://api.maptiler.com/maps/streets/style.json?key=YOUR_KEY"
  // Or use dark mode
  mapStyle="https://demotiles.maplibre.org/style.json"
/>
```

Free options (no API key):
- `https://demotiles.maplibre.org/style.json` (default)
- OpenStreetMap tiles via custom style

## Features

✅ **Accurate Coordinates**: Uses the same lat/lng as your 3D globe
✅ **No API Keys**: Works out of the box with OpenStreetMap tiles
✅ **Interactive**: Click markers, zoom, pan
✅ **Synced Selection**: Highlights selected locations
✅ **Cluster Support**: Shows count badges on cluster markers
✅ **Color Coding**: Green (registered) / Red (unregistered) / Custom colors
✅ **Responsive**: Adapts to container size
✅ **Performance**: Efficient marker updates

## Advanced Usage

### Custom Marker Styling

The map automatically creates SVG pin markers. Colors are determined by:
1. `registered` property (green/red)
2. `color` property (custom hex)
3. Default blue (#3b82f6)

### Syncing with Globe

Both views can be synchronized by:
1. Sharing the same `locations` array
2. Using the same `selectedLocation` state
3. Calling `onLocationClick` from both views

### Mobile Optimization

The `DualMapView` component includes view toggle buttons that allow users to switch between:
- 3D Globe only
- 2D Map only
- Split view (both)

Perfect for responsive layouts!

## Troubleshooting

### Map not displaying
- Check that MapLibre CSS is imported in your global styles
- Ensure container has explicit width/height

### Markers not showing
- Verify locations have valid lat/lng values
- Check console for coordinate errors

### Performance issues
- Limit locations array to visible items
- Use clustering for large datasets
- Consider viewport-based filtering

## Examples

See `DualMapView.tsx` for a complete implementation example.
