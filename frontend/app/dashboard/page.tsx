'use client';

import dynamic from 'next/dynamic';
import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'; // Added useCallback, useMemo
import * as topojson from 'topojson-client';
import AgentPanel, { type AgentPoint } from '../../components/AgentPanel';
import { useAuth } from '../../hooks/useAuth';
import { fishingZones, type FishingZone } from '@/lib/fishingZones';
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
  const [hoveredFishingZone, setHoveredFishingZone] = useState<FishingZone | null>(null);
  const [fishingZonePopupPosition, setFishingZonePopupPosition] = useState<{ x: number; y: number } | null>(null);

  const [hotspotData, setHotspotData] = useState<HotspotData[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(false);
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
  const [reportTarget, setReportTarget] = useState<
    { type: 'zone'; data: FishingZone } | { type: 'vessel'; data: VesselData } | null
  >(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const reportTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reportErrorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const weeklyActivityData = useMemo(
    () => [
      { label: 'Wk 34', value: 12 },
      { label: 'Wk 35', value: 18 },
      { label: 'Wk 36', value: 14 },
      { label: 'Wk 37', value: 22 },
    ],
    []
  );
  const maxWeeklyValue = useMemo(
    () => Math.max(...weeklyActivityData.map((entry) => entry.value)),
    [weeklyActivityData]
  );
  const fishingZoneData = fishingZones;
  const resolvedReportZone = useMemo(() => {
    if (!reportTarget) return null;
    if (reportTarget.type === 'zone') return reportTarget.data;
    const match =
      fishingZoneData.find(
        (zone) =>
          zone.vessel.imo_number === String(reportTarget.data.imo) ||
          zone.vessel.name === reportTarget.data.shipName
      ) || null;
    return match;
  }, [reportTarget, fishingZoneData]);
  const reportTitle =
    reportTarget?.type === 'vessel'
      ? reportTarget.data.shipName
      : resolvedReportZone?.vessel.name ?? 'Maritime Snapshot';
  const [agentThinking, setAgentThinking] = useState(false);
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
  const handleAgentSubmit = useCallback(async () => {
    const trimmed = agentInput.trim();
    if (!trimmed || agentThinking) return;

    const now = new Date();
    const userMessage = {
      id: `user-${now.getTime()}`,
      role: 'user' as const,
      content: trimmed,
      timestamp: now
    };

    setAgentMessages((prev) => [...prev, userMessage]);
    setAgentInput('');
    setAgentThinking(true);

    try {
      const historyPayload = [...agentMessages, userMessage].map(({ role, content }) => ({
        role,
        content,
      }));

      const res = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'Failed to reach Gemini agent.');
      }

      const { reply } = await res.json();

      setAgentMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          role: 'system',
          content: reply,
          timestamp: new Date(),
        },
      ]);
    } catch (error: any) {
      setAgentMessages((prev) => [
        ...prev,
        {
          id: `agent-error-${Date.now()}`,
          role: 'system',
          content:
            'I’m sorry, I ran into a problem answering that. Please try again in a moment.',
          timestamp: new Date(),
        },
      ]);
      console.error('Agent chat error', error);
    } finally {
      setAgentThinking(false);
    }
  }, [agentInput, agentMessages, agentThinking]);

  const handleGenerateReport = useCallback(() => {
    if (!reportTarget) {
      setReportError('Select a vessel or fishing zone first to generate a report.');
      if (reportErrorTimeoutRef.current) clearTimeout(reportErrorTimeoutRef.current);
      reportErrorTimeoutRef.current = setTimeout(() => setReportError(null), 3500);
      return;
    }

    if (reportErrorTimeoutRef.current) {
      clearTimeout(reportErrorTimeoutRef.current);
      reportErrorTimeoutRef.current = null;
    }

    if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);

    setReportError(null);
    setReportVisible(false);
    setReportLoading(true);

    reportTimeoutRef.current = setTimeout(() => {
      setReportLoading(false);
      setReportVisible(true);
    }, 5000);
  }, [reportTarget]);


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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  useEffect(() => {
    return () => {
      if (reportTimeoutRef.current) clearTimeout(reportTimeoutRef.current);
      if (reportErrorTimeoutRef.current) clearTimeout(reportErrorTimeoutRef.current);
    };
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

          htmlElementsData={[...fishingZoneData, ...clusteredData]}
          htmlElement={(d: any) => {
            const el = document.createElement('div');
            el.style.pointerEvents = 'auto';
            el.style.cursor = 'pointer';

            // Render white pins for fishing zones
            if (d.id && typeof d.id === 'string' && d.id.startsWith('fishing-zone-')) {
              const svgNS = 'http://www.w3.org/2000/svg';
              const svg = document.createElementNS(svgNS, 'svg');
              svg.setAttribute('viewBox', '0 0 24 36');
              svg.setAttribute('width', '20px');
              svg.setAttribute('height', '30px');

              const path = document.createElementNS(svgNS, 'path');
              path.setAttribute('d', 'M12 0C7 0 3 4 3 9c0 7.5 9 17 9 17s9-9.5 9-17C21 4 17 0 12 0z');
              path.setAttribute('fill', '#ffffff');
              path.setAttribute('opacity', '0.85');
              
              const circle = document.createElementNS(svgNS, 'circle');
              circle.setAttribute('cx', '12');
              circle.setAttribute('cy', '9');
              circle.setAttribute('r', '4.5');
              circle.setAttribute('fill', '#0f1624');
              
              svg.appendChild(path);
              svg.appendChild(circle);
              el.appendChild(svg);
              
              // Add click handler to show detailed info
             el.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                setHoveredFishingZone(d as FishingZone);
                setReportTarget({ type: 'zone', data: d as FishingZone });
                setReportVisible(false);
                
                const popupHeight = 420;
                const popupWidth = 360;
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

                setFishingZonePopupPosition({ x, y });
              });
              
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
                setReportTarget({ type: 'vessel', data: d.markers[0] });
                setReportVisible(false);
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
                setReportTarget(null);
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

          {/* Fishing Zone Detailed Popup */}
          {hoveredFishingZone && fishingZonePopupPosition && (
            <div
              data-popup="fishing-zone-info"
              style={{
                position: 'fixed',
                left: fishingZonePopupPosition.x,
                top: fishingZonePopupPosition.y,
                backgroundColor: 'rgba(23, 23, 23, 0.95)',
                color: '#e0f2fd',
                padding: '20px',
                borderRadius: '12px',
                fontSize: '13px',
                fontFamily: 'Arial, sans-serif',
                zIndex: 1000,
                boxShadow: '0 8px 32px rgba(70, 98, 171, 0.35)',
                border: '1px solid rgba(198, 218, 236, 0.4)',
                maxWidth: '360px',
                minWidth: '340px',
                backdropFilter: 'blur(10px)'
              }}
            >
              {/* Header with vessel name */}
              <div style={{ 
                fontWeight: 'bold', 
                marginBottom: '14px', 
                color: '#ffffff',
                fontSize: '16px',
                borderBottom: '2px solid rgba(70, 98, 171, 0.5)',
                paddingBottom: '10px'
              }}>
                {hoveredFishingZone.vessel.name}
                <div style={{ fontSize: '11px', color: '#c0d9ef', fontWeight: 'normal', marginTop: '4px' }}>
                  IMO: {hoveredFishingZone.vessel.imo_number}
                </div>
              </div>

              {/* Coordinates */}
              <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ color: '#9fb7d8', fontSize: '10px', marginBottom: '2px' }}>LATITUDE</div>
                  <div style={{ fontWeight: '600' }}>{hoveredFishingZone.lat.toFixed(4)}°</div>
                </div>
                <div>
                  <div style={{ color: '#9fb7d8', fontSize: '10px', marginBottom: '2px' }}>LONGITUDE</div>
                  <div style={{ fontWeight: '600' }}>{hoveredFishingZone.lng.toFixed(4)}°</div>
                </div>
              </div>

              {/* Location */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9fb7d8', fontSize: '10px', marginBottom: '2px' }}>LOCATION</div>
                <div style={{ fontWeight: '600' }}>{hoveredFishingZone.name}</div>
              </div>

              {/* Vessel Model */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9fb7d8', fontSize: '10px', marginBottom: '2px' }}>VESSEL MODEL</div>
                <div style={{ fontWeight: '600' }}>{hoveredFishingZone.vessel.model}</div>
                <div style={{ fontSize: '11px', color: '#c0d9ef', marginTop: '2px' }}>
                  {hoveredFishingZone.vessel.flag_state} • Built {hoveredFishingZone.vessel.year_built}
                </div>
              </div>

              {/* Sustainability Score */}
              <div style={{ 
                marginBottom: '14px',
                padding: '12px',
                backgroundColor: 'rgba(70, 98, 171, 0.15)',
                borderRadius: '8px',
                border: '1px solid rgba(70, 98, 171, 0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ color: '#9fb7d8', fontSize: '11px', fontWeight: '600' }}>SUSTAINABILITY SCORE</div>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold',
                    color: hoveredFishingZone.sustainability_score.total_score >= 80 ? '#2eb700' : 
                           hoveredFishingZone.sustainability_score.total_score >= 70 ? '#f59e0b' : 
                           hoveredFishingZone.sustainability_score.total_score >= 60 ? '#fb923c' : '#fc0303'
                  }}>
                    {hoveredFishingZone.sustainability_score.total_score}
                    <span style={{ fontSize: '14px', marginLeft: '4px' }}>/ 100</span>
                  </div>
                </div>
                <div style={{ 
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  backgroundColor: hoveredFishingZone.sustainability_score.total_score >= 80 ? 'rgba(46, 183, 0, 0.2)' : 
                                   hoveredFishingZone.sustainability_score.total_score >= 70 ? 'rgba(245, 158, 11, 0.2)' : 
                                   hoveredFishingZone.sustainability_score.total_score >= 60 ? 'rgba(251, 146, 60, 0.2)' : 'rgba(252, 3, 3, 0.2)',
                  color: hoveredFishingZone.sustainability_score.total_score >= 80 ? '#2eb700' : 
                         hoveredFishingZone.sustainability_score.total_score >= 70 ? '#f59e0b' : 
                         hoveredFishingZone.sustainability_score.total_score >= 60 ? '#fb923c' : '#fc0303',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  Grade: {hoveredFishingZone.sustainability_score.grade}
                </div>
              </div>

              {/* Category Breakdown */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ color: '#9fb7d8', fontSize: '10px', marginBottom: '8px', fontWeight: '600' }}>CATEGORY SCORES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {Object.entries(hoveredFishingZone.sustainability_score.categories).map(([key, value]: [string, any]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        fontSize: '10px', 
                        flex: '1',
                        textTransform: 'capitalize',
                        color: '#d2deea'
                      }}>
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div style={{
                        width: '100px',
                        height: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${value.score}%`,
                          height: '100%',
                          backgroundColor: value.score >= 80 ? '#2eb700' : 
                                         value.score >= 70 ? '#f59e0b' : 
                                         value.score >= 60 ? '#fb923c' : '#fc0303',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      <div style={{ fontSize: '11px', fontWeight: '600', minWidth: '30px', textAlign: 'right' }}>
                        {value.score}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={() => {
                  setHoveredFishingZone(null);
                  setFishingZonePopupPosition(null);
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
              <button
                type="button"
                style={{
                  marginTop: '16px',
                  padding: '12px 18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(70, 98, 171, 0.55)',
                  background: 'linear-gradient(135deg, rgba(70,98,171,0.9), rgba(95,123,218,0.9))',
                  color: '#f4f8ff',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  boxShadow: '0 10px 25px rgba(12, 20, 40, 0.35)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (reportLoading) return;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 14px 32px rgba(12, 20, 40, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(12, 20, 40, 0.35)';
                }}
                onClick={handleGenerateReport}
                disabled={reportLoading}
              >
                {reportLoading ? (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255,255,255,0.45)',
                      borderTopColor: '#f4f8ff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }}
                  />
                ) : (
                  'Generate Report'
                )}
              </button>
              {reportError && (
                <div style={{ color: '#fda4af', fontSize: '0.8rem', marginTop: '8px' }}>{reportError}</div>
              )}
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
                      {new Date(entry.timestamp).toISOString().replace('T', ', ').replace('Z', '').slice(0, -3)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#7f93b8', fontSize: '0.85rem' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#2eb700',
                      boxShadow: '0 0 6px rgba(46, 183, 0, 0.6)'
                    }}
                  />
                  <span>Agent online</span>
                </div>
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
                      ? agentThinking
                        ? 'rgba(70, 98, 171, 0.35)'
                        : 'linear-gradient(135deg, #4662ab, #5f7bda)'
                      : 'rgba(70, 98, 171, 0.25)',
                    color: '#f4f8ff',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: agentInput.trim() && !agentThinking ? 'pointer' : 'not-allowed',
                    opacity: agentThinking ? 0.8 : 1
                  }}
                  disabled={!agentInput.trim() || agentThinking}
                >
                  {agentThinking ? 'Thinking…' : 'Send'}
                </button>
              </form>
            </div>
          </div>

          {/* Agent Panel */}
          <AgentPanel open={isAgentPanelOpen} point={agentPoint} onClose={() => setIsAgentPanelOpen(false)} />

          {/* Report Overlay */}
          {reportVisible && reportTarget && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(8, 12, 20, 0.78)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1200
              }}
            >
              <div
                style={{
                  width: 'min(860px, 90vw)',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  background: 'rgba(14, 20, 31, 0.96)',
                  borderRadius: '18px',
                  border: '1px solid rgba(198, 218, 236, 0.2)',
                  boxShadow: '0 24px 48px rgba(8, 15, 28, 0.45)',
                  color: '#e6f0ff',
                  padding: '32px 36px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '28px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 600 }}>
                      Report: {reportTitle}
                    </div>
                    <div style={{ marginTop: '6px', color: '#9fb7d8', fontSize: '0.9rem' }}>
                      Generated on {new Date().toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => setReportVisible(false)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      border: '1px solid rgba(198, 218, 236, 0.25)',
                      background: 'rgba(70, 98, 171, 0.8)',
                      color: '#f4f8ff',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Export PDF
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '18px',
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(198, 218, 236, 0.15)'
                  }}
                >
                  <div>
                    <div style={{ color: '#8fa8d9', fontSize: '0.75rem', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      LATITUDE
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {reportTarget.type === 'zone'
                        ? reportTarget.data.lat.toFixed(4)
                        : reportTarget.data.lat.toFixed(4)}°
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#8fa8d9', fontSize: '0.75rem', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      LONGITUDE
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {reportTarget.type === 'zone'
                        ? reportTarget.data.lng.toFixed(4)
                        : reportTarget.data.lng.toFixed(4)}°
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#8fa8d9', fontSize: '0.75rem', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      LOCATION
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {resolvedReportZone?.name ?? 'Open Waters'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#8fa8d9', fontSize: '0.75rem', letterSpacing: '0.08em', marginBottom: '4px' }}>
                      VESSEL MODEL
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {resolvedReportZone?.vessel.model ?? (reportTarget.type === 'vessel' ? 'Purse Seiner 70m' : 'Multi-role 75m')}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#9fb7d8', marginTop: '2px' }}>
                      {resolvedReportZone
                        ? `${resolvedReportZone.vessel.flag_state} • Built ${resolvedReportZone.vessel.year_built}`
                        : 'Flag state TBD • Built 2016'}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: '16px',
                    border: '1px solid rgba(198,218,236,0.18)',
                    background: 'rgba(17,25,38,0.85)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                  }}
                >
                  <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Weekly IUU Activity Analysis</div>
                  <p style={{ color: '#a5bddf', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    This section provides a week-over-week summary of detected vessels engaged in suspected Illegal,
                    Unreported, and Unregulated (IUU) fishing activities. The insights are aggregated from AIS telemetry,
                    satellite imagery, and on-board sensor fusion.
                  </p>
                  <div
                    style={{
                      height: '200px',
                      display: 'grid',
                      gridTemplateColumns: `repeat(${weeklyActivityData.length}, 1fr)`,
                      gap: '16px',
                      alignItems: 'end',
                      padding: '0 12px'
                    }}
                  >
                    {weeklyActivityData.map((entry) => (
                      <div key={entry.label} style={{ textAlign: 'center', color: '#d7e6ff', fontSize: '0.85rem' }}>
                        <div
                          style={{
                            height: `${(entry.value / maxWeeklyValue) * 180}px`,
                            background: 'linear-gradient(180deg, rgba(90,132,218,0.85), rgba(70,98,171,0.75))',
                            borderRadius: '10px',
                            boxShadow: '0 8px 20px rgba(18, 28, 56, 0.4)',
                            marginBottom: '8px'
                          }}
                          title={`${entry.label} – ${entry.value} vessels`}
                        />
                        {entry.label}
                      </div>
                    ))}
                  </div>
                  <div style={{ color: '#9fb7d8', fontSize: '0.8rem', textAlign: 'center' }}>
                    Figure 1: Count of vessels flagged for IUU-like behavior across the past four weeks.
                  </div>
                  <div style={{ color: '#cfe3ff', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    <strong>Analysis:</strong> A moderate rise in flagged activity is visible in Week 37. The spike aligns with
                    seasonal movements of target species transiting the central corridor. Recommend cross-referencing satellite
                    reconnaissance and patrol intel for corroboration.
                  </div>
                </div>

                <div
                  style={{
                    borderRadius: '16px',
                    border: '1px solid rgba(198,218,236,0.18)',
                    background: 'rgba(17,25,38,0.85)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px'
                  }}
                >
                  <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Sustainability Snapshot</div>
                  <p style={{ color: '#a5bddf', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    Assessment of fleet sustainability metrics for the selected operating zone. Scores reflect current
                    telemetry, inspection reports, and compliance filings as of this week.
                  </p>
                  <div
                    style={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(25,37,57,0.95), rgba(17,25,38,0.85))',
                      border: '1px solid rgba(95,123,218,0.35)',
                      padding: '18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ color: '#8fa8d9', fontSize: '0.85rem', letterSpacing: '0.05em' }}>SUSTAINABILITY SCORE</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginTop: '10px' }}>
                        <span style={{ fontSize: '2.4rem', fontWeight: 700 }}>
                          {resolvedReportZone?.sustainability_score.total_score ?? 74}
                        </span>
                        <span style={{ fontSize: '1.1rem', color: '#9fb7d8' }}>/ 100</span>
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 189, 89, 0.2)',
                        color: '#ffbd59',
                        fontWeight: 600,
                        letterSpacing: '0.05em'
                      }}
                    >
                      Grade: {resolvedReportZone?.sustainability_score.grade ?? 'B'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ color: '#9fb7d8', fontSize: '0.85rem', letterSpacing: '0.05em' }}>CATEGORY SCORES</div>
                    {Object.entries(
                      resolvedReportZone?.sustainability_score.categories ?? {
                        vessel_efficiency: { score: 74 },
                        fishing_method: { score: 70 },
                        environmental_practices: { score: 82 },
                        compliance_and_transparency: { score: 88 },
                        social_responsibility: { score: 76 }
                      }
                    ).map(([key, { score }]) => (
                      <div
                        key={key}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '180px 1fr 40px',
                          gap: '12px',
                          alignItems: 'center',
                          fontSize: '0.9rem'
                        }}
                      >
                        <span style={{ textTransform: 'capitalize', color: '#d7e6ff' }}>
                          {key.replace(/_/g, ' ')}
                        </span>
                        <div
                          style={{
                            width: '100%',
                            height: '8px',
                            borderRadius: '5px',
                            background: 'rgba(255,255,255,0.12)',
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(score, 100)}%`,
                              height: '100%',
                              background: score >= 80 ? '#2eb700' : score >= 70 ? '#f59e0b' : '#fb923c',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        <span style={{ fontWeight: 600 }}>{score}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setReportVisible(false)}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '10px',
                      border: '1px solid rgba(198, 218, 236, 0.2)',
                      background: 'rgba(15,23,36,0.8)',
                      color: '#f4f8ff',
                      fontSize: '1rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;