"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import styles from '../map/map.module.css'

// Dynamically import TauruMapClient to disable server side rendering (SSR) for Leaflet
const TauruMap = dynamic(() => import('./TauruMapClient'), {
  ssr: false,
  loading: () => (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,15,25,0.85)', zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className={styles.spinner}></div>
      <div style={{ color: '#fff', fontSize: '15px', fontWeight: '600', marginTop: '16px' }}>Initializing Map Engine...</div>
    </div>
  )
});

const EMPTY_FILTERS = { ward: '', mohalla: '', q: '', date: '' }
const LIST_LIMIT = 100

function inBounds(prop, b) {
  return b &&
    prop.latitude >= b.sw_lat && prop.latitude <= b.ne_lat &&
    prop.longitude >= b.sw_lng && prop.longitude <= b.ne_lng
}

export default function TauruMapPage() {
  const [showDroneLayer, setShowDroneLayer] = useState(true);
  const [showExpandedBoundary, setShowExpandedBoundary] = useState(true);
  const [showBuiltupPolygons, setShowBuiltupPolygons] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [layersExpanded, setLayersExpanded] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [droneError, setDroneError] = useState(null);
  const [boundaryError, setBoundaryError] = useState(null);
  const [builtupError, setBuiltupError] = useState(null);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapError, setMapError] = useState(null);
  const [viewportBounds, setViewportBounds] = useState(null);

  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(null);
  const [activePopup, setActivePopup] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState(null);
  const requestIdRef = useRef(0);

  const hasActiveFilter = Object.values(filters).some(v => v.trim());

  function setFilter(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const handle = setTimeout(async () => {
      setLoading(true);
      setMapError(null);
      try {
        const q = new URLSearchParams();
        if (filters.ward.trim()) q.set('ward', filters.ward.trim());
        if (filters.mohalla.trim()) q.set('mohalla', filters.mohalla.trim());
        if (filters.q.trim()) q.set('q', filters.q.trim());
        if (filters.date) { q.set('start_date', filters.date); q.set('end_date', filters.date); }
        const res = await fetch(`/api/tauru/map?${q.toString()}`);
        if (!res.ok) throw new Error('Failed to load Tauru records');
        const data = await res.json();
        if (requestId !== requestIdRef.current) return;
        setProperties(Array.isArray(data) ? data : []);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setProperties([]);
        setMapError(err.message);
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [filters]);

  const visibleProperties = useMemo(
    () => (viewportBounds ? properties.filter(p => inBounds(p, viewportBounds)) : properties),
    [properties, viewportBounds]
  );

  const handleBoundsChange = useCallback((bounds) => setViewportBounds(bounds), []);

  function handleMarkerClick(prop) {
    setLoadingDetailsId(prop.id);
    setSelectedRecord(null);
    fetch(`/api/tauru/${prop.id}`)
      .then(res => { if (!res.ok) throw new Error('Failed to load details'); return res.json(); })
      .then(data => { setSelectedRecord(data.record); setLoadingDetailsId(null); })
      .catch(err => { console.error(err); setLoadingDetailsId(null); });
  }

  function handlePropItemClick(prop) {
    setMapCenter([prop.latitude, prop.longitude]);
    setMapZoom(19);
    setActivePopup(prop);
    handleMarkerClick(prop);
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
    setActivePopup(null);
    setSelectedRecord(null);
  }

  const searchInput = (key, icon, label, placeholder, type = 'text') => (
    <div className={styles.filterSection}>
      <div className={styles.sectionStaticHeader}>
        <span className={styles.sectionIcon}>{icon}</span>
        <span className={styles.sectionLabel}>{label}</span>
      </div>
      <div className={styles.sectionContent}>
        <div className={styles.searchBox}>
          <input
            type={type}
            placeholder={placeholder}
            value={filters[key]}
            onChange={e => setFilter(key, e.target.value)}
            className={styles.searchInput}
          />
          {filters[key] && (
            <button type="button" onClick={() => setFilter(key, '')} className={styles.searchClearBtn}>✕</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {/* ── Map Area ── */}
      <div className={styles.mapWrapper}>
        <TauruMap
          showDroneLayer={showDroneLayer}
          onDroneError={setDroneError}
          showExpandedBoundary={showExpandedBoundary}
          onBoundaryError={setBoundaryError}
          showBuiltupPolygons={showBuiltupPolygons}
          onBuiltupError={setBuiltupError}
          properties={showMarkers ? properties : []}
          mapCenter={mapCenter}
          mapZoom={mapZoom}
          activePopup={activePopup}
          setActivePopup={setActivePopup}
          loadingDetailsId={loadingDetailsId}
          selectedRecord={selectedRecord}
          handleMarkerClick={handleMarkerClick}
          onBoundsChange={handleBoundsChange}
        />

        {!sidebarOpen && (
          <div className={styles.topBar}>
            <div className={styles.topBarRight}>
              <button className={styles.sidebarToggleBtn} onClick={() => setSidebarOpen(true)}>
                🌐 Layers
              </button>
            </div>
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
              <p className={styles.sidebarSubtitle}>Tauru survey records &amp; drone imagery</p>
            </div>
            <button className={styles.sidebarCloseBtn} onClick={() => setSidebarOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        <div className={styles.sidebarScroll}>

          {searchInput('ward', '📋', 'Ward No. / Name', 'Enter ward...')}
          {searchInput('mohalla', '🏘️', 'Mohalla', 'Enter mohalla name...')}
          {searchInput('q', '🏠', 'House No / Owner / Property ID', 'Search...')}
          {searchInput('date', '📅', 'Submitted Date', '', 'date')}

          {/* ── Clear all ── */}
          {hasActiveFilter && (
            <div className={styles.filterActions}>
              <button className={styles.clearBtn} onClick={handleClearFilters}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                Clear All Filters
              </button>
            </div>
          )}

          {/* ── Stats ── */}
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
                {showDroneLayer && droneError && <div className={styles.mapErrorBanner}>{droneError}</div>}
                <label className={`${styles.layerToggleItem} ${showExpandedBoundary ? styles.layerActive : ''}`}>
                  <input type="checkbox" checked={showExpandedBoundary} onChange={e => setShowExpandedBoundary(e.target.checked)} className={styles.layerCheckbox} />
                  <span className={styles.layerDot} style={{ background: '#f59e0b' }}></span>
                  <span className={styles.layerName}>🗺️ Expanded Boundary</span>
                </label>
                {showExpandedBoundary && boundaryError && <div className={styles.mapErrorBanner}>{boundaryError}</div>}
                <label className={`${styles.layerToggleItem} ${showBuiltupPolygons ? styles.layerActive : ''}`}>
                  <input type="checkbox" checked={showBuiltupPolygons} onChange={e => setShowBuiltupPolygons(e.target.checked)} className={styles.layerCheckbox} />
                  <span className={styles.layerDot} style={{ background: '#22c55e' }}></span>
                  <span className={styles.layerName}>🏘️ Built-up Polygons</span>
                </label>
                {showBuiltupPolygons && builtupError && <div className={styles.mapErrorBanner}>{builtupError}</div>}
                <label className={`${styles.layerToggleItem} ${showMarkers ? styles.layerActive : ''}`}>
                  <input type="checkbox" checked={showMarkers} onChange={e => setShowMarkers(e.target.checked)} className={styles.layerCheckbox} />
                  <span className={styles.layerDot} style={{ background: '#ea4335' }}></span>
                  <span className={styles.layerName}>📍 Survey Records</span>
                </label>
              </div>
            )}
          </div>

          {/* ── Properties in View ── */}
          <div className={styles.filterSection}>
            <div className={styles.sectionStaticHeader}>
              <span className={styles.sectionLabel}>Properties in View</span>
              {visibleProperties.length > 0 && (
                <span className={styles.selectedBadge}>{Math.min(visibleProperties.length, LIST_LIMIT)}</span>
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
                  {properties.length === 0
                    ? (hasActiveFilter ? 'No records match these filters.' : 'No Tauru records with GPS yet.')
                    : <>No properties in current view.<br />Pan or zoom to see more.</>}
                </div>
              ) : (
                <div className={styles.visibleList}>
                  {visibleProperties.slice(0, LIST_LIMIT).map(prop => (
                    <div
                      key={prop.id}
                      className={`${styles.propItem} ${activePopup?.id === prop.id ? styles.propItemActive : ''}`}
                      onClick={() => handlePropItemClick(prop)}
                    >
                      <div className={styles.propHeader}>
                        <span className={styles.propName}>{prop.ownerName || 'Unnamed Owner'}</span>
                        <span className={styles.propId}>#{prop.id}</span>
                      </div>
                      <div className={styles.propDetail}>
                        🏠 {prop.houseNo || '—'} {prop.propertyId ? `(ID: ${prop.propertyId})` : ''}
                      </div>
                      <div className={styles.propDetail}>
                        📋 Ward {prop.wardNoOrName || '—'}{prop.mohallaName ? ` · ${prop.mohallaName}` : ''}
                      </div>
                      {prop.submittedAt && (
                        <div className={styles.propDetail}>
                          📅 Submitted: {new Date(prop.submittedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                  {visibleProperties.length > LIST_LIMIT && (
                    <div className={styles.moreProperties}>
                      Showing {LIST_LIMIT} of {visibleProperties.length} properties
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
