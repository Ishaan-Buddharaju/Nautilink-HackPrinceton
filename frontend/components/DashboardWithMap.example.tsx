/**
 * INTEGRATION EXAMPLE: Adding 2D Map to Existing Dashboard
 * 
 * This file shows how to integrate GeoAdjacentMap into your existing dashboard/page.tsx
 * Choose one of the three options below based on your needs.
 */

import dynamic from 'next/dynamic';
import GeoAdjacentMap from './GeoAdjacentMap';
import DualMapView from './DualMapView';

// Your existing imports...
// const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

/**
 * OPTION 1: Mini 2D Map Overlay (Recommended for existing dashboard)
 * -------------------------------------------------------------------
 * Adds a small 2D map in the corner without changing your existing globe layout
 */
export function DashboardWithMiniMap() {
  // Your existing state and logic...
  // const [clusteredData, setClusteredData] = useState([]);
  // const [hoveredVessel, setHoveredVessel] = useState(null);
  
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Your existing Globe component stays here */}
      
      {/* Add this: Mini 2D map overlay in bottom-right corner */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '400px',
        height: '300px',
        zIndex: 100,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '2px solid rgba(70,98,171,0.4)',
      }}>
        <GeoAdjacentMap
          locations={clusteredData} // Use your existing clusteredData
          selectedLocation={hoveredVessel}
          onLocationClick={(location) => {
            // Handle click - extract vessel from cluster if needed
            const vessel = location.markers?.[0] || location;
            setHoveredVessel(vessel);
            
            // Optionally open agent panel
            if (!location.registered) {
              setAgentPoint({
                lat: location.lat,
                lng: location.lng,
                timestamp: vessel.timestamp,
                mmsi: vessel.mmsi,
                imo: vessel.imo,
                flag: vessel.flag,
                shipName: vessel.shipName,
                geartype: vessel.geartype,
              });
              setIsAgentPanelOpen(true);
            }
          }}
          initialView={{ lat: 20, lng: 0, zoom: 2 }}
          width="100%"
          height="100%"
          showControls={true}
        />
      </div>
    </div>
  );
}

/**
 * OPTION 2: Side-by-Side Split View
 * -------------------------------------------------------------------
 * Replace your globe container with DualMapView for synchronized views
 */
export function DashboardWithSplitView() {
  // Your existing state...
  
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <DualMapView
        locations={clusteredData}
        landData={landData} // Your topojson land data
        onLocationSelect={(location) => {
          if (location?.markers?.[0]) {
            setHoveredVessel(location.markers[0]);
            
            // Open agent panel for unregistered vessels
            if (!location.registered) {
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
          }
        }}
        initialView={{ lat: 20, lng: 0, altitude: 2.5 }}
        showSplitView={true}
      />
      
      {/* Your existing panels stay the same */}
      {/* AgentPanel, ReportPanel, etc. */}
    </div>
  );
}

/**
 * OPTION 3: Toggleable 2D Map (Mobile-friendly)
 * -------------------------------------------------------------------
 * Add a button to toggle between globe and map view
 */
export function DashboardWithToggleMap() {
  const [showMap, setShowMap] = useState(false);
  
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Toggle Button */}
      <button
        onClick={() => setShowMap(!showMap)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 200,
          padding: '10px 20px',
          backgroundColor: '#4662ab',
          color: '#e0f2fd',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        {showMap ? '🌐 Show Globe' : '🗺️ Show Map'}
      </button>
      
      {/* Conditionally render Globe or Map */}
      {!showMap ? (
        <div style={{ width: '100%', height: '100%' }}>
          {/* Your existing Globe component */}
        </div>
      ) : (
        <GeoAdjacentMap
          locations={clusteredData}
          selectedLocation={hoveredVessel}
          onLocationClick={(location) => {
            const vessel = location.markers?.[0] || location;
            setHoveredVessel(vessel);
          }}
          initialView={{ lat: 20, lng: 0, zoom: 2 }}
          width="100%"
          height="100%"
          showControls={true}
        />
      )}
    </div>
  );
}

/**
 * QUICK COPY-PASTE SNIPPET
 * -------------------------
 * Add this to your existing dashboard/page.tsx return statement:
 */

/*

// Add to imports at top:
import GeoAdjacentMap from '../../components/GeoAdjacentMap';

// Add inside your return() statement, after your Globe:
<div style={{
  position: 'absolute',
  bottom: '20px',
  right: '20px',
  width: '400px',
  height: '300px',
  zIndex: 100,
  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  borderRadius: '12px',
  overflow: 'hidden',
  border: '2px solid rgba(70,98,171,0.4)',
}}>
  <GeoAdjacentMap
    locations={clusteredData}
    selectedLocation={hoveredVessel}
    onLocationClick={(location) => {
      const vessel = location.markers?.[0] || location;
      setHoveredVessel(vessel);
    }}
    initialView={{ lat: 20, lng: 0, zoom: 2 }}
    width="100%"
    height="100%"
  />
</div>

*/

/**
 * CONVERTING YOUR VESSEL DATA
 * ----------------------------
 * Your existing clusteredData already works! It has:
 * - lat, lng (required)
 * - registered (for color coding)
 * - count (for cluster badges)
 * - markers array (for detailed vessel info)
 * 
 * The component will automatically:
 * ✅ Color code: Green (registered) / Red (unregistered)
 * ✅ Show count badges on clusters
 * ✅ Handle click events
 * ✅ Display popups on hover
 */
