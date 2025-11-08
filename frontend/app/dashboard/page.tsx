'use client';

import dynamic from 'next/dynamic';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'; // Added useCallback, useMemo
import * as topojson from 'topojson-client';
import AgentPanel, { type AgentPoint } from '../../components/AgentPanel';
import { useAuth } from '../../hooks/useAuth';
import ReactCountryFlag from 'react-country-flag';

const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

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

interface HotspotData {
  lat: number;
  lng: number;
  size: number;
}

const HomePage: React.FC = () => {
  const GREEN = "#2eb700";
  const RED = "#fc0303";
  const DARK_RED = "#bf0202";

  const globeEl = useRef<any>(null);
  const [landData, setLandData] = useState<{ features: any[] }>({ features: [] });
  const [vesselData, setVesselData] = useState<VesselData[]>([]);

  const [clusteredData, setClusteredData] = useState<ClusterData[]>([]);
  const [hoveredVessel, setHoveredVessel] = useState<VesselData | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

  const [hotspotData, setHotspotData] = useState<HotspotData[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [isReportPanelVisible, setIsReportPanelVisible] = useState(false);
  const [isHistoryPanelVisible, setIsHistoryPanelVisible] = useState(false);
  const [agentMessages, setAgentMessages] = useState<
    { id: string; role: 'system' | 'user'; content: string; timestamp: Date }[]
  >([
    {
      id: 'sys-seed',
      role: 'system',
      content: 'Agent online. Ask a question to begin.',
      timestamp: new Date()
    }
  ]);
  const [agentInput, setAgentInput] = useState('');
  const historyEntries = useMemo(
    () =>
      [
        { id: 'txn-3', timestamp: '2025-11-08T06:42:00Z' },
        { id: 'txn-2', timestamp: '2025-11-08T06:15:00Z' },
        { id: 'txn-1', timestamp: '2025-11-08T05:52:30Z' }
      ].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    []
  );
  const handleAgentSubmit = useCallback(() => {
    const trimmed = agentInput.trim();
    if (!trimmed) return;

    const now = new Date();
    const userMessage = {
      id: `user-${now.getTime()}`,
      role: 'user' as const,
      content: trimmed,
      timestamp: now
    };

    setAgentMessages((prev) => [...prev, userMessage]);
    setAgentInput('');

    window.setTimeout(() => {
      const response = {
        id: `agent-${Date.now()}`,
        role: 'system' as const,
        content: 'Acknowledged. Compiling response...',
        timestamp: new Date()
      };
      setAgentMessages((prev) => [...prev, response]);
    }, 600);
  }, [agentInput]);


  // Agent panel state
  const [agentPoint, setAgentPoint] = useState<AgentPoint | null>(null);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);

  // Auth state
  const { user, hasAnyRole } = useAuth();

  const [timeL, setTimeL] = useState<number>(0);
  const [timeR, setTimeR] = useState<number>(1e15);

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

  const clusterMarkers = useCallback((markers: VesselData[], cull=true) => {
    if (markers.length === 0) return;

    const pov = globeEl.current ? globeEl.current.pointOfView() : { lat: 0, lng: 0, altitude: 2.5 };
    const clusterThreshold = Math.min(10000, clusterBase * pov.altitude);
    const cullingThreshold = Math.max(1, Math.min(70000, cullingBase * pov.altitude));

    const clusters: ClusterData[] = [];
    const processed = new Set<number>();

    for (let index = 0; index < markers.length; index++) {
      if (processed.has(index)) continue;

      const marker = markers[index];

      if (!marker.registered && !hasAnyRole(['confidential', 'secret', 'top-secret'])) continue;

      const v = new Date(marker.timestamp).getTime();
      if(timeL > v || timeR < v) continue;

      if(cull){
        const R = 6371;
        const dLat = (pov.lat - marker.lat) * Math.PI / 180;
        const dLng = (pov.lng - marker.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(marker.lat * Math.PI / 180) * Math.cos(pov.lat * Math.PI / 180) *
                  Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        if (distance > cullingThreshold) continue;
      }

      const cluster: ClusterData = {
        lat: marker.lat,
        lng: marker.lng,
        count: 1,
        markers: [marker],
        registered: marker.registered,
        closest: Infinity
      };

      for (let otherIndex = 0; otherIndex < markers.length; otherIndex++) {
        if (otherIndex === index || processed.has(otherIndex)) continue;

        const otherMarker = markers[otherIndex];

        if (cluster.registered !== otherMarker.registered) continue;

        const R_other = 6371;
        const dLat_other = (otherMarker.lat - marker.lat) * Math.PI / 180;
        const dLng_other = (otherMarker.lng - marker.lng) * Math.PI / 180;
        const a_other = Math.sin(dLat_other / 2) * Math.sin(dLat_other / 2) +
                        Math.cos(marker.lat * Math.PI / 180) * Math.cos(otherMarker.lat * Math.PI / 180) *
                        Math.sin(dLng_other / 2) * Math.sin(dLng_other / 2);
        const c_other = 2 * Math.atan2(Math.sqrt(a_other), Math.sqrt(1 - a_other));
        const distance_other = R_other * c_other;

        if (distance_other < clusterThreshold) {
          cluster.count++;
          cluster.markers.push(otherMarker);
          processed.add(otherIndex);
          cluster.registered = cluster.registered && otherMarker.registered;
          cluster.closest = Math.min(cluster.closest, distance_other);
        }
      }

      if (cluster.markers.length > 1) {
        let x = 0, y = 0, z = 0;
        for (const m of cluster.markers) {
          const latRad = m.lat * Math.PI / 180;
          const lngRad = m.lng * Math.PI / 180;
          x += Math.cos(latRad) * Math.cos(lngRad);
          y += Math.cos(latRad) * Math.sin(lngRad);
          z += Math.sin(latRad);
        }
        const total = cluster.markers.length;
        x /= total;
        y /= total;
        z /= total;

        const norm = Math.sqrt(x * x + y * y + z * z);
        x /= norm;
        y /= norm;
        z /= norm;

        const lat = Math.asin(z) * 180 / Math.PI;
        const lng = Math.atan2(y, x) * 180 / Math.PI;

        var mndis = Infinity;

        for (const m of cluster.markers) {
          const R_centroid = 6371;
          const dLat_centroid = (lat - m.lat) * Math.PI / 180;
          const dLng_centroid = (lng - m.lng) * Math.PI / 180;
          const a_centroid = Math.sin(dLat_centroid / 2) * Math.sin(dLat_centroid / 2) +
                             Math.cos(m.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                             Math.sin(dLng_centroid / 2) * Math.sin(dLng_centroid / 2);
          const c_centroid = 2 * Math.atan2(Math.sqrt(a_centroid), Math.sqrt(1 - a_centroid));
          const distance_centroid = R_centroid * c_centroid;
          if (distance_centroid < mndis) {
            mndis = distance_centroid;
            cluster.lat = m.lat;
            cluster.lng = m.lng;
          }
        }
      }

      clusters.push(cluster);
      processed.add(index);
    }

    setClusteredData(clusters);
  }, [globeEl, timeL, timeR, hasAnyRole]);

  const handleZoom = useCallback(() => { // Removed `pov` as it's not used directly from the param
    clusterMarkers(vesselData); // Cluster filtered data
    setHoveredVessel(null);
    setPopupPosition(null);
  }, [clusterMarkers, vesselData]);

  const fetchData = useCallback(async () => {
    setIsDataLoaded(false);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/getPositions', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: VesselData[] = await response.json();
      if (response.ok) {
        setVesselData(data);

        // Extract all timestamps and set min/max for the slider
        const timestamps = data.map(v => new Date(v.timestamp).getTime()).sort();
        if (timestamps.length > 0) {
          setTimeL(timestamps[0]);
          setTimeR(timestamps[timestamps.length - 1]);
        }

        clusterMarkers(data);
        setIsDataLoaded(true);
        setIsFirstLoad(false);
      }
    } catch (error) {
      console.log('Error fetching vessel data:', error);
      setIsDataLoaded(true); // Set to true even on error to show the interface
      setIsFirstLoad(false);
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/api/hotspots/', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data: HotspotData[] = await response.json();
      if(response.ok){
        //setHotspotData(data);
        console.log(data);
      }
    } catch (error) {
      console.log('Error fetching hotspot data:', error);
    }
  }, []);

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
    const timer = window.setTimeout(() => {
      setIsReportPanelVisible(true);
    }, 120);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsHistoryPanelVisible(true);
    }, 240);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return undefined;
  }, []);

  // Re-cluster whenever vesselData changes
  useEffect(() => {
    clusterMarkers(vesselData);
  }, [vesselData, clusterMarkers]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    const handleFocus = () => {
      fetchData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchData]);

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
        <>
          <div style={{
            position: 'absolute',
            inset: 0
          }}>
            <Globe
          ref={globeEl}
          globeImageUrl={null}
          bumpImageUrl={null}
          backgroundImageUrl={"night-sky.png"}
          showGlobe={false}
          showAtmosphere={false}
          backgroundColor={'rgba(23,23,23,0)'}

          polygonsData={landData.features}
          polygonCapColor={() => 'rgba(130, 130, 130, 0.5)'}
          polygonSideColor={() => 'rgba(23,23,23,0)'}
          polygonAltitude={0}
          polygonStrokeColor={() => 'rgba(255, 255, 255, 1)'}

          showGraticules={true}

          htmlElementsData={[{ id: 'atlantic-pin', lat: 20, lng: -30 }, ...clusteredData]}
          htmlElement={(d: any) => {
            const el = document.createElement('div');
            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';

            if (d.id === 'atlantic-pin') {
              const svgNS = 'http://www.w3.org/2000/svg';
              const svg = document.createElementNS(svgNS, 'svg');
              svg.setAttribute('viewBox', '0 0 24 36');
              svg.setAttribute('width', '24px');
              svg.setAttribute('height', '34px');

              const path = document.createElementNS(svgNS, 'path');
              path.setAttribute('d', 'M12 0C7 0 3 4 3 9c0 7.5 9 17 9 17s9-9.5 9-17C21 4 17 0 12 0z');
              path.setAttribute('fill', '#ffffff');
              const circle = document.createElementNS(svgNS, 'circle');
              circle.setAttribute('cx', '12');
              circle.setAttribute('cy', '9');
              circle.setAttribute('r', '4.5');
              circle.setAttribute('fill', '#0f1624');
              svg.appendChild(path);
              svg.appendChild(circle);
              el.appendChild(svg);
              el.style.pointerEvents = 'none';
              return el;
            }

            const svgNS = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(svgNS, 'svg');
            svg.setAttribute('viewBox', '0 0 24 36');
            svg.setAttribute('width', '22px');
            svg.setAttribute('height', '32px');

            const path = document.createElementNS(svgNS, 'path');
            path.setAttribute('d', 'M12 0C7 0 3 4 3 9c0 7.5 9 17 9 17s9-9.5 9-17C21 4 17 0 12 0z');
            path.setAttribute('fill', '#ffffff');

            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', '12');
            circle.setAttribute('cy', '9');
            circle.setAttribute('r', '4.5');
            circle.setAttribute('fill', '#0f1624');

            svg.appendChild(path);
            svg.appendChild(circle);
            el.appendChild(svg);

            el.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();

              if (d.count === 1) {
                setHoveredVessel(d.markers[0]);
                const popupHeight = 300;
                const popupWidth = 320;
                const screenHeight = window.innerHeight;
                const screenWidth = window.innerWidth;

                let x = e.clientX + 15;
                let y = e.clientY - 10;

                if (x + popupWidth > screenWidth) {
                  x = e.clientX - popupWidth - 15;
                }

                if (e.clientY > screenHeight / 2) {
                  y = e.clientY - popupHeight - 10;
                } else {
                  y = e.clientY - 10;
                }

                y = Math.max(10, Math.min(y, screenHeight - popupHeight - 10));
                x = Math.max(10, Math.min(x, screenWidth - popupWidth - 10));

                setPopupPosition({ x, y });
              } else {
                if (globeEl.current) {
                  const currentPov = globeEl.current.pointOfView();
                  const targetPov = {
                    lat: d.lat,
                    lng: d.lng,
                    altitude: Math.max(Math.min(10000, d.closest) / clusterBase * 0.5, currentPov.altitude * 0.2)
                  };

                  const duration = 1200;
                  const start = performance.now();

                  function animateZoom(now: number) {
                    const t = Math.min((now - start) / duration, 1);
                    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                    const pov = {
                      lat: currentPov.lat + (targetPov.lat - currentPov.lat) * ease,
                      lng: currentPov.lng + (targetPov.lng - currentPov.lng) * ease,
                      altitude: currentPov.altitude + (targetPov.altitude - currentPov.altitude) * ease
                    };
                    globeEl.current.pointOfView(pov);
                    if (t < 1) {
                      requestAnimationFrame(animateZoom);
                    }
                  }
                  requestAnimationFrame(animateZoom);
                }
              }
            });

            return el;
          }}
          htmlElementVisibilityModifier={(el: any, isVisible: Boolean) => {
            if (isVisible) {
              el.style.opacity = '1';
              el.style['pointer-events'] = 'auto';
            } else {
              el.style.opacity = '0';
              el.style['pointer-events'] = 'none';
            }
          }}

          onGlobeReady={() => { 
            clusterMarkers(vesselData); // Use filtered data on ready
            // Disable autorotation for dashboard
            if (globeEl.current) {
              globeEl.current.controls().autoRotate = false;
            }
          }}
          onZoom={() => { handleZoom(); }}
        />
          </div>

          {/* Vessel information popup */}
      {hoveredVessel && popupPosition && (
        <div
          data-popup="vessel-info"
          style={{
            position: 'fixed',
            left: popupPosition.x,
            top: popupPosition.y,
            backgroundColor: 'rgba(23, 23, 23, 0.92)',
            color: '#e0f2fd',
            padding: '20px',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            zIndex: 1000,
            boxShadow: '0 8px 32px rgba(70, 98, 171, 0.25)',
            border: '1px solid rgba(198, 218, 236, 0.35)',
            maxWidth: '320px',
            minWidth: '280px',
            backdropFilter: 'blur(10px)'
          }}
        >

          <div style={{ fontWeight: 'bold', marginBottom: '12px', color: hoveredVessel.registered ? GREEN : RED, fontSize: '16px' }}>
            {hoveredVessel.registered ? hoveredVessel.shipName : '[UNREGISTERED VESSEL]'}
            <ReactCountryFlag countryCode={hoveredVessel.flag} style={{ float: 'right' }} />
          </div>

          <div
            style={{
              width: '100%',
              height: '120px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed rgba(255, 255, 255, 0.3)',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '12px'
            }}
          >
            📷 Vessel Image Placeholder
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>Location:</strong> {hoveredVessel.lat.toFixed(4)}°, {hoveredVessel.lng.toFixed(4)}°
          </div>

          <div style={{ marginBottom: '10px' }}>
            <strong>Timestamp:</strong> {hoveredVessel.timestamp}
          </div>

          {
            hoveredVessel.geartype !== "" ?
              <div style={{ marginBottom: '10px' }}>
                <strong>Geartype:</strong> {hoveredVessel.geartype}
              </div> : null
          }

          {!hoveredVessel.registered && hasAnyRole(['confidential', 'secret', 'top-secret']) && (
            <button
              onClick={() => {
                const ap: AgentPoint = {
                  lat: hoveredVessel.lat,
                  lng: hoveredVessel.lng,
                  timestamp: hoveredVessel.timestamp,
                  mmsi: hoveredVessel.mmsi,
                  imo: hoveredVessel.imo,
                  flag: hoveredVessel.flag,
                  shipName: hoveredVessel.shipName,
                  geartype: hoveredVessel.geartype
                };
                setAgentPoint(ap);
                setIsAgentPanelOpen(true);
                setHoveredVessel(null);
                setPopupPosition(null);
              }}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: RED,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '10px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = DARK_RED;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = RED;
              }}
            >
              Open Agent
            </button>
          )}

          <button
            onClick={() => {
              setHoveredVessel(null);
              setPopupPosition(null);
            }}
            style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            Close
          </button>
        </div>
      )}

          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: 'min(32vw, 420px)',
              maxWidth: '100%',
              background: 'rgba(16, 23, 34, 0.94)',
              borderRight: '1px solid rgba(198, 218, 236, 0.22)',
              boxShadow: '12px 0 32px rgba(10, 14, 28, 0.45)',
              padding: '32px 32px 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              color: '#e0f2fd',
              backdropFilter: 'blur(18px)',
              transform: `translateX(${isReportPanelVisible ? '0' : '-110%'})`,
              transition: 'transform 640ms cubic-bezier(0.23, 1, 0.32, 1)',
              zIndex: 800,
              pointerEvents: isReportPanelVisible ? 'auto' : 'none'
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.7rem', fontWeight: 600, letterSpacing: '0.04em' }}>
                Report
              </h2>
              <p style={{ marginTop: '8px', color: '#9fb7d8', fontSize: '0.95rem', lineHeight: 1.5 }}>
                Operational summary for the selected maritime theatre.
              </p>
            </div>

          </div>

          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 'min(32vw, 420px)',
              width: '2px',
              background: 'linear-gradient(to bottom, transparent, rgba(70, 98, 171, 0.45), transparent)',
              zIndex: 750,
              pointerEvents: 'none',
              opacity: isReportPanelVisible ? 1 : 0,
              transition: 'opacity 420ms ease'
            }}
          />

          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: 'min(32vw, 420px)',
              maxWidth: '100%',
              padding: '28px 24px 36px',
              background: 'rgba(16, 23, 34, 0.92)',
              borderLeft: '1px solid rgba(198, 218, 236, 0.18)',
              boxShadow: '-12px 0 28px rgba(10, 14, 28, 0.35)',
              color: '#e0f2fd',
              display: 'grid',
              gridTemplateRows: 'auto 1fr',
              gap: '20px',
              backdropFilter: 'blur(16px)',
              transform: `translateX(${isHistoryPanelVisible ? '0' : '110%'})`,
              transition: 'transform 620ms cubic-bezier(0.23, 1, 0.32, 1)',
              zIndex: 780,
              pointerEvents: isHistoryPanelVisible ? 'auto' : 'none'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, color: '#94aacd', fontSize: '0.9rem' }}>
                Transaction History
              </p>

              <div
                style={{
                  borderRadius: '18px',
                  border: '1px solid rgba(198, 218, 236, 0.16)',
                  padding: '16px',
                  backgroundColor: 'rgba(22, 30, 46, 0.75)',
                  display: 'grid',
                  gap: '12px',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}
              >
                {historyEntries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    style={{
                      borderRadius: '14px',
                      padding: '12px 14px',
                      backgroundColor: 'rgba(27, 36, 58, 0.85)',
                      border: '1px solid rgba(198, 218, 236, 0.18)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e8f3ff' }}>
                      {`Transaction #${idx + 1}`}
                    </span>
                    <span style={{ fontSize: '0.82rem', color: '#b7c9e4', lineHeight: 1.35 }}>
                      {new Date(entry.timestamp).toLocaleString(undefined, {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                borderRadius: '20px',
                border: '1px solid rgba(198, 218, 236, 0.18)',
                backgroundColor: 'rgba(18, 24, 38, 0.9)',
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                height: '100%'
              }}
            >
              <div style={{ color: '#94aacd', fontSize: '0.9rem', fontWeight: 500 }}>Agent Chat</div>

              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingRight: '4px'
                }}
              >
                {agentMessages.length === 0 ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(27, 36, 58, 0.75)',
                      color: '#a4b8d6',
                      fontSize: '0.85rem'
                    }}
                  >
                    Start a conversation with the agent to receive guidance.
                  </div>
                ) : (
                  agentMessages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        padding: '10px 14px',
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: msg.role === 'user' ? 'rgba(70, 98, 171, 0.45)' : 'rgba(27, 36, 58, 0.8)',
                        border: '1px solid rgba(198, 218, 236, 0.15)',
                        color: '#eaf3ff',
                        fontSize: '0.9rem',
                        lineHeight: 1.4
                      }}
                    >
                      <div>{msg.content}</div>
                      <div
                        style={{
                          fontSize: '0.65rem',
                          marginTop: '6px',
                          color: '#a8bbdc',
                          textAlign: msg.role === 'user' ? 'right' : 'left'
                        }}
                      >
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAgentSubmit();
                }}
                style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}
              >
                <input
                  type="text"
                  value={agentInput}
                  onChange={(e) => setAgentInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAgentSubmit();
                    }
                  }}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    borderRadius: '999px',
                    border: '1px solid rgba(198, 218, 236, 0.25)',
                    background: 'rgba(18, 24, 38, 0.95)',
                    padding: '12px 18px',
                    color: '#e0f2fd',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    borderRadius: '999px',
                    padding: '0 22px',
                    border: 'none',
                    background: agentInput.trim()
                      ? 'linear-gradient(135deg, #4662ab, #5f7bda)'
                      : 'rgba(70, 98, 171, 0.4)',
                    color: '#f4f8ff',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: agentInput.trim() ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!agentInput.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Agent Panel */}
          <AgentPanel open={isAgentPanelOpen} point={agentPoint} onClose={() => setIsAgentPanelOpen(false)} />
        </>
      )}
    </div>
  );
};

export default HomePage;