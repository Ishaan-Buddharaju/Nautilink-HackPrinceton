'use client';

import React, { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/bbox';
import { centerOfMass } from '@turf/center-of-mass';

export interface MapLocation {
  id?: string | number;
  name?: string;
  lat: number;
  lng: number;
  color?: string;
  registered?: boolean;
  count?: number;
  [key: string]: any;
}

export interface GeoAdjacentMapProps {
  locations: MapLocation[];
  selectedLocation?: MapLocation | null;
  onLocationClick?: (location: MapLocation) => void;
  initialView?: { lat: number; lng: number; zoom?: number };
  mapStyle?: string;
  width?: string;
  height?: string;
  showControls?: boolean;
  showMPAs?: boolean; // Toggle MPA polygons
}

/**
 * GeoAdjacentMap
 * ------------------------------------------------------
 * An accurate 2D map using MapLibre GL JS (no API keys needed)
 * Designed to work alongside the 3D globe for precise location display
 *
 * ✅ Accurate: Uses same lat/lng coordinates as globe
 * ✅ Interactive: Click markers to select locations
 * ✅ Free: No API keys required (uses OSM tiles)
 * ✅ Synced: Highlights selected location from parent
 */
const GeoAdjacentMap: React.FC<GeoAdjacentMapProps> = ({
  locations = [],
  selectedLocation = null,
  onLocationClick,
  initialView = { lat: 20, lng: 0, zoom: 2 },
  mapStyle = 'https://demotiles.maplibre.org/style.json',
  width = '100%',
  height = '100%',
  showControls = true,
  showMPAs = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string | number, maplibregl.Marker>>(new Map());
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [initialView.lng, initialView.lat],
      zoom: initialView.zoom || 2,
    });

    if (showControls) {
      map.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
    }

    map.on('load', () => {
      setIsMapLoaded(true);
      
      // Load MPA polygons if enabled
      if (showMPAs) {
        loadMPAPolygons(map);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, [showMPAs]);

  // Load MPA polygon data and add layers
  const loadMPAPolygons = async (map: maplibregl.Map) => {
    try {
      // Add MPA source
      map.addSource('mpas', {
        type: 'geojson',
        data: '/data/top50_mpas.geojson',
      });

      // Add fill layer for MPA polygons
      map.addLayer({
        id: 'mpa-fill',
        type: 'fill',
        source: 'mpas',
        paint: {
          'fill-color': '#00d4ff', // Bright cyan/blue
          'fill-opacity': 0.35,
        },
      });

      // Add outline layer for MPA polygons
      map.addLayer({
        id: 'mpa-outline',
        type: 'line',
        source: 'mpas',
        paint: {
          'line-color': '#00d4ff', // Bright cyan/blue
          'line-width': 2,
        },
      });

      // Fit map to show all MPAs
      map.once('idle', () => {
        const features = map.querySourceFeatures('mpas');
        if (features.length > 0) {
          const fc = {
            type: 'FeatureCollection',
            features: features.map((f: any) => ({
              type: 'Feature',
              geometry: f.geometry,
              properties: {},
            })),
          };
          const bbox = turf.default(fc as any);
          map.fitBounds(
            [
              [bbox[0], bbox[1]],
              [bbox[2], bbox[3]],
            ],
            { padding: 40, duration: 800 }
          );
        }
      });

      // Click interaction for MPA polygons
      map.on('click', 'mpa-fill', (e) => {
        const f = e.features?.[0];
        if (!f) return;

        const props = f.properties || {};
        const center = centerOfMass(f as any).geometry.coordinates;

        map.flyTo({
          center: center as [number, number],
          zoom: Math.max(map.getZoom(), 5),
          duration: 800,
        });

        if (onLocationClick) {
          onLocationClick({
            id: props.wdpa_id || props.id || props.name,
            name: props.name,
            lat: center[1],
            lng: center[0],
            registered: true,
            ...props,
          });
        }
      });

      // Cursor pointer on hover
      map.on('mouseenter', 'mpa-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });

      map.on('mouseleave', 'mpa-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    } catch (error) {
      console.error('Error loading MPA polygons:', error);
    }
  };

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded) return;

    const map = mapRef.current;
    const existingMarkers = markersRef.current;

    // Remove markers that no longer exist in locations
    const currentIds = new Set(locations.map((loc) => loc.id || `${loc.lat}-${loc.lng}`));
    existingMarkers.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        existingMarkers.delete(id);
      }
    });

    // Add or update markers
    locations.forEach((location) => {
      const id = location.id || `${location.lat}-${location.lng}`;
      let marker = existingMarkers.get(id);

      // Determine color based on registration status or provided color
      let markerColor = location.color || '#3b82f6'; // Default blue
      if (location.registered !== undefined) {
        markerColor = location.registered ? '#2eb700' : '#fc0303'; // Green or Red
      }

      if (!marker) {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.cursor = 'pointer';
        el.style.width = '24px';
        el.style.height = '34px';

        // Create SVG pin
        el.innerHTML = `
          <svg viewBox="0 0 24 36" width="24" height="34">
            <path d="M12 0C7 0 3 4 3 9c0 7.5 9 17 9 17s9-9.5 9-17C21 4 17 0 12 0z" 
                  fill="${markerColor}" 
                  stroke="white" 
                  stroke-width="1"/>
            <circle cx="12" cy="9" r="4.5" fill="rgba(0,0,0,0.6)"/>
            ${location.count && location.count > 1 ? `
              <text x="12" y="11" text-anchor="middle" fill="white" font-size="8" font-weight="bold">
                ${location.count}
              </text>
            ` : ''}
          </svg>
        `;

        // Add popup on hover
        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false,
        }).setHTML(`
          <div style="padding: 4px 8px; font-size: 12px;">
            <strong>${location.name || 'Vessel'}</strong>
            ${location.count && location.count > 1 ? `<br/>Count: ${location.count}` : ''}
          </div>
        `);

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([location.lng, location.lat])
          .setPopup(popup)
          .addTo(map);

        // Add click handler
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onLocationClick) {
            onLocationClick(location);
          }
        });

        // Hover effects
        el.addEventListener('mouseenter', () => {
          marker?.getPopup().addTo(map);
        });
        el.addEventListener('mouseleave', () => {
          marker?.getPopup().remove();
        });

        existingMarkers.set(id, marker);
      } else {
        // Update existing marker position
        marker.setLngLat([location.lng, location.lat]);
        
        // Update color if changed
        const el = marker.getElement();
        const path = el.querySelector('path');
        if (path) {
          path.setAttribute('fill', markerColor);
        }
      }
    });
  }, [locations, isMapLoaded, onLocationClick]);

  // Highlight selected location
  useEffect(() => {
    if (!mapRef.current || !isMapLoaded || !selectedLocation) return;

    const map = mapRef.current;
    const id = selectedLocation.id || `${selectedLocation.lat}-${selectedLocation.lng}`;
    const marker = markersRef.current.get(id);

    if (marker) {
      // Fly to selected location
      map.flyTo({
        center: [selectedLocation.lng, selectedLocation.lat],
        zoom: Math.max(map.getZoom(), 8),
        duration: 1000,
      });

      // Highlight marker
      const el = marker.getElement();
      el.style.transform = 'scale(1.3)';
      el.style.transition = 'transform 0.3s ease';
      el.style.zIndex = '1000';

      // Reset after animation
      setTimeout(() => {
        el.style.transform = 'scale(1)';
      }, 1500);
    }
  }, [selectedLocation, isMapLoaded]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width,
        height,
        position: 'relative',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    />
  );
};

export default GeoAdjacentMap;
