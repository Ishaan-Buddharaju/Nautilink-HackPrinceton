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
  const [chatMessages, setChatMessages] = useState<
    { id: string; role: 'system' | 'user'; content: string; timestamp: Date }[]
  >([
    {
      id: 'landing-welcome',
      role: 'system',
      content: 'Welcome aboard. Ask anything about Nautilink to begin.',
      timestamp: new Date()
    }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Minimal data for landing page globe background
  const [clusteredData, setClusteredData] = useState<ClusterData[]>([]);
  const [vesselData, setVesselData] = useState<VesselData[]>([]); // To simulate data for the background globe

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

  const handleEnterDashboard = () => {
    router.push('/dashboard'); // Navigate to the dashboard page
  };

  const handleLandingChatSubmit = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const now = new Date();
    const userMsg = {
      id: `landing-user-${now.getTime()}`,
      role: 'user' as const,
      content: trimmed,
      timestamp: now
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    window.setTimeout(() => {
      const response = {
        id: `landing-agent-${Date.now()}`,
        role: 'system' as const,
        content: 'Great question. Sign in to the dashboard to explore deeper insights.',
        timestamp: new Date()
      };
      setChatMessages((prev) => [...prev, response]);
    }, 600);
  }, [chatInput]);

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
            right: '-50%',
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
              htmlElementsData={clusteredData}
              htmlElement={(d: any) => {
                const el = document.createElement('div');
                if (d.count > 1) {
                  el.innerHTML = clusterSvg(d.count);
                } else {
                  el.innerHTML = markerSvg;
                }
                el.style.color = d.registered ? GREEN : RED;
                el.style.width = `${40 + d.count / 200}px`;
                el.style.height = 'auto';
                el.style.pointerEvents = 'none'; // Disable interaction for background
                return el;
              }}
              htmlElementVisibilityModifier={(el: any, isVisible: Boolean) => {
                if (isVisible) {
                  el.style.opacity = '1';
                } else {
                  el.style.opacity = '0';
                }
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
            zIndex: 10,
            textAlign: 'left',
            maxWidth: '600px',
            padding: '0 60px',
            marginLeft: '-400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px'
          }}>
            <div>
              {/* Logo and Title */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <img 
                  src="/nautilink-logo-white.png" 
                  alt="Nautilink" 
                  style={{ 
                    width: '60px', 
                    height: '60px', 
                    marginRight: '20px',
                    borderRadius: '8px'
                  }} 
                />
                <h1 style={{
                  fontSize: '4rem',
                  fontWeight: 'bold',
                  margin: 0,
                  color: '#e0f2fd',
                  letterSpacing: '0.1em'
                }}>
                  Nautilink
                </h1>
              </div>

              {/* Subtitle */}
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '300',
                margin: '0 0 40px 0',
                color: '#d2deea',
                lineHeight: '1.4'
              }}>
                Advanced Maritime Intelligence & Surveillance Platform
              </h2>

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

            {/* Landing assistant chat */}
            <div
              style={{
                marginTop: 'auto',
                borderRadius: '20px',
                border: '1px solid rgba(198, 218, 236, 0.18)',
                backgroundColor: 'rgba(18, 24, 38, 0.92)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxShadow: '0 18px 32px rgba(12, 20, 40, 0.45)'
              }}
            >
              <div style={{ color: '#94aacd', fontSize: '0.95rem', fontWeight: 600 }}>Quick Assist</div>

              <div
                style={{
                  maxHeight: '220px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  paddingRight: '4px'
                }}
              >
                {chatMessages.map((msg) => (
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
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLandingChatSubmit();
                }}
                style={{ display: 'flex', gap: '12px' }}
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleLandingChatSubmit();
                    }
                  }}
                  placeholder="Type a message..."
                  style={{
                    flex: 1,
                    borderRadius: '999px',
                    border: '1px solid rgba(198, 218, 236, 0.28)',
                    background: 'rgba(15, 22, 36, 0.92)',
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
                    padding: '0 26px',
                    border: 'none',
                    background: chatInput.trim()
                      ? 'linear-gradient(135deg, #4662ab, #5f7bda)'
                      : 'rgba(70, 98, 171, 0.35)',
                    color: '#f4f8ff',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: chatInput.trim() ? 'pointer' : 'not-allowed'
                  }}
                  disabled={!chatInput.trim()}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;