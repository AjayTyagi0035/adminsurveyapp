"use client"
import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import styles from './map.module.css'

// Dynamically import MapComponent to disable server side rendering (SSR) for Leaflet
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,15,25,0.85)', zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className={styles.spinner}></div>
      <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600', marginTop: '16px' }}>Initializing Map Engine...</div>
    </div>
  )
});

const MAP_ULB_ID = 1;

// Supports multiple ward IDs as an array
function buildMapApiUrl(params = {}) {
  const search = new URLSearchParams();
  // ward_ids is an array — append each as a separate ward_id param
  if (params.ward_ids && params.ward_ids.length > 0) {
    params.ward_ids.forEach(id => search.append('ward_id', id));
  }
  if (params.new_house_no) search.set('new_house_no', params.new_house_no);
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
  // Multi-select: array of selected ward IDs (as strings)
  const [selectedWardIds, setSelectedWardIds] = useState([]);
  const [houseNoInput, setHouseNoInput] = useState('');
  const [searchHouseNo, setSearchHouseNo] = useState('');
  const [loadingWards, setLoadingWards] = useState(false);
  const [showDroneLayer, setShowDroneLayer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [toast, setToast] = useState(null);

  // Sidebar section expand/collapse — wards CLOSED by default
  const [wardsExpanded, setWardsExpanded] = useState(false);
  const [layersExpanded, setLayersExpanded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // GIS Overlays & Boundaries
  const [showMcBoundary, setShowMcBoundary] = useState(false);
  const [showWardBoundary, setShowWardBoundary] = useState(false);
  const [showRoadDirectory, setShowRoadDirectory] = useState(false);
  const [showCadastralData, setShowCadastralData] = useState(false);

  const [mcBoundaryData, setMcBoundaryData] = useState(null);
  const [wardBoundaryData, setWardBoundaryData] = useState(null);
  const [roadDirectoryData, setRoadDirectoryData] = useState(null);
  const [cadastralData, setCadastralData] = useState(null);

  const [loadingLayers, setLoadingLayers] = useState({
    mc: false, ward: false, road: false, cadastral: false,
  });

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

  // Whether any ward is selected — drives the "show data" toggle
  const hasWardSelected = selectedWardIds.length > 0;

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleMcBoundary = async () => {
    if (!showMcBoundary && !mcBoundaryData) {
      setLoadingLayers(prev => ({ ...prev, mc: true }));
      try {
        const res = await fetch('/21-06-26/mc_boundary_kairana.geojson');
        if (!res.ok) throw new Error();
        setMcBoundaryData(await res.json());
      } catch {
        showToast("Failed to load Municipal boundary", false);
      } finally {
        setLoadingLayers(prev => ({ ...prev, mc: false }));
      }
    }
    setShowMcBoundary(prev => !prev);
  };

  const toggleWardBoundary = async () => {
    if (!showWardBoundary && !wardBoundaryData) {
      setLoadingLayers(prev => ({ ...prev, ward: true }));
      try {
        const res = await fetch('/21-06-26/ward_boundary_kairana.geojson');
        if (!res.ok) throw new Error();
        setWardBoundaryData(await res.json());
      } catch {
        showToast("Failed to load Ward boundary", false);
      } finally {
        setLoadingLayers(prev => ({ ...prev, ward: false }));
      }
    }
    setShowWardBoundary(prev => !prev);
  };

  const toggleRoadDirectory = async () => {
    if (!showRoadDirectory && !roadDirectoryData) {
      setLoadingLayers(prev => ({ ...prev, road: true }));
      try {
        const res = await fetch('/21-06-26/Road_Directory_kairana.geojson');
        if (!res.ok) throw new Error();
        setRoadDirectoryData(await res.json());
      } catch {
        showToast("Failed to load Road Directory", false);
      } finally {
        setLoadingLayers(prev => ({ ...prev, road: false }));
      }
    }
    setShowRoadDirectory(prev => !prev);
  };

  const toggleCadastralData = async () => {
    if (!showCadastralData && !cadastralData) {
      setLoadingLayers(prev => ({ ...prev, cadastral: true }));
      try {
        const res = await fetch('/21-06-26/Kairana_Cadastral_data.geojson');
        if (!res.ok) throw new Error();
        setCadastralData(await res.json());
      } catch {
        showToast("Failed to load Cadastral data", false);
      } finally {
        setLoadingLayers(prev => ({ ...prev, cadastral: false }));
      }
    }
    setShowCadastralData(prev => !prev);
  };

  const normalizeBounds = (bounds) => {
    if (!bounds) return null;
    const { ne_lat, ne_lng, sw_lat, sw_lng } = bounds;
    const values = [ne_lat, ne_lng, sw_lat, sw_lng].map(Number);
    if (values.some(v => Number.isNaN(v))) return null;
    const [neLat, neLng, swLat, swLng] = values;
    return {
      ne_lat: Math.max(neLat, swLat),
      ne_lng: Math.max(neLng, swLng),
      sw_lat: Math.min(neLat, swLat),
      sw_lng: Math.min(neLng, swLng),
    };
  };

  const getVisibleProperties = (bounds, sourceProperties = properties) => {
    const normalized = normalizeBounds(bounds);
    if (!normalized) return [];
    const { ne_lat, ne_lng, sw_lat, sw_lng } = normalized;
    return sourceProperties.filter(p => {
      const lat = Number(p.latitude);
      const lng = Number(p.longitude);
      return !Number.isNaN(lat) && !Number.isNaN(lng) &&
        lat >= sw_lat && lat <= ne_lat &&
        lng >= sw_lng && lng <= ne_lng;
    });
  };

  const requestViewportProperties = (bounds, wardIds = selectedWardIds, houseNo = searchHouseNo) => {
    if (wardIds.length === 0) return;       // don't fetch when no ward selected
    const normalized = normalizeBounds(bounds);
    if (!normalized) return;

    const requestKey = [
      wardIds.sort().join(',') || 'all',
      houseNo || 'all',
      normalized.ne_lat, normalized.ne_lng,
      normalized.sw_lat, normalized.sw_lng,
    ].map(v => (typeof v === 'number' ? v.toFixed(5) : String(v))).join('|');

    if (requestKey === lastViewportRequestKeyRef.current) return;
    lastViewportRequestKeyRef.current = requestKey;

    if (viewportFetchTimerRef.current) clearTimeout(viewportFetchTimerRef.current);

    viewportFetchTimerRef.current = setTimeout(async () => {
      if (inFlightViewportRequestRef.current) inFlightViewportRequestRef.current.abort();
      const controller = new AbortController();
      inFlightViewportRequestRef.current = controller;

      try {
        const url = buildMapApiUrl({
          ward_ids: wardIds.length > 0 ? wardIds : undefined,
          new_house_no: houseNo || undefined,
          ne_lat: normalized.ne_lat,
          ne_lng: normalized.ne_lng,
          sw_lat: normalized.sw_lat,
          sw_lng: normalized.sw_lng,
        });
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Map viewport request failed (${res.status})`);
        const newProps = await res.json();
        setProperties(prev => {
          const existing = new Map(prev.map(p => [p.id, p]));
          let updated = false;
          for (const prop of newProps) {
            if (!existing.has(prop.id)) { existing.set(prop.id, prop); updated = true; }
          }
          return updated ? Array.from(existing.values()) : prev;
        });
        setMapError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Lazy load failed:', err);
          setMapError('Unable to refresh map data for the current view.');
        }
      } finally {
        if (inFlightViewportRequestRef.current === controller) inFlightViewportRequestRef.current = null;
      }
    }, 250);
  };

  const loadInitialProperties = async (wardIds, houseNo) => {
    try {
      const res = await fetch(buildMapApiUrl({
        ward_ids: wardIds && wardIds.length > 0 ? wardIds : undefined,
        new_house_no: houseNo || undefined,
      }));
      if (!res.ok) throw new Error('Failed to fetch property survey locations');
      const data = await res.json();
      setProperties(data);
      setVisibleProperties(data);
      setMapError(null);
      setLoading(false);

      if (houseNo && data.length > 0) {
        const match = data.find(p =>
          p.new_house_no && p.new_house_no.trim().toLowerCase() === houseNo.trim().toLowerCase()
        ) || data[0];
        if (match.latitude && match.longitude) {
          setMapCenter([match.latitude, match.longitude]);
          setMapZoom(19);
          setActivePopup(match);
          handleMarkerClick(match);
          showToast(`Found property for house number "${houseNo}"`);
        }
      } else if (houseNo && data.length === 0) {
        showToast(`No properties found for house number "${houseNo}"`, false);
      }
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

  useEffect(() => { loadWards(); }, []);

  // Reload whenever ward selection or house search changes
  // Only fires when at least one ward is selected
  useEffect(() => {
    if (selectedWardIds.length === 0 && !searchHouseNo) {
      // No ward selected → clear map
      setProperties([]);
      setVisibleProperties([]);
      setMapBounds(null);
      setActivePopup(null);
      setSelectedSurvey(null);
      fitBoundsDoneRef.current = false;
      lastViewportRequestKeyRef.current = '';
      return;
    }
    fitBoundsDoneRef.current = false;
    lastViewportRequestKeyRef.current = '';
    setProperties([]);
    setVisibleProperties([]);
    setMapBounds(null);
    setActivePopup(null);
    setSelectedSurvey(null);
    setLoading(true);
    loadInitialProperties(selectedWardIds, searchHouseNo);
  }, [selectedWardIds, searchHouseNo]);

  useEffect(() => {
    return () => {
      if (viewportFetchTimerRef.current) clearTimeout(viewportFetchTimerRef.current);
      if (inFlightViewportRequestRef.current) inFlightViewportRequestRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (!fitBoundsDoneRef.current && properties.length > 0) {
      const lats = properties.map(p => p.latitude);
      const lngs = properties.map(p => p.longitude);
      setMapBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]);
      fitBoundsDoneRef.current = true;
    }
  }, [properties]);

  useEffect(() => {
    if (!viewportBounds) return;
    setVisibleProperties(getVisibleProperties(viewportBounds));
  }, [viewportBounds, properties]);

  const handleBoundsChange = (bounds) => {
    const normalized = normalizeBounds(bounds);
    if (!normalized) return;
    setViewportBounds(normalized);
    setVisibleProperties(getVisibleProperties(normalized));
    requestViewportProperties(normalized);
  };

  function handleMarkerClick(prop) {
    setLoadingDetailsId(prop.id);
    setSelectedSurvey(null);
    fetch(`/api/property-surveys/${prop.id}`)
      .then(res => { if (!res.ok) throw new Error("Failed to load details"); return res.json(); })
      .then(data => { setSelectedSurvey(data.survey); setLoadingDetailsId(null); })
      .catch(err => { console.error(err); setLoadingDetailsId(null); });
  }

  // Toggle a single ward in/out of selectedWardIds
  const handleWardToggle = (wardId) => {
    const id = String(wardId);
    setSelectedWardIds(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
    // Clear house search when wards change
    setHouseNoInput('');
    setSearchHouseNo('');
  };

  const handleClearFilters = () => {
    setSelectedWardIds([]);
    setHouseNoInput('');
    setSearchHouseNo('');
    setProperties([]);
    setVisibleProperties([]);
    setActivePopup(null);
    setSelectedSurvey(null);
    fitBoundsDoneRef.current = false;
    lastViewportRequestKeyRef.current = '';
  };

  const handleHouseSearch = (e) => {
    if (e) e.preventDefault();
    if (!hasWardSelected) {
      showToast('Please select a ward first', false);
      return;
    }
    setSearchHouseNo(houseNoInput.trim());
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim().toLowerCase();
    const localMatch = properties.find(p =>
      (p.owner_name && p.owner_name.toLowerCase().includes(query)) ||
      (p.new_house_no && p.new_house_no.toLowerCase() === query) ||
      (p.old_house_no && p.old_house_no.toLowerCase() === query)
    );
    if (localMatch) {
      setMapCenter([localMatch.latitude, localMatch.longitude]);
      setMapZoom(19);
      setActivePopup(localMatch);
      handleMarkerClick(localMatch);
      showToast(`Found property for "${searchQuery}"`);
      return;
    }
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

  const handlePropItemClick = (prop) => {
    setMapCenter([prop.latitude, prop.longitude]);
    setMapZoom(19);
    setActivePopup(prop);
    handleMarkerClick(prop);
  };

  // Build readable label for selected wards
  const selectedWardLabel = selectedWardIds.length === 0
    ? null
    : selectedWardIds.length === 1
      ? `Ward ${wards.find(w => String(w.id) === selectedWardIds[0])?.ward_no ?? selectedWardIds[0]}`
      : `${selectedWardIds.length} Wards`;

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
      {/* ── Map Area ── */}
      <div className={styles.mapWrapper}>
        {/* Empty state — shown when no ward selected */}

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
          showMcBoundary={showMcBoundary}
          mcBoundaryData={mcBoundaryData}
          showWardBoundary={showWardBoundary}
          wardBoundaryData={wardBoundaryData}
          showRoadDirectory={showRoadDirectory}
          roadDirectoryData={roadDirectoryData}
          showCadastralData={showCadastralData}
          cadastralData={cadastralData}
        />

        {/* Loading overlay */}
        {loading && hasWardSelected && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <span>Loading properties...</span>
          </div>
        )}
      </div>

      {/* ── Right Sidebar ── */}
      <div className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarHidden : ''}`}>

        {/* Header */}
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarHeaderTop}>
            <div>
              <h2 className={styles.sidebarTitle}>Filters &amp; Layers</h2>
              <p className={styles.sidebarSubtitle}>Narrow down your map view</p>
            </div>
            <button className={styles.sidebarCloseBtn} onClick={() => setSidebarOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        <div className={styles.sidebarScroll}>

          {/* ── Ward Selection (collapsed by default) ── */}
          <div className={styles.filterSection}>
            <button
              className={styles.sectionToggleBtn}
              onClick={() => setWardsExpanded(prev => !prev)}
            >
              <div className={styles.sectionToggleLeft}>
                <span className={styles.sectionIcon}>🏘️</span>
                <span className={styles.sectionLabel}>Ward Selection</span>
                {selectedWardIds.length > 0 && (
                  <span className={styles.selectedBadge}>{selectedWardIds.length}</span>
                )}
              </div>
              <span className={`${styles.chevron} ${wardsExpanded ? styles.chevronUp : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </span>
            </button>

            {wardsExpanded && (
              <div className={styles.sectionContent}>
                {loadingWards ? (
                  <div className={styles.wardLoadingState}>
                    <div className={styles.smallSpinner}></div>
                    <span>Loading wards...</span>
                  </div>
                ) : wards.length === 0 ? (
                  <div className={styles.wardEmptyState}>No wards available</div>
                ) : (
                  <div className={styles.wardGrid}>
                    {wards.map(ward => {
                      const id = String(ward.id);
                      const isSelected = selectedWardIds.includes(id);
                      return (
                        <label
                          key={ward.id}
                          className={`${styles.wardCheckItem} ${isSelected ? styles.wardCheckItemSelected : ''}`}
                        >
                          <input
                            type="checkbox"
                            className={styles.wardCheckbox}
                            checked={isSelected}
                            onChange={() => handleWardToggle(ward.id)}
                          />
                          <span className={styles.wardCheckLabel}>Ward {ward.ward_no}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedWardIds.length > 0 && (
                  <button className={styles.clearWardsBtn} onClick={() => setSelectedWardIds([])}>
                    Clear selection
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── House Number Search ── */}
          <div className={styles.filterSection}>
            <div className={styles.sectionStaticHeader}>
              <span className={styles.sectionIcon}>🏠</span>
              <span className={styles.sectionLabel}>House Number</span>
            </div>
            <div className={styles.sectionContent}>
              <form onSubmit={handleHouseSearch} className={styles.searchBox}>
                <input
                  id="map-house-filter"
                  type="text"
                  placeholder={hasWardSelected ? "Enter house number..." : "Select a ward first..."}
                  value={houseNoInput}
                  onChange={e => setHouseNoInput(e.target.value)}
                  className={styles.searchInput}
                  disabled={!hasWardSelected}
                />
                {houseNoInput && (
                  <button
                    type="button"
                    onClick={() => { setHouseNoInput(''); setSearchHouseNo(''); }}
                    className={styles.searchClearBtn}
                  >✕</button>
                )}
                <button type="submit" className={styles.searchIconBtn} disabled={!hasWardSelected}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </button>
              </form>
            </div>
          </div>

          {/* ── Clear all ── */}
          {hasWardSelected && (
            <div className={styles.filterActions}>
              <button className={styles.clearBtn} onClick={handleClearFilters}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Clear All Filters
              </button>
            </div>
          )}

          {/* ── Stats (only when wards are selected) ── */}
          {hasWardSelected && (
            <div className={styles.statsRow}>
              <div className={styles.statPill}>
                <span className={styles.statPillVal}>{loading ? '…' : properties.length}</span>
                <span className={styles.statPillLabel}>Total</span>
              </div>
              <div className={styles.statPillDivider}></div>
              <div className={styles.statPill}>
                <span className={styles.statPillVal}>{loading ? '…' : visibleProperties.length}</span>
                <span className={styles.statPillLabel}>In View</span>
              </div>
            </div>
          )}

          {/* ── GIS Layers ── */}
          <div className={styles.filterSection}>
            <button
              className={styles.sectionToggleBtn}
              onClick={() => setLayersExpanded(prev => !prev)}
            >
              <div className={styles.sectionToggleLeft}>
                <span className={styles.sectionIcon}>🌐</span>
                <span className={styles.sectionLabel}>GIS Layers</span>
              </div>
              <span className={`${styles.chevron} ${layersExpanded ? styles.chevronUp : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </span>
            </button>

            {layersExpanded && (
              <div className={styles.sectionContent}>
                <label className={`${styles.layerToggleItem} ${showDroneLayer ? styles.layerActive : ''}`}>
                  <input type="checkbox" checked={showDroneLayer} onChange={e => setShowDroneLayer(e.target.checked)} className={styles.layerCheckbox} />
                  <span className={styles.layerDot} style={{ background: '#a78bfa' }}></span>
                  <span className={styles.layerName}>🛰️ Drone Imagery</span>
                </label>
                <label className={`${styles.layerToggleItem} ${showMcBoundary ? styles.layerActive : ''}`}>
                  <input type="checkbox" checked={showMcBoundary} onChange={toggleMcBoundary} disabled={loadingLayers.mc} className={styles.layerCheckbox} />
                  <span className={styles.layerDot} style={{ background: '#f43f5e' }}></span>
                  <span className={styles.layerName}>🏛️ Municipal Boundary</span>
                  {loadingLayers.mc && <span className={styles.smallSpinner}></span>}
                </label>
                <label className={`${styles.layerToggleItem} ${showWardBoundary ? styles.layerActive : ''}`}>
                  <input type="checkbox" checked={showWardBoundary} onChange={toggleWardBoundary} disabled={loadingLayers.ward} className={styles.layerCheckbox} />
                  <span className={styles.layerDot} style={{ background: '#eab308' }}></span>
                  <span className={styles.layerName}>📋 Ward Boundary</span>
                  {loadingLayers.ward && <span className={styles.smallSpinner}></span>}
                </label>
                <label className={`${styles.layerToggleItem} ${showRoadDirectory ? styles.layerActive : ''}`}>
                  <input type="checkbox" checked={showRoadDirectory} onChange={toggleRoadDirectory} disabled={loadingLayers.road} className={styles.layerCheckbox} />
                  <span className={styles.layerDot} style={{ background: 'linear-gradient(135deg, #111 25%, #c1440e 50%, #38bdf8 75%, #6b3a2a 100%)' }}></span>
                  <span className={styles.layerName}>🛣️ Road Directory</span>
                  {loadingLayers.road && <span className={styles.smallSpinner}></span>}
                </label>
                {showRoadDirectory && (
                  <div style={{ paddingLeft: '28px', paddingBottom: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {[
                      { color: '#111111', label: 'Damber Road' },
                      { color: '#c1440e', label: 'Brick Road' },
                      { color: '#4ade80', label: 'Interlock Light' },
                      { color: '#38bdf8', label: 'CC Road' },
                      { color: '#6b3a2a', label: 'Kachha Road' },
                    ].map(({ color, label }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                        <span style={{ width: '18px', height: '3px', background: color, borderRadius: '2px', flexShrink: 0 }} />
                        {label}
                      </div>
                    ))}
                  </div>
                )}
                <label className={`${styles.layerToggleItem} ${showCadastralData ? styles.layerActive : ''}`}>
                  <input type="checkbox" checked={showCadastralData} onChange={toggleCadastralData} disabled={loadingLayers.cadastral} className={styles.layerCheckbox} />
                  <span className={styles.layerDot} style={{ background: '#14b8a6' }}></span>
                  <span className={styles.layerName}>🗺️ Cadastral / Plot Data</span>
                  {loadingLayers.cadastral && <span className={styles.smallSpinner}></span>}
                </label>
              </div>
            )}
          </div>

          {/* ── Properties in View (only when wards selected) ── */}
          {hasWardSelected && (
            <div className={styles.filterSection}>
              <div className={styles.sectionStaticHeader}>
                <span className={styles.sectionLabel}>Properties in View</span>
                {visibleProperties.length > 0 && (
                  <span className={styles.selectedBadge}>{Math.min(visibleProperties.length, 100)}</span>
                )}
              </div>
              <div className={styles.sectionContent} style={{ padding: 0 }}>
                {mapError && <div className={styles.mapErrorBanner}>{mapError}</div>}
                {loading ? (
                  <div className={styles.listLoading}>
                    <div className={styles.smallSpinner}></div>
                    <span>Loading properties...</span>
                  </div>
                ) : visibleProperties.length === 0 ? (
                  <div className={styles.emptyList}>
                    No properties in current view.<br />Pan or zoom to see more.
                  </div>
                ) : (
                  <div className={styles.visibleList}>
                    {visibleProperties.slice(0, 100).map(prop => (
                      <div
                        key={prop.id}
                        className={`${styles.propItem} ${activePopup?.id === prop.id ? styles.propItemActive : ''}`}
                        onClick={() => handlePropItemClick(prop)}
                      >
                        <div className={styles.propHeader}>
                          <span className={styles.propName}>{prop.owner_name || 'Unnamed Owner'}</span>
                          <span className={styles.propId}>#{prop.id}</span>
                        </div>
                        <div className={styles.propDetail}>
                          🏠 {prop.new_house_no || '—'} {prop.old_house_no ? `(Old: ${prop.old_house_no})` : ''}
                        </div>
                        <div className={styles.propDetail}>
                          💧 Water tank: {prop.watertank_present ? 'Yes' : 'No'}
                        </div>
                      </div>
                    ))}
                    {visibleProperties.length > 100 && (
                      <div className={styles.moreProperties}>
                        Showing 100 of {visibleProperties.length} properties
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
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
