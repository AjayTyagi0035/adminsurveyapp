"use client"
import { useState } from 'react'
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

export default function TauruMapPage() {
  const [showDroneLayer, setShowDroneLayer] = useState(true);
  const [layersExpanded, setLayersExpanded] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [droneError, setDroneError] = useState(null);

  return (
    <div className={styles.container}>
      {/* ── Map Area ── */}
      <div className={styles.mapWrapper}>
        <TauruMap showDroneLayer={showDroneLayer} onDroneError={setDroneError} />

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
              <p className={styles.sidebarSubtitle}>Tauru drone imagery</p>
            </div>
            <button className={styles.sidebarCloseBtn} onClick={() => setSidebarOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>

        <div className={styles.sidebarScroll}>

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
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
