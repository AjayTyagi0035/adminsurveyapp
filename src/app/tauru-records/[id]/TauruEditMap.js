"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { TileLayer, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SafeMapContainer from '../../../components/SafeMapContainer'

// Same pins as the Records edit page (EditRecordMapComponent)
const CURRENT_PIN_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="38" height="38">
  <path fill="#facc15" d="M384 192c0 87.4-117 243-168.3 307.2c-12.3 15.3-35.1 15.3-47.4 0C117 435 0 279.4 0 192C0 86 86 0 192 0S384 86 384 192z"/>
  <path fill="#ffffff" d="M192 112L120 176v80h48v-48h48v48h48v-80L192 112z"/>
</svg>
`);

const OTHER_DOT_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
  <circle cx="6" cy="6" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
</svg>
`);

let currentIcon;
let otherIcon;
if (typeof window !== 'undefined') {
  currentIcon = L.icon({ iconUrl: CURRENT_PIN_SVG, iconSize: [38, 38], iconAnchor: [19, 38], tooltipAnchor: [0, -38] });
  otherIcon = L.icon({ iconUrl: OTHER_DOT_SVG, iconSize: [12, 12], iconAnchor: [6, 6], tooltipAnchor: [0, -6] });
}

const DEFAULT_CENTER = [28.2125, 76.9537]; // Tauru
const DRONE_MIN_ZOOM = 12;
const DRONE_MAX_NATIVE_ZOOM = 20;
const EMPTY_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

function MapEvents({ onMapClick }) {
  useMapEvents({ click(e) { onMapClick(e.latlng) } });
  return null;
}

// Centers on the record once, when its location first becomes known.
function CenterMap({ center }) {
  const map = useMap();
  const centeredRef = useRef(false);
  useEffect(() => {
    if (center && !centeredRef.current) {
      map.setView([center.lat, center.lng], 19);
      centeredRef.current = true;
    }
  }, [center, map]);
  return null;
}

const mapShellStyle = {
  width: '100%',
  height: '380px',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  marginTop: '12px',
};

export default function TauruEditMap({ currentLocation, otherProperties = [], onLocationChange, showDroneLayer = true }) {
  const [currentPos, setCurrentPos] = useState(currentLocation);
  const initialCenterRef = useRef(currentLocation ? [currentLocation.lat, currentLocation.lng] : DEFAULT_CENTER);
  const initialZoomRef = useRef(currentLocation ? 19 : 16);

  useEffect(() => {
    setCurrentPos(currentLocation);
  }, [currentLocation]);

  const eventHandlers = useMemo(() => ({
    dragend(e) {
      const position = e.target?.getLatLng();
      if (position) {
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
        minZoom={4}
        maxZoom={22}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
        placeholder={(
          <div style={{ width: '100%', height: '100%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            Loading map...
          </div>
        )}
      >
        <TileLayer
          url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          subdomains={['0', '1', '2', '3']}
          maxZoom={22}
          attribution="&copy; Google Maps"
        />

        {showDroneLayer && (
          <TileLayer
            url="https://cdn.omgauamrit.in/taurudrone/tilestauru/{z}/{x}/{y}.jpg"
            minZoom={DRONE_MIN_ZOOM}
            maxNativeZoom={DRONE_MAX_NATIVE_ZOOM}
            maxZoom={22}
            errorTileUrl={EMPTY_TILE}
            attribution="&copy; Tauru Drone Tiles"
          />
        )}

        <CenterMap center={currentPos} />
        <MapEvents onMapClick={handleMapClick} />

        {otherProperties.map(prop => (
          <Marker key={prop.id} position={[prop.latitude, prop.longitude]} icon={otherIcon}>
            <Tooltip direction="top" offset={[0, -20]}>
              <div><strong>Owner:</strong> {prop.ownerName || '—'}</div>
              <div><strong>House No:</strong> {prop.houseNo || '—'}</div>
              <div><strong>Ward:</strong> {prop.wardNoOrName || '—'}</div>
            </Tooltip>
          </Marker>
        ))}

        {currentPos && (
          <Marker
            position={[currentPos.lat, currentPos.lng]}
            icon={currentIcon}
            draggable={true}
            eventHandlers={eventHandlers}
            zIndexOffset={1000}
          >
            <Tooltip direction="top" offset={[0, -30]} permanent>
              <div style={{ fontWeight: 600, color: '#16a34a' }}>Drag to Adjust Location</div>
            </Tooltip>
          </Marker>
        )}
      </SafeMapContainer>

      <div style={{
        position: 'absolute', bottom: '10px', left: '10px', right: '10px',
        background: 'rgba(255, 255, 255, 0.95)', padding: '8px 12px', borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)', fontSize: '12px', color: '#334155',
        pointerEvents: 'none', zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
      }}>
        <span>📍 Yellow pin is this property{currentPos ? '' : ' (no location yet)'}. Red dots are other Tauru records.</span>
        <strong>{currentPos ? 'Drag yellow pin or click on map to move.' : 'Click on the map to set the location.'}</strong>
      </div>
    </div>
  );
}
