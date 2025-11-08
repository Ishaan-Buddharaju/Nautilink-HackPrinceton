'use client';

import dynamic from 'next/dynamic';
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter for navigation
import * as topojson from 'topojson-client';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

// Interfaces (assuming these are shared, or only needed for visual globe)
interface VesselData {
  lat: number;
  lng: number;
  registered: boolean;
  timestamp: string;
  geartype: string;
  mmsi: string;
  imo: string;
  shipName: string;
  flag: string;
}

interface ClusterData {
  lat: number;
  lng: number;
  count: number;
  markers: VesselData[];
  registered: boolean;
  closest: number;
}

const LandingPage: React.FC = () => {
  const router = useRouter(); // Initialize useRouter
  const globeEl = useRef<any>(null);
  const [landData, setLandData] = useState<{ features: any[] }>({ features: [] });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Minimal data for landing page globe background
  const [clusteredData, setClusteredData] = useState<ClusterData[]>([]);
  const [vesselData, setVesselData] = useState<VesselData[]>([]); // To simulate data for the background globe
  const [decorativeMarkers, setDecorativeMarkers] = useState<
    Array<{ id: string; lat: number; lng: number; label: string }>
  >([]);
  const [routeArcs, setRouteArcs] = useState<
    Array<{ startLat: number; startLng: number; endLat: number; endLng: number; color: string }>
  >([]);

  const GREEN = "#2eb700";
  const RED = "#fc0303";

  const markerSvg = `<svg viewBox="-4 0 36 36">
    <path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path>
    <circle fill="black" cx="14" cy="14" r="7"></circle>
  </svg>`;

  const clusterSvg = (count: number) => `<svg viewBox="-4 0 36 36">
    <path fill="currentColor" d="M14,0 C21.732,0 28,5.641 28,12.6 C28,23.963 14,36 14,36 C14,36 0,24.064 0,12.6 C0,5.641 6.268,0 14,0 Z"></path>
    <circle fill="black" cx="14" cy="14" r="7"></circle>
    <text x="14" y="18" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${count}</text>
  </svg>`;

  const clusterBase = 1500;
  const cullingBase = 7000;

  // Simplified cluster function for landing page to just show some markers
  const clusterMarkers = useCallback((markers: VesselData[], cull = true) => {
    if (markers.length === 0) return;

    // For landing page, we just want some visible clusters/markers
    // No culling based on POV, just a simple representation
    const clusters: ClusterData[] = [];
    markers.slice(0, 50).forEach(marker => { // Display a subset for performance
        clusters.push({
            lat: marker.lat,
            lng: marker.lng,
            count: 1,
            markers: [marker],
            registered: marker.registered,
            closest: Infinity
        });
    });
    setClusteredData(clusters);
  }, []);

  const fetchData = useCallback(async () => {
    setIsDataLoaded(false);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/getPositions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: VesselData[] = await response.json();
      if (response.ok) {
        setVesselData(data); // Store for background globe
        clusterMarkers(data); // Cluster them
        setIsDataLoaded(true);
        setIsFirstLoad(false);
      }
    } catch (error) {
      console.log('Error fetching vessel data:', error);
      setIsDataLoaded(true);
      setIsFirstLoad(false);
    }
  }, [clusterMarkers]);

  useEffect(() => {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas/land-110m.json')
      .then((res) => res.json())
      .then((landTopo) => {
        const featureCollection = topojson.feature(landTopo, landTopo.objects.land);
        setLandData(featureCollection as unknown as { features: any[] });
      });

    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const seeds = [
      { lat: 12, lng: -150 },
      { lat: -5, lng: -135 },
      { lat: 28, lng: -120 },
      { lat: -22, lng: -108 },
      { lat: 15, lng: -80 },
      { lat: -10, lng: -60 },
      { lat: 18, lng: -30 },
      { lat: -25, lng: -18 },
      { lat: 30, lng: 10 },
      { lat: -12, lng: 40 },
      { lat: 20, lng: 65 },
      { lat: -30, lng: 75 },
      { lat: 8, lng: 95 },
      { lat: -18, lng: 110 },
      { lat: 14, lng: 135 },
      { lat: -20, lng: 150 },
      { lat: 22, lng: 170 },
      { lat: -5, lng: 160 },
      { lat: -32, lng: -150 }
    ];

    const labels = ['Fleet', 'Port', 'SOS', 'Relay', 'Waypoint', 'Beacon'];
    const generated: Array<{ id: string; lat: number; lng: number; label: string }> = Array.from(
      { length: 50 }
    ).map((_, idx) => {
      const seed = seeds[idx % seeds.length];
      const lat = seed.lat + (Math.random() - 0.5) * 8;
      const lng = seed.lng + (Math.random() - 0.5) * 8;
      return {
        id: `decor-${idx}`,
        lat,
        lng,
        label: labels[idx % labels.length]
      };
    });
    setDecorativeMarkers(generated);
  }, []);

  useEffect(() => {
    const colors = ['rgba(79, 189, 255, 0.55)', 'rgba(118, 157, 255, 0.55)', 'rgba(95, 214, 189, 0.6)'];
    const routes: Array<{ startLat: number; startLng: number; endLat: number; endLng: number; color: string }> = [
      // Trans-Pacific & Trans-Atlantic
      { startLat: 35.7, startLng: 139.7, endLat: 37.7, endLng: -122.4, color: colors[0] }, // Tokyo -> San Francisco
      { startLat: 23.1, startLng: 113.3, endLat: 33.7, endLng: -118.2, color: colors[1] }, // Guangzhou -> Los Angeles
      { startLat: 1.3, startLng: 103.8, endLat: 35.0, endLng: 129.0, color: colors[2] },   // Singapore -> Busan
      { startLat: 31.2, startLng: 121.5, endLat: -33.9, endLng: 18.4, color: colors[0] }, // Shanghai -> Cape Town
      { startLat: 25.8, startLng: -80.2, endLat: 51.5, endLng: -0.1, color: colors[1] },  // Miami -> London
      { startLat: 29.7, startLng: -95.3, endLat: 50.9, endLng: 1.4, color: colors[2] },   // Houston -> Dover
      { startLat: 40.7, startLng: -74.0, endLat: 48.9, endLng: 2.3, color: colors[0] },   // New York -> Le Havre
      { startLat: -23.5, startLng: -46.6, endLat: 30.0, endLng: -15.0, color: colors[1] },// Santos -> Canary Islands

      // Indian Ocean / Middle East
      { startLat: 24.5, startLng: 54.4, endLat: 19.1, endLng: 72.8, color: colors[2] },   // Abu Dhabi -> Mumbai
      { startLat: 25.3, startLng: 55.3, endLat: -32.0, endLng: 115.8, color: colors[0] }, // Jebel Ali -> Perth
      { startLat: 29.9, startLng: 32.5, endLat: 1.3, endLng: 103.8, color: colors[1] },   // Suez -> Singapore
      { startLat: 22.3, startLng: 114.2, endLat: -41.3, endLng: 174.8, color: colors[2] },// Hong Kong -> Wellington

      // South Atlantic / Pacific
      { startLat: -34.9, startLng: -56.2, endLat: -33.9, endLng: 18.4, color: colors[0] }, // Montevideo -> Cape Town
      { startLat: -12.0, startLng: -77.0, endLat: 34.7, endLng: 135.5, color: colors[1] }, // Callao -> Osaka
      { startLat: -33.9, startLng: 18.4, endLat: -36.8, endLng: 174.7, color: colors[2] }, // Cape Town -> Auckland
      { startLat: -23.6, startLng: -70.4, endLat: -12.0, endLng: -77.0, color: colors[0] },// Antofagasta -> Callao

      // Europe & North America coastal routes
      { startLat: 60.1, startLng: -149.4, endLat: 22.3, endLng: 114.2, color: colors[1] }, // Anchorage -> Hong Kong
      { startLat: 43.7, startLng: -79.4, endLat: 18.0, endLng: -63.1, color: colors[2] },  // Toronto -> Hamilton
      { startLat: 50.1, startLng: 8.6, endLat: 55.7, endLng: 12.6, color: colors[0] },    // Hamburg -> Copenhagen

      // Additional cross routes
      { startLat: -6.1, startLng: 106.8, endLat: 35.7, endLng: 139.7, color: colors[1] }, // Jakarta -> Tokyo
      { startLat: 4.9, startLng: -1.7, endLat: 39.9, endLng: 32.8, color: colors[2] },     // Tema -> Istanbul
      { startLat: 21.3, startLng: -157.8, endLat: 1.3, endLng: 103.8, color: colors[0] }, // Honolulu -> Singapore
      { startLat: 35.2, startLng: 129.1, endLat: 59.9, endLng: 30.3, color: colors[1] },  // Busan -> St. Petersburg
      { startLat: -34.0, startLng: 25.6, endLat: -12.8, endLng: 45.2, color: colors[2] }, // Port Elizabeth -> Madagascar
      { startLat: 44.6, startLng: -63.6, endLat: 10.4, endLng: -61.5, color: colors[0] }, // Halifax -> Trinidad
      { startLat: 40.8, startLng: 14.3, endLat: 12.6, endLng: 70.0, color: colors[1] },   // Naples -> Colombo
      { startLat: -14.3, startLng: -170.7, endLat: -36.8, endLng: 174.7, color: colors[2] } // Pago Pago -> Auckland
    ];
    setRouteArcs(routes);
  }, []);

  const handleEnterDashboard = () => {
    router.push('/dashboard'); // Navigate to the dashboard page
  };


  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {!isDataLoaded && isFirstLoad ? (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#171717',
          color: '#FFFFFF',
          fontSize: '18px',
          fontFamily: 'Arial, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid #4662ab', 
              borderTop: '3px solid #e0f2fd', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }}></div>
            Loading vessel data...
          </div>
        </div>
      ) : (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#171717',
          color: '#FFFFFF',
          fontFamily: 'Arial, sans-serif',
          overflow: 'hidden'
        }}>
          {/* Globe positioned off-screen to the right */}
          <div style={{
            position: 'absolute',
            right: '-55%',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '100%',
            height: '100%',
          }}>
            <Globe
              ref={globeEl}
              globeImageUrl={null}
              bumpImageUrl={null}
              backgroundImageUrl={null}
              showGlobe={false}
              showAtmosphere={false}
              backgroundColor={'rgba(23,23,23,0)'}
              polygonsData={landData.features}
              polygonCapColor={() => 'rgba(130, 130, 130, 0.5)'}
              polygonSideColor={() => 'rgba(0,0,0,0)'}
              polygonAltitude={0}
              polygonStrokeColor={() => 'rgba(255, 255, 255, 1)'}
              showGraticules={true}
              arcsData={routeArcs}
              arcColor={(d: any) => d.color}
              arcAltitude={0.22}
              arcStroke={2.6}
              arcDashLength={0.4}
              arcDashGap={0.15}
              arcDashAnimateTime={2600}
              htmlElementsData={[...vesselData.slice(0, 50), ...decorativeMarkers]}
              htmlElement={(d: any) => {
                const container = document.createElement('div');
                container.style.pointerEvents = 'none';
                container.style.position = 'absolute';
                container.style.transform = 'translate(-50%, -50%)';
                const size = d.id?.startsWith('decor-') ? 16 : 18;
                container.style.width = `${size}px`;
                container.style.height = `${size * 1.6}px`;

                const svgNS = 'http://www.w3.org/2000/svg';
                const svg = document.createElementNS(svgNS, 'svg');
                svg.setAttribute('viewBox', '0 0 24 36');
                svg.setAttribute('width', `${size}px`);
                svg.setAttribute('height', `${size * 1.6}px`);

                const path = document.createElementNS(svgNS, 'path');
                path.setAttribute('d', 'M12 0C7 0 3 4 3 9c0 7.5 9 17 9 17s9-9.5 9-17C21 4 17 0 12 0z');
                path.setAttribute('fill', '#ffffff');

                const circle = document.createElementNS(svgNS, 'circle');
                circle.setAttribute('cx', '12');
                circle.setAttribute('cy', '9');
                circle.setAttribute('r', '4');
                circle.setAttribute('fill', '#0f1624');

                svg.appendChild(path);
                svg.appendChild(circle);
                container.appendChild(svg);

                return container;
              }}
              htmlElementVisibilityModifier={(el: any, isVisible: Boolean) => {
                el.style.opacity = isVisible ? '1' : '0';
              }}
              onGlobeReady={() => { 
                if (globeEl.current) {
                  globeEl.current.pointOfView({ lat: 25, lng: 0, altitude: 0.6 });
                  globeEl.current.controls().autoRotate = true;
                  globeEl.current.controls().autoRotateSpeed = 1;
                }
              }}
            />
          </div>

          {/* Landing page content */}
          <div style={{
            position: 'relative',
            zIndex: 30,
            textAlign: 'left',
            maxWidth: '520px',
            padding: '0 60px',
            marginLeft: '-520px',
            marginTop: '-180px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div>
              <div style={{ marginBottom: '20px' }}>
                <img
                  src="/logo-landing.png"
                  alt="Nautilink landing branding"
                  style={{
                    width: '360px',
                    maxWidth: '100%',
                    height: 'auto',
                    display: 'block',
                    filter: 'drop-shadow(0 10px 25px rgba(8, 15, 28, 0.45))'
                  }}
                />
              </div>
              <p
                style={{
                  color: '#c4d6f4',
                  fontSize: '1.05rem',
                  fontWeight: 400,
                  letterSpacing: '0.08em',
                  margin: '0 0 20px 4px',
                  textTransform: 'uppercase'
                }}
              >
                protecting fishing supply chains with blockchain technology
              </p>
              {/* Enter Button */}
              <button
                onClick={handleEnterDashboard} // Changed to navigate
                style={{
                  padding: '15px 40px',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  backgroundColor: '#4662ab',
                  color: '#e0f2fd',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(70, 98, 171, 0.35)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#c6daec';
                  e.currentTarget.style.color = '#171717';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 25px rgba(70, 98, 171, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4662ab';
                  e.currentTarget.style.color = '#e0f2fd';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(70, 98, 171, 0.35)';
                }}
              >
                Enter Dashboard
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;