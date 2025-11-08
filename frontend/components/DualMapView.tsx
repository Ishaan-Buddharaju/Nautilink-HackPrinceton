'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import GeoAdjacentMap, { MapLocation } from './GeoAdjacentMap';

// Dynamically import Globe to avoid SSR issues
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

export interface DualMapViewProps {
  locations: MapLocation[];
  landData?: { features: any[] };
  onLocationSelect?: (location: MapLocation | null) => void;
  initialView?: { lat: number; lng: number; altitude?: number };
  showSplitView?: boolean;
  showMPAs?: boolean;
}

/**
 * DualMapView
 * ------------------------------------------------------
 * Combines 3D Globe (react-globe.gl) with 2D Map (MapLibre GL)
 * Both views share the same location data and selection state
 * 
 * Features:
 * - Side-by-side or stacked layout
 * - Synchronized location selection
 * - Accurate coordinate display on both views
 * - Toggle between views on mobile
 */
const DualMapView: React.FC<DualMapViewProps> = ({
  locations = [],
  landData = { features: [] },
  onLocationSelect,
  initialView = { lat: 20, lng: 0, altitude: 2.5 },
  showSplitView = true,
  showMPAs = false,
}) => {
  const globeEl = React.useRef<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [activeView, setActiveView] = useState<'globe' | 'map' | 'both'>('both');
  const [mpaVisible, setMpaVisible] = useState(showMPAs);

  const handleLocationClick = (location: MapLocation) => {
    setSelectedLocation(location);
    if (onLocationSelect) {
      onLocationSelect(location);
    }

    // Fly globe to location
    if (globeEl.current && (activeView === 'globe' || activeView === 'both')) {
      globeEl.current.pointOfView({
        lat: location.lat,
        lng: location.lng,
        altitude: 1.5,
      }, 1000);
    }
  };

  useEffect(() => {
    if (globeEl.current) {
      globeEl.current.pointOfView({
        lat: initialView.lat,
        lng: initialView.lng,
        altitude: initialView.altitude || 2.5,
      });
    }
  }, []);

  // Create marker SVG for globe
  const createMarkerElement = (d: any) => {
    const location = d as MapLocation;
    const el = document.createElement('div');
    el.style.cursor = 'pointer';
    el.style.pointerEvents = 'auto';

    const color = location.registered !== undefined 
      ? (location.registered ? '#2eb700' : '#fc0303')
      : (location.color || '#3b82f6');

    el.innerHTML = `
      <svg viewBox="0 0 24 36" width="22" height="32">
        <path d="M12 0C7 0 3 4 3 9c0 7.5 9 17 9 17s9-9.5 9-17C21 4 17 0 12 0z" 
              fill="${color}" 
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

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handleLocationClick(location);
    });

    return el;
  };

  const showGlobe = activeView === 'globe' || activeView === 'both';
  const showMap = activeView === 'map' || activeView === 'both';

  return (
    <div className="dual-map-view" style={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex',
      flexDirection: showSplitView ? 'row' : 'column',
      position: 'relative',
    }}>
      {/* View Toggle Buttons */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        background: 'rgba(23, 23, 23, 0.9)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid rgba(198, 218, 236, 0.2)',
      }}>
        <button
          onClick={() => setActiveView('globe')}
          style={{
            padding: '8px 16px',
            background: activeView === 'globe' ? '#4662ab' : 'transparent',
            color: activeView === 'globe' ? '#e0f2fd' : '#c0d9ef',
            border: '1px solid rgba(198, 218, 236, 0.3)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          🌍 Globe
        </button>
        <button
          onClick={() => setActiveView('map')}
          style={{
            padding: '8px 16px',
            background: activeView === 'map' ? '#4662ab' : 'transparent',
            color: activeView === 'map' ? '#e0f2fd' : '#c0d9ef',
            border: '1px solid rgba(198, 218, 236, 0.3)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          🗺️ Map
        </button>
        <button
          onClick={() => setActiveView('both')}
          style={{
            padding: '8px 16px',
            background: activeView === 'both' ? '#4662ab' : 'transparent',
            color: activeView === 'both' ? '#e0f2fd' : '#c0d9ef',
            border: '1px solid rgba(198, 218, 236, 0.3)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '500',
          }}
        >
          ⚡ Both
        </button>
      </div>

      {/* MPA Toggle Button */}
      <div style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        zIndex: 1000,
        background: 'rgba(23, 23, 23, 0.9)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid rgba(198, 218, 236, 0.2)',
      }}>
        <button
          onClick={() => setMpaVisible(!mpaVisible)}
          style={{
            padding: '8px 16px',
            background: mpaVisible ? '#00d4ff' : 'transparent',
            color: mpaVisible ? '#171717' : '#c0d9ef',
            border: '1px solid rgba(0, 212, 255, 0.5)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          🛡️ MPAs {mpaVisible ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Selected Location Info */}
      {selectedLocation && (
        <div style={{
          position: 'absolute',
          top: '70px',
          right: '16px',
          zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.85)',
          padding: '12px 16px',
          borderRadius: '8px',
          backdropFilter: 'blur(10px)',
          color: '#e0f2fd',
          minWidth: '200px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>
                {selectedLocation.name || 'Selected Location'}
              </div>
              <div style={{ fontSize: '11px', color: '#c0d9ef', marginBottom: '2px' }}>
                Lat: {selectedLocation.lat.toFixed(4)}°
              </div>
              <div style={{ fontSize: '11px', color: '#c0d9ef' }}>
                Lng: {selectedLocation.lng.toFixed(4)}°
              </div>
              {selectedLocation.count && selectedLocation.count > 1 && (
                <div style={{ fontSize: '11px', color: '#c0d9ef', marginTop: '4px' }}>
                  Cluster: {selectedLocation.count} vessels
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedLocation(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#c0d9ef',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 3D Globe View */}
      {showGlobe && (
        <div style={{ 
          flex: showMap ? 1 : 'auto',
          width: showMap ? '50%' : '100%',
          height: '100%',
          position: 'relative',
        }}>
          <Globe
            ref={globeEl}
            globeImageUrl={null}
            bumpImageUrl={null}
            backgroundImageUrl={null}
            showGlobe={false}
            showAtmosphere={true}
            atmosphereColor="#4662ab"
            atmosphereAltitude={0.15}
            backgroundColor="rgba(23,23,23,0)"
            
            polygonsData={landData.features}
            polygonCapColor={() => 'rgba(130, 130, 130, 0.5)'}
            polygonSideColor={() => 'rgba(0,0,0,0)'}
            polygonAltitude={0}
            polygonStrokeColor={() => 'rgba(255, 255, 255, 1)'}
            
            showGraticules={true}
            
            htmlElementsData={locations}
            htmlElement={createMarkerElement}
          />
        </div>
      )}

      {/* 2D Map View */}
      {showMap && (
        <div style={{ 
          flex: showGlobe ? 1 : 'auto',
          width: showGlobe ? '50%' : '100%',
          height: '100%',
          position: 'relative',
          borderLeft: showGlobe ? '2px solid rgba(70,98,171,0.3)' : 'none',
        }}>
          <GeoAdjacentMap
            locations={locations}
            selectedLocation={selectedLocation}
            onLocationClick={handleLocationClick}
            initialView={{ 
              lat: initialView.lat, 
              lng: initialView.lng, 
              zoom: 2 
            }}
            width="100%"
            height="100%"
            showControls={true}
            showMPAs={mpaVisible}
          />
        </div>
      )}
    </div>
  );
};

export default DualMapView;
