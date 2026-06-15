"use client"
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import styles from './map.module.css'

// Dynamically import MapComponent to disable server side rendering (SSR) for Leaflet
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)', zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className={styles.spinner}></div>
      <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600', marginTop: '16px' }}>Initializing Map Engine...</div>
    </div>
  )
});

const MAP_ULB_ID = 1;

function buildMapApiUrl(params = {}) {
  const search = new URLSearchParams();
  if (params.ward_id) search.set('ward_id', params.ward_id);
  if (params.ne_lat != null) search.set('ne_lat', params.ne_lat);
  if (params.ne_lng != null) search.set('ne_lng', params.ne_lng);
  if (params.sw_lat != null) search.set('sw_lat', params.sw_lat);
  if (params.sw_lng != null) search.set('sw_lng', params.sw_lng);
  const query = search.toString();
  return `/api/property-surveys/map${query ? `?${query}` : ''}`;
}

export default function MapPage() {
  const [properties, setProperties] = useState([]);
  const [visibleProperties, setVisibleProperties] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedWardId, setSelectedWardId] = useState('');
  const [loadingWards, setLoadingWards] = useState(false);
  const [showDroneLayer, setShowDroneLayer] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [toast, setToast] = useState(null);

  // Leaflet map controller states
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);

  // Active popup and details state
  const [activePopup, setActivePopup] = useState(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [viewportBounds, setViewportBounds] = useState(null);

  const fitBoundsDoneRef = useRef(false);
  const viewportFetchTimerRef = useRef(null);
  const inFlightViewportRequestRef = useRef(null);
  const lastViewportRequestKeyRef = useRef('');

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const normalizeBounds = (bounds) => {
    if (!bounds) return null;

    const { ne_lat, ne_lng, sw_lat, sw_lng } = bounds;
    const values = [ne_lat, ne_lng, sw_lat, sw_lng].map(Number);
    if (values.some(value => Number.isNaN(value))) return null;

    const [neLat, neLng, swLat, swLng] = values;
    return {
      ne_lat: Math.max(neLat, swLat),
      ne_lng: Math.max(neLng, swLng),
      sw_lat: Math.min(neLat, swLat),
      sw_lng: Math.min(neLng, swLng)
    };
  };

  const getVisibleProperties = (bounds, sourceProperties = properties) => {
    const normalized = normalizeBounds(bounds);
    if (!normalized) return [];

    const { ne_lat, ne_lng, sw_lat, sw_lng } = normalized;
    return sourceProperties.filter(p => {
      const latitude = Number(p.latitude);
      const longitude = Number(p.longitude);

      return !Number.isNaN(latitude) && !Number.isNaN(longitude) &&
        latitude >= sw_lat && latitude <= ne_lat &&
        longitude >= sw_lng && longitude <= ne_lng;
    });
  };

  const requestViewportProperties = (bounds, wardId = selectedWardId) => {
    const normalized = normalizeBounds(bounds);
    if (!normalized) return;

    const requestKey = [wardId || 'all', normalized.ne_lat, normalized.ne_lng, normalized.sw_lat, normalized.sw_lng]
      .map(value => Number(value).toFixed(5))
      .join('|');

    if (requestKey === lastViewportRequestKeyRef.current) {
      return;
    }

    lastViewportRequestKeyRef.current = requestKey;

    if (viewportFetchTimerRef.current) {
      clearTimeout(viewportFetchTimerRef.current);
    }

    viewportFetchTimerRef.current = setTimeout(async () => {
      if (inFlightViewportRequestRef.current) {
        inFlightViewportRequestRef.current.abort();
      }

      const controller = new AbortController();
      inFlightViewportRequestRef.current = controller;

      try {
        const url = buildMapApiUrl({
          ward_id: wardId || undefined,
          ne_lat: normalized.ne_lat,
          ne_lng: normalized.ne_lng,
          sw_lat: normalized.sw_lat,
          sw_lng: normalized.sw_lng,
        });
        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) {
          throw new Error(`Map viewport request failed (${res.status})`);
        }

        const newProps = await res.json();

        setProperties(prev => {
          const existingMap = new Map(prev.map(p => [p.id, p]));
          let updated = false;

          for (const prop of newProps) {
            if (!existingMap.has(prop.id)) {
              existingMap.set(prop.id, prop);
              updated = true;
            }
          }

          return updated ? Array.from(existingMap.values()) : prev;
        });

        setMapError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Lazy load failed:', err);
          setMapError('Unable to refresh map data for the current view.');
        }
      } finally {
        if (inFlightViewportRequestRef.current === controller) {
          inFlightViewportRequestRef.current = null;
        }
      }
    }, 250);
  };

  const loadInitialProperties = async (wardId = selectedWardId) => {
    try {
      const res = await fetch(buildMapApiUrl({ ward_id: wardId || undefined }));
      if (!res.ok) throw new Error('Failed to fetch property survey locations');
      const data = await res.json();
      setProperties(data);
      setVisibleProperties(data);
      setMapError(null);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError(err.message);
      setLoading(false);
    }
  };

  const loadWards = async () => {
    setLoadingWards(true);
    try {
      const res = await fetch(`/api/locations/ulbs/${MAP_ULB_ID}/wards`);
      if (!res.ok) throw new Error('Failed to fetch wards');
      const data = await res.json();
      setWards(data.wards ?? []);
    } catch (err) {
      console.error(err);
      setMapError('Failed to load wards.');
    } finally {
      setLoadingWards(false);
    }
  };

  useEffect(() => {
    loadWards();
  }, []);

  useEffect(() => {
    fitBoundsDoneRef.current = false;
    lastViewportRequestKeyRef.current = '';
    setProperties([]);
    setVisibleProperties([]);
    setMapBounds(null);
    setActivePopup(null);
    setSelectedSurvey(null);
    setLoading(true);
    loadInitialProperties(selectedWardId);
  }, [selectedWardId]);

  useEffect(() => {
    return () => {
      if (viewportFetchTimerRef.current) {
        clearTimeout(viewportFetchTimerRef.current);
      }

      if (inFlightViewportRequestRef.current) {
        inFlightViewportRequestRef.current.abort();
      }
    };
  }, []);

  // Compute and set bounds initially when properties load
  useEffect(() => {
    if (!fitBoundsDoneRef.current && properties.length > 0) {
      const lats = properties.map(p => p.latitude);
      const lngs = properties.map(p => p.longitude);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      setMapBounds([[minLat, minLng], [maxLat, maxLng]]);
      fitBoundsDoneRef.current = true;
    }
  }, [properties]);

  useEffect(() => {
    if (!viewportBounds) return;
    setVisibleProperties(getVisibleProperties(viewportBounds));
  }, [viewportBounds, properties]);

  // Handle bounds/viewport changes for lazy loading and stats
  const handleBoundsChange = async (bounds) => {
    const normalized = normalizeBounds(bounds);
    if (!normalized) return;

    setViewportBounds(normalized);
    setVisibleProperties(getVisibleProperties(normalized));
    requestViewportProperties(normalized);
  };

  // Fetch full details from database on marker click
  const handleMarkerClick = (prop) => {
    setLoadingDetailsId(prop.id);
    setSelectedSurvey(null);

    fetch(`/api/property-surveys/${prop.id}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to load details");
        return res.json();
      })
      .then(data => {
        setSelectedSurvey(data.survey);
        setLoadingDetailsId(null);
      })
      .catch(err => {
        console.error(err);
        setLoadingDetailsId(null);
      });
  };

  // Search location/owner/house_no
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim().toLowerCase();

    // Search locally in loaded properties first
    const localMatch = properties.find(p => {
      return (p.owner_name && p.owner_name.toLowerCase().includes(query)) ||
             (p.new_house_no && p.new_house_no.toLowerCase() === query) ||
             (p.old_house_no && p.old_house_no.toLowerCase() === query);
    });

    if (localMatch) {
      setMapCenter([localMatch.latitude, localMatch.longitude]);
      setMapZoom(19);
      setActivePopup(localMatch);
      handleMarkerClick(localMatch);
      showToast(`Found property for "${searchQuery}"`);
      return;
    }

    // Geocode via OSM Nominatim
    try {
      showToast("Searching location...");
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setMapCenter([parseFloat(lat), parseFloat(lon)]);
        setMapZoom(16);
        showToast(`Centered on ${display_name.split(',')[0]}`);
      } else {
        showToast("Location not found", false);
      }
    } catch (err) {
      console.error(err);
      showToast("Geocoding failed", false);
    }
  };

  // Center on property when clicked in sidebar list
  const handlePropItemClick = (prop) => {
    setMapCenter([prop.latitude, prop.longitude]);
    setMapZoom(19);
    setActivePopup(prop);
    handleMarkerClick(prop);
  };

  if (error) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorText}>Error: {error}</div>
        <button className={styles.retryBtn} onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* GIS Sidebar Panel */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>🗺️ Survey Map</h2>
          <p className={styles.sidebarSubtitle}>GIS-based property analytics</p>
        </div>

        <div className={styles.searchSection}>
          <label className={styles.filterLabel} htmlFor="map-ward-filter">Ward</label>
          <select
            id="map-ward-filter"
            value={selectedWardId}
            onChange={e => setSelectedWardId(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">{loadingWards ? 'Loading wards…' : 'All wards'}</option>
            {wards.map(ward => (
              <option key={ward.id} value={ward.id}>
                Ward {ward.ward_no}
              </option>
            ))}
          </select>
          <div className={styles.sidebarToggle}>
    <label className={styles.droneToggleSidebar}>
      <input
        type="checkbox"
        checked={showDroneLayer}
        onChange={e => setShowDroneLayer(e.target.checked)}
      />
      <span>🛰️ Drone Imagery</span>
    </label>
  </div>

          <form onSubmit={handleSearch} className={styles.searchBox}>
            <input
              type="text"
              placeholder="Search house no, owner, or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchBtn}>🔍</button>
          </form>
        </div>

        {mapError && (
          <div style={{ margin: '0 20px 16px', padding: '10px 12px', borderRadius: '10px', background: '#fff1f2', color: '#9f1239', fontSize: '12px', fontWeight: 600 }}>
            {mapError}
          </div>
        )}

        <div className={styles.statsSection}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {loading ? '...' : properties.length}
            </div>
            <div className={styles.statLabel}>Total Locations</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>
              {loading ? '...' : visibleProperties.length}
            </div>
            <div className={styles.statLabel}>In Viewport</div>
          </div>
        </div>

        <div className={styles.listSection}>
          <h3 className={styles.listTitle}>Properties in current view</h3>
          {loading ? (
            <div className={styles.emptyList}>Loading properties...</div>
          ) : visibleProperties.length === 0 ? (
            <div className={styles.emptyList}>
              No properties in view.<br />Pan or zoom out to locate.
            </div>
          ) : (
            <div className={styles.visibleList}>
              {visibleProperties.slice(0, 100).map(prop => (
                <div
                  key={prop.id}
                  className={styles.propItem}
                  onClick={() => handlePropItemClick(prop)}
                >
                  <div className={styles.propHeader}>
                    <span className={styles.propName}>
                      {prop.owner_name || 'Unnamed Owner'}
                    </span>
                    <span className={styles.propId}>#{prop.id}</span>
                  </div>
                  <div className={styles.propDetail}>
                    House: {prop.new_house_no || '—'} (Old: {prop.old_house_no || '—'})
                  </div>
                  <div className={styles.propDetail}>
                    Water tank: {prop.watertank_present ? 'Yes' : 'No'}
                  </div>
                </div>
              ))}
              {visibleProperties.length > 100 && (
                <div style={{ textAlign: 'center', padding: '8px', fontSize: '11px', color: '#64748b' }}>
                  Showing 100 of {visibleProperties.length} properties...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map Window */}
      <div className={styles.mapWrapper}>
        <div className={styles.mapOverlayControl}>
          <button className={styles.backBtn} onClick={() => window.location.href = '/dashboard'}>
            ← Back to Dashboard
          </button>
        </div>

        <MapComponent
          properties={properties}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          mapBounds={mapBounds}
          activePopup={activePopup}
          setActivePopup={setActivePopup}
          loadingDetailsId={loadingDetailsId}
          selectedSurvey={selectedSurvey}
          handleMarkerClick={handleMarkerClick}
          onBoundsChange={handleBoundsChange}
          showDroneLayer={showDroneLayer}
        />
      </div>

      {/* Toasts */}
      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
