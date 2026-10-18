"use client"
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import styles from '../dashboard/dashboard.module.css'

const SirsaAllMap = dynamic(() => import('./SirsaAllMapClient'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 'calc(100vh - 190px)', display: 'grid', placeItems: 'center', color: '#64748b' }}>Loading Sirsa map…</div>,
})

export default function SirsaMapPage() {
  const [records, setRecords] = useState([])
  const [wardFilter, setWardFilter] = useState('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    fetch('/api/sirsa/all-map')
      .then(response => response.json().then(data => ({ response, data })))
      .then(({ response, data }) => {
        if (!response.ok) throw new Error(data.error || 'Failed to load Sirsa map')
        if (active) setRecords(Array.isArray(data.data) ? data.data : [])
      })
      .catch(err => { if (active) setError(err.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filteredRecords = useMemo(() => {
    const ward = wardFilter.trim().toLowerCase()
    const propertyId = propertyFilter.trim().toLowerCase()

    return records.filter(record => {
      const recordWard = String(record.wardNoOrName ?? '').toLowerCase()
      const recordPropertyId = String(record.propertyId ?? '').toLowerCase()

      return (!ward || recordWard.includes(ward)) &&
        (!propertyId || recordPropertyId === propertyId)
    })
  }, [records, wardFilter, propertyFilter])

  return (
    <main className={styles.main} style={{ minWidth: 0 }}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Sirsa Map</h1>
          <p className={styles.pageSubtitle}>All mapped Sirsa survey submissions</p>
        </div>
        <div className={styles.statCard} style={{ minWidth: 120 }}>
          <span className={styles.statNum}>{loading ? '…' : filteredRecords.length}</span>
          <span className={styles.statLabel}>Mapped Points</span>
        </div>
      </header>

      {!loading && !error && records.length > 0 && <div className={styles.filterRow} style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="sirsa-ward-filter">Ward number</label>
          <input
            id="sirsa-ward-filter"
            className={styles.filterInput}
            value={wardFilter}
            placeholder="Search by ward number"
            onChange={event => setWardFilter(event.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="sirsa-property-filter">Property ID</label>
          <input
            id="sirsa-property-filter"
            className={styles.filterInput}
            value={propertyFilter}
            placeholder="Search property ID in the selected ward"
            onChange={event => setPropertyFilter(event.target.value)}
          />
        </div>
      </div>}

      {error ? <div className={styles.empty}>{error}</div> : !loading && records.length === 0 ? <div className={styles.empty}>No Sirsa records have valid coordinates.</div> : !loading && filteredRecords.length === 0 ? <div className={styles.empty}>No Sirsa records match the selected filters.</div> : <SirsaAllMap records={filteredRecords} />}
    </main>
  )
}
