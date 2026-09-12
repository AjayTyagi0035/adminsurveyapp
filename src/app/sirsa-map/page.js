"use client"
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import styles from '../dashboard/dashboard.module.css'

const SirsaAllMap = dynamic(() => import('./SirsaAllMapClient'), {
  ssr: false,
  loading: () => <div style={{ minHeight: 'calc(100vh - 190px)', display: 'grid', placeItems: 'center', color: '#64748b' }}>Loading Sirsa map…</div>,
})

export default function SirsaMapPage() {
  const [records, setRecords] = useState([])
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

  return (
    <main className={styles.main} style={{ minWidth: 0 }}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Sirsa Map</h1>
          <p className={styles.pageSubtitle}>All mapped Sirsa survey submissions</p>
        </div>
        <div className={styles.statCard} style={{ minWidth: 120 }}>
          <span className={styles.statNum}>{loading ? '…' : records.length}</span>
          <span className={styles.statLabel}>Mapped Points</span>
        </div>
      </header>

      {error ? <div className={styles.empty}>{error}</div> : !loading && records.length === 0 ? <div className={styles.empty}>No Sirsa records have valid coordinates.</div> : <SirsaAllMap records={records} />}
    </main>
  )
}
