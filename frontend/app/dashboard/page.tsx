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

  // Major commercial fishing zones worldwide with detailed vessel and sustainability data
  const fishingZones = [
    {
      id: 'fishing-zone-1',
      lat: 20,
      lng: -30,
      name: 'North Atlantic Central',
      vessel: { name: 'FV Ocean Star', imo_number: '9234567', model: 'Purse Seiner 85m', flag_state: 'Norway', year_built: 2012 },
      sustainability_score: { total_score: 78, grade: 'B', categories: { vessel_efficiency: { score: 70 }, fishing_method: { score: 65 }, environmental_practices: { score: 82 }, compliance_and_transparency: { score: 90 }, social_responsibility: { score: 75 } } }
    },
    {
      id: 'fishing-zone-2',
      lat: 47,
      lng: -52,
      name: 'Grand Banks (Canada)',
      vessel: { name: 'FV Atlantic Pride', imo_number: '9245678', model: 'Trawler 72m', flag_state: 'Canada', year_built: 2015 },
      sustainability_score: { total_score: 85, grade: 'A', categories: { vessel_efficiency: { score: 88 }, fishing_method: { score: 82 }, environmental_practices: { score: 90 }, compliance_and_transparency: { score: 92 }, social_responsibility: { score: 80 } } }
    },
    {
      id: 'fishing-zone-3',
      lat: 56,
      lng: 3,
      name: 'North Sea',
      vessel: { name: 'FV Nordic Harvest', imo_number: '9256789', model: 'Factory Trawler 95m', flag_state: 'Netherlands', year_built: 2018 },
      sustainability_score: { total_score: 82, grade: 'A-', categories: { vessel_efficiency: { score: 85 }, fishing_method: { score: 78 }, environmental_practices: { score: 88 }, compliance_and_transparency: { score: 95 }, social_responsibility: { score: 78 } } }
    },
    {
      id: 'fishing-zone-4',
      lat: 57,
      lng: -178,
      name: 'Bering Sea',
      vessel: { name: 'FV Alaska Gold', imo_number: '9267890', model: 'Longliner 68m', flag_state: 'USA', year_built: 2010 },
      sustainability_score: { total_score: 73, grade: 'B-', categories: { vessel_efficiency: { score: 68 }, fishing_method: { score: 70 }, environmental_practices: { score: 75 }, compliance_and_transparency: { score: 88 }, social_responsibility: { score: 72 } } }
    },
    {
      id: 'fishing-zone-5',
      lat: 38,
      lng: 141,
      name: 'Sanriku (Japan)',
      vessel: { name: 'FV Pacific Dawn', imo_number: '9278901', model: 'Purse Seiner 78m', flag_state: 'Japan', year_built: 2016 },
      sustainability_score: { total_score: 80, grade: 'B+', categories: { vessel_efficiency: { score: 82 }, fishing_method: { score: 75 }, environmental_practices: { score: 85 }, compliance_and_transparency: { score: 90 }, social_responsibility: { score: 76 } } }
    },
    {
      id: 'fishing-zone-6',
      lat: -42,
      lng: 148,
      name: 'Tasmania Coast',
      vessel: { name: 'FV Southern Cross', imo_number: '9289012', model: 'Trawler 65m', flag_state: 'Australia', year_built: 2019 },
      sustainability_score: { total_score: 87, grade: 'A', categories: { vessel_efficiency: { score: 90 }, fishing_method: { score: 85 }, environmental_practices: { score: 92 }, compliance_and_transparency: { score: 93 }, social_responsibility: { score: 82 } } }
    },
    {
      id: 'fishing-zone-7',
      lat: -14,
      lng: -77,
      name: 'Peru Current',
      vessel: { name: 'FV Humboldt Star', imo_number: '9290123', model: 'Purse Seiner 82m', flag_state: 'Peru', year_built: 2014 },
      sustainability_score: { total_score: 68, grade: 'C+', categories: { vessel_efficiency: { score: 65 }, fishing_method: { score: 62 }, environmental_practices: { score: 70 }, compliance_and_transparency: { score: 85 }, social_responsibility: { score: 68 } } }
    },
    {
      id: 'fishing-zone-8',
      lat: -33,
      lng: -72,
      name: 'Chile Coast',
      vessel: { name: 'FV Andean Wave', imo_number: '9301234', model: 'Trawler 70m', flag_state: 'Chile', year_built: 2017 },
      sustainability_score: { total_score: 76, grade: 'B', categories: { vessel_efficiency: { score: 78 }, fishing_method: { score: 72 }, environmental_practices: { score: 80 }, compliance_and_transparency: { score: 88 }, social_responsibility: { score: 74 } } }
    },
    {
      id: 'fishing-zone-9',
      lat: 12,
      lng: 115,
      name: 'South China Sea',
      vessel: { name: 'FV Dragon Pearl', imo_number: '9312345', model: 'Purse Seiner 75m', flag_state: 'China', year_built: 2013 },
      sustainability_score: { total_score: 62, grade: 'C', categories: { vessel_efficiency: { score: 60 }, fishing_method: { score: 58 }, environmental_practices: { score: 65 }, compliance_and_transparency: { score: 75 }, social_responsibility: { score: 65 } } }
    },
    {
      id: 'fishing-zone-10',
      lat: -5,
      lng: 105,
      name: 'Java Sea',
      vessel: { name: 'FV Nusantara', imo_number: '9323456', model: 'Trawler 62m', flag_state: 'Indonesia', year_built: 2011 },
      sustainability_score: { total_score: 65, grade: 'C+', categories: { vessel_efficiency: { score: 63 }, fishing_method: { score: 60 }, environmental_practices: { score: 68 }, compliance_and_transparency: { score: 78 }, social_responsibility: { score: 70 } } }
    },
    {
      id: 'fishing-zone-11',
      lat: 36,
      lng: 124,
      name: 'Yellow Sea',
      vessel: { name: 'FV East Wind', imo_number: '9334567', model: 'Factory Trawler 88m', flag_state: 'South Korea', year_built: 2015 },
      sustainability_score: { total_score: 74, grade: 'B-', categories: { vessel_efficiency: { score: 76 }, fishing_method: { score: 70 }, environmental_practices: { score: 78 }, compliance_and_transparency: { score: 82 }, social_responsibility: { score: 72 } } }
    },
    {
      id: 'fishing-zone-12',
      lat: 15,
      lng: 73,
      name: 'Arabian Sea (India)',
      vessel: { name: 'FV Mumbai Express', imo_number: '9345678', model: 'Longliner 66m', flag_state: 'India', year_built: 2012 },
      sustainability_score: { total_score: 70, grade: 'B-', categories: { vessel_efficiency: { score: 68 }, fishing_method: { score: 67 }, environmental_practices: { score: 72 }, compliance_and_transparency: { score: 80 }, social_responsibility: { score: 75 } } }
    },
    {
      id: 'fishing-zone-13',
      lat: -23,
      lng: 35,
      name: 'Mozambique Channel',
      vessel: { name: 'FV African Queen', imo_number: '9356789', model: 'Trawler 64m', flag_state: 'South Africa', year_built: 2018 },
      sustainability_score: { total_score: 79, grade: 'B+', categories: { vessel_efficiency: { score: 80 }, fishing_method: { score: 75 }, environmental_practices: { score: 82 }, compliance_and_transparency: { score: 85 }, social_responsibility: { score: 78 } } }
    },
    {
      id: 'fishing-zone-14',
      lat: 14,
      lng: -17,
      name: 'West Africa (Senegal)',
      vessel: { name: 'FV Dakar Spirit', imo_number: '9367890', model: 'Purse Seiner 71m', flag_state: 'Senegal', year_built: 2014 },
      sustainability_score: { total_score: 66, grade: 'C+', categories: { vessel_efficiency: { score: 64 }, fishing_method: { score: 62 }, environmental_practices: { score: 68 }, compliance_and_transparency: { score: 78 }, social_responsibility: { score: 72 } } }
    },
    {
      id: 'fishing-zone-15',
      lat: -28,
      lng: 16,
      name: 'Benguela Current',
      vessel: { name: 'FV Namibian Pride', imo_number: '9378901', model: 'Factory Trawler 92m', flag_state: 'Namibia', year_built: 2016 },
      sustainability_score: { total_score: 81, grade: 'A-', categories: { vessel_efficiency: { score: 83 }, fishing_method: { score: 78 }, environmental_practices: { score: 85 }, compliance_and_transparency: { score: 88 }, social_responsibility: { score: 80 } } }
    },
    {
      id: 'fishing-zone-16',
      lat: 40,
      lng: 15,
      name: 'Mediterranean Sea',
      vessel: { name: 'FV Mare Nostrum', imo_number: '9389012', model: 'Purse Seiner 69m', flag_state: 'Italy', year_built: 2013 },
      sustainability_score: { total_score: 77, grade: 'B', categories: { vessel_efficiency: { score: 75 }, fishing_method: { score: 73 }, environmental_practices: { score: 80 }, compliance_and_transparency: { score: 90 }, social_responsibility: { score: 76 } } }
    },
    {
      id: 'fishing-zone-17',
      lat: 52,
      lng: -5,
      name: 'Irish Sea',
      vessel: { name: 'FV Celtic Tide', imo_number: '9390123', model: 'Trawler 67m', flag_state: 'Ireland', year_built: 2017 },
      sustainability_score: { total_score: 84, grade: 'A', categories: { vessel_efficiency: { score: 86 }, fishing_method: { score: 82 }, environmental_practices: { score: 88 }, compliance_and_transparency: { score: 92 }, social_responsibility: { score: 79 } } }
    },
    {
      id: 'fishing-zone-18',
      lat: 8,
      lng: -80,
      name: 'Eastern Pacific (Panama)',
      vessel: { name: 'FV Panama Blue', imo_number: '9401234', model: 'Longliner 74m', flag_state: 'Panama', year_built: 2015 },
      sustainability_score: { total_score: 72, grade: 'B-', categories: { vessel_efficiency: { score: 70 }, fishing_method: { score: 68 }, environmental_practices: { score: 75 }, compliance_and_transparency: { score: 82 }, social_responsibility: { score: 73 } } }
    },
    {
      id: 'fishing-zone-19',
      lat: -40,
      lng: -58,
      name: 'Argentina Coast',
      vessel: { name: 'FV Patagonian Wind', imo_number: '9412345', model: 'Trawler 76m', flag_state: 'Argentina', year_built: 2019 },
      sustainability_score: { total_score: 83, grade: 'A-', categories: { vessel_efficiency: { score: 85 }, fishing_method: { score: 80 }, environmental_practices: { score: 87 }, compliance_and_transparency: { score: 90 }, social_responsibility: { score: 81 } } }
    },
    {
      id: 'fishing-zone-20',
      lat: 65,
      lng: 12,
      name: 'Norwegian Sea',
      vessel: { name: 'FV Viking Explorer', imo_number: '9423456', model: 'Factory Trawler 98m', flag_state: 'Norway', year_built: 2020 },
      sustainability_score: { total_score: 89, grade: 'A+', categories: { vessel_efficiency: { score: 92 }, fishing_method: { score: 88 }, environmental_practices: { score: 94 }, compliance_and_transparency: { score: 95 }, social_responsibility: { score: 85 } } }
    },
  ];

  const globeEl = useRef<any>(null);
  const [landData, setLandData] = useState<{ features: any[] }>({ features: [] });
  const [vesselData, setVesselData] = useState<VesselData[]>([]);

  const [clusteredData, setClusteredData] = useState<ClusterData[]>([]);
  const [hoveredVessel, setHoveredVessel] = useState<VesselData | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredFishingZone, setHoveredFishingZone] = useState<any | null>(null);
  const [fishingZonePopupPosition, setFishingZonePopupPosition] = useState<{ x: number; y: number } | null>(null);

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

          htmlElementsData={[...fishingZones, ...clusteredData]}
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
                
                setHoveredFishingZone(d);
                
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