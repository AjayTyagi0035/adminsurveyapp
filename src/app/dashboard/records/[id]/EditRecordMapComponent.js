"use client"
import { useEffect, useState, useRef, useMemo } from 'react'
import { TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SafeMapContainer from '../../../../components/SafeMapContainer'

// Custom SVG pins as data URLs
const CURRENT_PIN_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="38" height="38">
  <path fill="#facc15" d="M384 192c0 87.4-117 243-168.3 307.2c-12.3 15.3-35.1 15.3-47.4 0C117 435 0 279.4 0 192C0 86 86 0 192 0S384 86 384 192z"/>
  <path fill="#ffffff" d="M192 112L120 176v80h48v-48h48v48h48v-80L192 112z"/>
</svg>
`);

// Other properties = Red 12x12 circle
const OTHER_DOT_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
  <circle cx="6" cy="6" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
</svg>
`);

let currentIcon;
let otherIcon;

if (typeof window !== 'undefined') {
  currentIcon = L.icon({
    iconUrl: CURRENT_PIN_SVG,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    tooltipAnchor: [0, -38]
  });

  otherIcon = L.icon({
    iconUrl: OTHER_DOT_SVG,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    tooltipAnchor: [0, -6]
  });
}

// Map event listener to handle map click
function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

// Controller to auto-center the map once on mount or location initialization
function CenterMap({ center }) {
  const map = useMap();
  const centeredRef = useRef(false);

  useEffect(() => {
    if (center && !centeredRef.current) {
      map.setView([center.lat, center.lng], 18);
      centeredRef.current = true;
    }
  }, [center, map]);

  return null;
}

const DEFAULT_CENTER = [29.405678, 77.208220];

const mapShellStyle = {
  width: '100%',
  height: '350px',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  marginTop: '12px',
};

export default function EditRecordMapComponent({
  currentLocation,
  otherProperties = [],
  onLocationChange,
  showDroneLayer = true,
}) {
  const [currentPos, setCurrentPos] = useState(currentLocation);

  const initialCenterRef = useRef(
    currentLocation ? [currentLocation.lat, currentLocation.lng] : DEFAULT_CENTER
  );
  const initialZoomRef = useRef(currentLocation ? 18 : 15);

  useEffect(() => {
    setCurrentPos(currentLocation);
  }, [currentLocation]);

  const eventHandlers = useMemo(() => ({
    dragend(e) {
      const marker = e.target;
      if (marker) {
        const position = marker.getLatLng();
        setCurrentPos(position);
        onLocationChange(position);
      }
    }
  }), [onLocationChange]);

  const handleMapClick = (latlng) => {
    setCurrentPos(latlng);
    onLocationChange(latlng);
  };

  return (
    <div style={mapShellStyle}>
      <SafeMapContainer
        center={initialCenterRef.current}
        zoom={initialZoomRef.current}
        minZoom={4.0}
        maxZoom={22.0}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        placeholder={(
          <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            Loading map...
          </div>
        )}
      >
        {/* Base Google satellite layer */}
        <TileLayer
          url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          subdomains={['0', '1', '2', '3']}
          maxZoom={22}
          attribution="&copy; Google Maps"
        />

        {/* Custom Drone overlay tiles */}
        {showDroneLayer && (
          <TileLayer
            url="https://cdn.skyjumper.in/skykids/tiles/{z}/{x}/{y}.jpg"
            maxZoom={22}
            attribution="&copy; Skyjumper Drone Tiles"
          />
        )}

        <CenterMap center={currentPos} />
        <MapEvents onMapClick={handleMapClick} />

        {/* Render other properties as static gray markers */}
        {otherProperties.map((prop) => {
          const lat = parseFloat(prop.latitude);
          const lng = parseFloat(prop.longitude);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={prop.id}
              position={[lat, lng]}
              icon={otherIcon}
            >
              <Tooltip direction="top" offset={[0, -20]}>
                <div><strong>Owner:</strong> {prop.owner_name || '—'}</div>
                <div><strong>House No:</strong> {prop.new_house_no || '—'} (Old: {prop.old_house_no || '—'})</div>
                <div><strong>Water Tank:</strong> {prop.watertank_present ? 'Yes' : 'No'}</div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Render current record location as draggable green marker */}
        {currentPos && (
          <Marker
            position={[currentPos.lat, currentPos.lng]}
            icon={currentIcon}
            draggable={true}
            eventHandlers={eventHandlers}
          >
            <Tooltip direction="top" offset={[0, -30]} permanent>
              <div style={{ fontWeight: 600, color: '#16a34a' }}>Drag to Adjust Location</div>
            </Tooltip>
          </Marker>
        )}
      </SafeMapContainer>
      
      {/* Help message overlay */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        right: '10px',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '8px 12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '12px',
        color: '#334155',
        pointerEvents: 'none',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>📍 Yellow pin is current property location. Red dots are other houses.</span>
<strong>Drag yellow pin or click on map to move.</strong>
      </div>
    </div>
  );
}
