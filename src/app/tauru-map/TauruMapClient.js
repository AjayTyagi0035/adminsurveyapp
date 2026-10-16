"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import SafeMapContainer from '../../components/SafeMapContainer'

const DEFAULT_CENTER = [28.2125, 76.9537];
const DEFAULT_ZOOM = 16;

// Tauru drone tiles are published for zoom 12–20 only; beyond 20 Leaflet upscales z20 tiles
const DRONE_MIN_ZOOM = 12;
const DRONE_MAX_NATIVE_ZOOM = 20;

// Transparent 1x1 GIF so failed tiles don't render as broken images
const EMPTY_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

export default function TauruMapClient({ showDroneLayer = true, onDroneError }) {
  const initialCenterRef = useRef(DEFAULT_CENTER);
  const initialZoomRef = useRef(DEFAULT_ZOOM);
  const [tileStats, setTileStats] = useState({ loaded: 0, failed: 0 });

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
      </SafeMapContainer>
    </div>
  );
}
