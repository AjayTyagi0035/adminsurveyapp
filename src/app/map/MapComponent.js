"use client"
import { useEffect, useRef } from 'react'
import { TileLayer, Marker, Tooltip, Popup, useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SafeMapContainer from '../../components/SafeMapContainer'

const DEFAULT_CENTER = [29.405678, 77.208220];
const DEFAULT_ZOOM = 14;

// Custom Red House Pin SVG as a data URL
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

function MapController({ center, zoom, bounds, onBoundsChange, setActivePopup }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom());
    }
  }, [center, zoom, map]);

  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);

  useEffect(() => {
    const handleMoveEnd = () => {
      const b = map.getBounds();
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      onBoundsChange({
        ne_lat: ne.lat,
        ne_lng: ne.lng,
        sw_lat: sw.lat,
        sw_lng: sw.lng
      });
    };

    map.on('moveend', handleMoveEnd);
    return () => {
      map.off('moveend', handleMoveEnd);
    };
  }, [map, onBoundsChange]);

  useEffect(() => {
    const clearPopup = () => {
      setActivePopup(null);
    };

    map.on('dragstart', clearPopup);
    map.on('zoomstart', clearPopup);

    return () => {
      map.off('dragstart', clearPopup);
      map.off('zoomstart', clearPopup);
    };
  }, [map, setActivePopup]);

  return null;
}

// Style configurations for each GIS layer
const mcStyle = {
  color: "#f43f5e", // Rose Red
  weight: 3,
  dashArray: "6, 6",
  fillOpacity: 0
};

const wardStyle = {
  color: "#eab308", // Yellow
  weight: 2.5,
  fillColor: "#fef08a",
  fillOpacity: 0.08
};

// Road colors keyed by normalized category string
const ROAD_COLORS = {
  'damber road': '#111111',
  'damber': '#111111',
  'brick road': '#c1440e',
  'brick': '#c1440e',
  'interlock light': '#4ade80',
  'interlock': '#4ade80',
  'cc road': '#38bdf8',
  'cc': '#38bdf8',
  'kachha road': '#6b3a2a',
  'kachha': '#6b3a2a',
};

function getRoadColor(category) {
  if (!category) return '#f59e0b';
  return ROAD_COLORS[category.trim().toLowerCase()] || '#f59e0b';
}

function getRoadStyle(feature) {
  return {
    color: getRoadColor(feature?.properties?.Category),
    weight: 2.5,
    fillOpacity: 0
  };
}

const cadastralStyle = {
  color: "#0cdefe", // Teal
  weight: 1,
  fillColor: "#2dd4bf",
  fillOpacity: 0.02
};

const onEachMcFeature = (feature, layer) => {
  layer.bindTooltip("Municipal Council Boundary (Kairana)", { sticky: true });
  layer.on({
    mouseover: (e) => {
      e.target.setStyle({ weight: 4, color: "#e11d48" });
    },
    mouseout: (e) => {
      e.target.setStyle(mcStyle);
    }
  });
};

const onEachWardFeature = (feature, layer) => {
  if (feature.properties && feature.properties.Name) {
    layer.bindTooltip(feature.properties.Name, { sticky: true });
  }
  layer.on({
    mouseover: (e) => {
      e.target.setStyle({
        weight: 3.5,
        fillOpacity: 0.25,
        color: "#ca8a04"
      });
    },
    mouseout: (e) => {
      e.target.setStyle(wardStyle);
    }
  });
};

const onEachRoadFeature = (feature, layer) => {
  if (feature.properties) {
    const { Category, Width, start_p, end_point } = feature.properties;
    const roadColor = getRoadColor(Category);
    const tooltipContent = `
      <div style="font-family: system-ui; font-size: 12px; padding: 4px; line-height: 1.4; color: #1e293b; background: white;">
        <strong style="color: ${roadColor}; display: block; font-size: 13px; margin-bottom: 2px;">Road Segment</strong>
        ${Category ? `<div><strong>Type:</strong> ${Category}</div>` : ''}
        ${Width ? `<div><strong>Width:</strong> ${Width}m</div>` : ''}
        ${start_p || end_point ? `<div><strong>Route:</strong> ${start_p || '—'} to ${end_point || '—'}</div>` : ''}
      </div>
    `;
    layer.bindTooltip(tooltipContent, { sticky: true, html: true });
  }
  layer.on({
    mouseover: (e) => {
      e.target.setStyle({
        weight: 4.5,
        opacity: 0.95
      });
    },
    mouseout: (e) => {
      e.target.setStyle(getRoadStyle(feature));
    }
  });
};

