"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { TileLayer, Marker, Tooltip, Popup, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SafeMapContainer from '../../components/SafeMapContainer'

const DEFAULT_CENTER = [28.2125, 76.9537];
const DEFAULT_ZOOM = 16;

// Tauru drone tiles are published for zoom 12–20 only; beyond 20 Leaflet upscales z20 tiles
const DRONE_MIN_ZOOM = 12;
const DRONE_MAX_NATIVE_ZOOM = 20;
const EXPANDED_BOUNDARY_URL = 'https://cdn.omgauamrit.in/geojsonfiles/expanded_boundary.geojson';
const BUILTUP_POLYGONS_URL = 'https://cdn.omgauamrit.in/geojsonfiles/Tauru_Builtup.geojson';

// Transparent 1x1 GIF so failed tiles don't render as broken images
const EMPTY_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// Same red dot marker as the Map View tab
const DOT_SVG = `data:image/svg+xml;utf8,` + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12">
  <circle cx="6" cy="6" r="5" fill="#ea4335" stroke="#ffffff" stroke-width="1"/>
</svg>
`);

let customIcon;
if (typeof window !== 'undefined') {
  customIcon = L.icon({
    iconUrl: DOT_SVG,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6]
  });
}

function MapController({ center, zoom, onBoundsChange, setActivePopup }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

  useEffect(() => {
    const handleMoveEnd = () => {
      const b = map.getBounds();
      onBoundsChange({
        ne_lat: b.getNorthEast().lat,
        ne_lng: b.getNorthEast().lng,
        sw_lat: b.getSouthWest().lat,
        sw_lng: b.getSouthWest().lng,
      });
    };
    map.on('moveend', handleMoveEnd);
    handleMoveEnd();
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);

  useEffect(() => {
    const clearPopup = () => setActivePopup(null);
    map.on('dragstart', clearPopup);
    map.on('zoomstart', clearPopup);
    return () => {
      map.off('dragstart', clearPopup);
      map.off('zoomstart', clearPopup);
    };
  }, [map, setActivePopup]);

  return null;
}

export default function TauruMapClient({
  showDroneLayer = true,
  onDroneError,
  showExpandedBoundary = true,
  onBoundaryError,
  showBuiltupPolygons = true,
  onBuiltupError,
  properties = [],
  mapCenter,
  mapZoom,
  activePopup,
  setActivePopup,
  loadingDetailsId,
  selectedRecord,
  handleMarkerClick,
  onBoundsChange,
}) {
  const initialCenterRef = useRef(DEFAULT_CENTER);
  const initialZoomRef = useRef(DEFAULT_ZOOM);
  const [tileStats, setTileStats] = useState({ loaded: 0, failed: 0 });
  const [expandedBoundary, setExpandedBoundary] = useState(null);
  const [builtupPolygons, setBuiltupPolygons] = useState(null);

  const droneEventHandlers = useMemo(() => ({
    tileload: (e) => {
      if (e.tile?.src === EMPTY_TILE) return;
      setTileStats(prev => ({ ...prev, loaded: prev.loaded + 1 }));
    },
    tileerror: () => setTileStats(prev => ({ ...prev, failed: prev.failed + 1 })),
  }), []);

  const droneUnavailable = tileStats.failed > 0 && tileStats.loaded === 0;

  useEffect(() => {
    if (onDroneError) {
      onDroneError(droneUnavailable ? 'Drone imagery could not be loaded. Please try again later.' : null);
    }
  }, [droneUnavailable, onDroneError]);

  useEffect(() => {
    let cancelled = false;
    fetch(EXPANDED_BOUNDARY_URL)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load expanded boundary');
        return res.json();
      })
      .then(data => {
        if (!cancelled) {
          setExpandedBoundary(data);
          if (onBoundaryError) onBoundaryError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error(err);
          if (onBoundaryError) onBoundaryError('Expanded boundary could not be loaded. Please try again later.');
        }
      });
    return () => { cancelled = true; };
  }, [onBoundaryError]);

  useEffect(() => {
    let cancelled = false;
    fetch(BUILTUP_POLYGONS_URL)
      .then(res => {
        if (!res.ok) throw new Error('Failed to load built-up polygons');
        return res.json();
      })
      .then(data => {
        if (!cancelled) {
          setBuiltupPolygons(data);
          if (onBuiltupError) onBuiltupError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          console.error(err);
          if (onBuiltupError) onBuiltupError('Built-up polygons could not be loaded. Please try again later.');
        }
      });
    return () => { cancelled = true; };
  }, [onBuiltupError]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SafeMapContainer
        center={initialCenterRef.current}
        zoom={initialZoomRef.current}
        style={{ width: '100%', height: '100%' }}
        zoomControl={true}
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
            eventHandlers={droneEventHandlers}
            attribution="&copy; Tauru Drone Tiles"
          />
        )}

        {showExpandedBoundary && expandedBoundary && (
          <GeoJSON
            key="expanded-boundary"
            data={expandedBoundary}
            style={{ color: '#f59e0b', weight: 3, opacity: 1, fillColor: '#f59e0b', fillOpacity: 0.08 }}
          />
        )}

        {showBuiltupPolygons && builtupPolygons && (
          <GeoJSON
            key="builtup-polygons"
            data={builtupPolygons}
            style={{ color: '#22c55e', weight: 1.5, opacity: 0.9, fillColor: '#22c55e', fillOpacity: 0.2 }}
          />
        )}

        <MapController
          center={mapCenter}
          zoom={mapZoom}
          onBoundsChange={onBoundsChange}
          setActivePopup={setActivePopup}
        />

        {properties.map(prop => (
          <Marker
            key={prop.id}
            position={[prop.latitude, prop.longitude]}
            icon={customIcon}
            eventHandlers={{
              click: () => {
                setActivePopup(prop);
                handleMarkerClick(prop);
              }
            }}
          >
            <Tooltip direction="top" offset={[0, -30]} opacity={1}>
              <div><strong>Owner Name:</strong> {prop.ownerName || '—'}</div>
              <div><strong>House No:</strong> {prop.houseNo || '—'}</div>
              <div><strong>Property ID:</strong> {prop.propertyId || '—'}</div>
              <div><strong>Ward:</strong> {prop.wardNoOrName || '—'}</div>
              {prop.submittedAt && (
                <div><strong>Submitted:</strong> {new Date(prop.submittedAt).toLocaleDateString()}</div>
              )}
            </Tooltip>
          </Marker>
        ))}

        {activePopup && (
          <Popup
            position={[activePopup.latitude, activePopup.longitude]}
            autoPan={false}
            onClose={() => setActivePopup(null)}
          >
            {loadingDetailsId === activePopup.id || !selectedRecord || String(selectedRecord.id) !== String(activePopup.id) ? (
              <div style={{ padding: 10, fontFamily: 'sans-serif' }}>Loading survey details...</div>
            ) : (
              <div style={{ padding: '4px 0', fontFamily: 'system-ui', color: '#1e293b', lineHeight: 1.4, minWidth: 240, maxWidth: 300 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#1e3a5f', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  {selectedRecord.ownerName || 'Unnamed Owner'}
                </h3>
                <div style={{ fontSize: '12px', display: 'grid', gap: '4px', marginBottom: '10px' }}>
                  <div><strong>House No:</strong> {selectedRecord.houseNo || '—'}</div>
                  <div><strong>Property ID:</strong> {selectedRecord.propertyId || '—'}</div>
                  <div><strong>Ward / Mohalla:</strong> {selectedRecord.wardNoOrName || '—'} / {selectedRecord.mohallaName || '—'}</div>
                  <div><strong>Mobile:</strong> {selectedRecord.mobileNo || '—'}</div>
                  <div><strong>Use of House:</strong> {selectedRecord.Useofhouse || '—'}</div>
                  <div><strong>Address:</strong> {selectedRecord.address || '—'}</div>
                  <div><strong>Total Built-up:</strong> {selectedRecord.totalBuiltUpArea != null ? `${selectedRecord.totalBuiltUpArea} sq ft` : '—'}</div>
                  <div><strong>Surveyor:</strong> {selectedRecord.submittedByName || '—'}</div>
                </div>
                <div style={{ display: 'flex' }}>
                  <a
                    href={`/tauru-records/${selectedRecord.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ flex: 1, textAlign: 'center', background: '#1e3a5f', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Edit Survey Record ↗
                  </a>
                </div>
              </div>
            )}
          </Popup>
        )}
      </SafeMapContainer>
    </div>
  );
}