const onEachCadastralFeature = (feature, layer) => {
  if (feature.properties) {
    const { Kasra_Numb, Shape_Area } = feature.properties;
    const areaVal = Shape_Area ? Number(Shape_Area).toFixed(1) : null;
    const tooltipContent = `
      <div style="font-family: system-ui; font-size: 12px; padding: 4px; line-height: 1.4; color: #1e293b; background: white;">
        <strong style="color: #0d9488; display: block; font-size: 13px; margin-bottom: 2px;">Cadastral Plot (Khasra)</strong>
        <div><strong>Khasra No:</strong> ${Kasra_Numb || '—'}</div>
        ${areaVal ? `<div><strong>Area:</strong> ${areaVal} sq.m</div>` : ''}
      </div>
    `;
    layer.bindTooltip(tooltipContent, { sticky: true, html: true });
  }
  layer.on({
    mouseover: (e) => {
      e.target.setStyle({
        weight: 2.5,
        fillOpacity: 0.15,
        color: "#0f766e"
      });
    },
    mouseout: (e) => {
      e.target.setStyle(cadastralStyle);
    }
  });
};

export default function MapComponent({
  properties,
  mapCenter,
  mapZoom,
  mapBounds,
  activePopup,
  setActivePopup,
  loadingDetailsId,
  selectedSurvey,
  handleMarkerClick,
  onBoundsChange,
  showDroneLayer = true,
  showMcBoundary,
  mcBoundaryData,
  showWardBoundary,
  wardBoundaryData,
  showRoadDirectory,
  roadDirectoryData,
  showCadastralData,
  cadastralData,
}) {
  const initialCenterRef = useRef(mapCenter || DEFAULT_CENTER);
  const initialZoomRef = useRef(mapZoom || DEFAULT_ZOOM);

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
            url="https://cdn.skyjumper.in/skykids/tiles/{z}/{x}/{y}.jpg"
            maxZoom={22}
            attribution="&copy; Kairana Drone Tiles"
          />
        )}

        {/* GIS Layers */}
        {showMcBoundary && mcBoundaryData && (
          <GeoJSON
            key="gis-mc-boundary"
            data={mcBoundaryData}
            style={mcStyle}
            onEachFeature={onEachMcFeature}
          />
        )}

        {showWardBoundary && wardBoundaryData && (
          <GeoJSON
            key="gis-ward-boundary"
            data={wardBoundaryData}
            style={wardStyle}
            onEachFeature={onEachWardFeature}
          />
        )}

        {showRoadDirectory && roadDirectoryData && (
          <GeoJSON
            key="gis-road-directory"
            data={roadDirectoryData}
            style={getRoadStyle}
            onEachFeature={onEachRoadFeature}
          />
        )}

        {showCadastralData && cadastralData && (
          <GeoJSON
            key="gis-cadastral-data"
            data={cadastralData}
            style={cadastralStyle}
            onEachFeature={onEachCadastralFeature}
          />
        )}

        <MapController
          center={mapCenter}
          zoom={mapZoom}
          bounds={mapBounds}
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
              <div><strong>Owner Name:</strong> {prop.owner_name || '—'}</div>
              <div><strong>New House No:</strong> {prop.new_house_no || '—'}</div>
              <div><strong>Old House No:</strong> {prop.old_house_no || '—'}</div>
              <div><strong>Water Tank:</strong> {prop.watertank_present ? 'Yes' : 'No'}</div>
            </Tooltip>
          </Marker>
        ))}

        {activePopup && (
          <Popup
            position={[activePopup.latitude, activePopup.longitude]}
            autoPan={false}
            onClose={() => {
              setActivePopup(null);
            }}
          >
            {loadingDetailsId === activePopup.id ? (
              <div style={{ padding: 10, fontFamily: 'sans-serif' }}>Loading survey details...</div>
            ) : selectedSurvey && selectedSurvey.id === activePopup.id ? (
              <div style={{ padding: '4px 0', fontFamily: 'system-ui', color: '#1e293b', lineHeight: 1.4, minWidth: 240, maxWidth: 300 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: '#1e3a5f', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
                  {selectedSurvey.owner_name || 'Unnamed Owner'}
                </h3>
                <div style={{ fontSize: '12px', display: 'grid', gap: '4px', marginBottom: '10px' }}>
                  <div><strong>New House:</strong> {selectedSurvey.new_house_no || '—'}</div>
                  <div><strong>Old House:</strong> {selectedSurvey.old_house_no || '—'}</div>
                  <div><strong>Mobile:</strong> {selectedSurvey.mobile_no || '—'}</div>
                  <div><strong>Property Use:</strong> {selectedSurvey.property_use_as || '—'}</div>
                  <div><strong>Address:</strong> {selectedSurvey.address || '—'}</div>
                  <div><strong>Water Tank:</strong> {selectedSurvey.watertank_present ? 'Yes' : 'No'}</div>
                  <div><strong>Total House Tax:</strong> <span style={{ color: '#b91c1c', fontWeight: 600 }}>₹{selectedSurvey.total_house_tax || '0.00'}</span></div>
                  <div><strong>Total Water Tax:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>₹{selectedSurvey.total_water_tax || '0.00'}</span></div>
                </div>
                <div style={{ display: 'flex' }}>
                  <a
                    href={`/dashboard/records/${selectedSurvey.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ flex: 1, textAlign: 'center', background: '#1e3a5f', color: '#ffffff', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Edit Survey Record ↗
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ padding: 10, fontFamily: 'sans-serif' }}>Loading survey details...</div>
            )}
          </Popup>
        )}
      </SafeMapContainer>
    </div>
  );
}
