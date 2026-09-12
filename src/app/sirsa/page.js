"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../dashboard/dashboard.module.css'

export default function SirsaPage() {
  const router = useRouter()
  const [records, setRecords] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [deleteRecord, setDeleteRecord] = useState(null)

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadRecords() {
    setLoading(true)
    try {
      const query = new URLSearchParams({ page: String(page), limit: '10' })
      if (search.trim()) query.set('search', search.trim())
      const response = await fetch(`/api/sirsa?${query}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load Sirsa records')
      setRecords(data.data ?? [])
      setPagination(data.pagination ?? { total: 0, total_pages: 1 })
    } catch (err) {
      showToast(err.message, false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(loadRecords, 250)
    return () => clearTimeout(timer)
  }, [page, search])

  async function handleDelete() {
    try {
      const response = await fetch(`/api/sirsa/${deleteRecord.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to delete record')
      setDeleteRecord(null)
      showToast('Sirsa record deleted')
      loadRecords()
    } catch (err) {
      showToast(err.message, false)
    }
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Sirsa Records</h1>
          <p className={styles.pageSubtitle}>Browse and manage records from surveyor_s_submissions</p>
        </div>
      </header>

      <div className={styles.filterRow} style={{ gridTemplateColumns: 'minmax(260px, 1fr) 150px' }}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Search</label>
          <input className={styles.filterInput} value={search} placeholder="Mohalla, house no, owner or property ID" onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{loading ? '…' : pagination.total}</span>
          <span className={styles.statLabel}>Total Records</span>
        </div>
      </div>

      <div className={styles.tableWrap}>
        {loading ? <div className={styles.empty}>Loading…</div> : records.length === 0 ? <div className={styles.empty}>No Sirsa records found.</div> : (
          <table className={styles.table}>
            <thead><tr><th>Property ID</th><th>House No</th><th>Mohalla</th><th>Owner</th><th>Ward</th><th>Submitted At</th><th>Actions</th></tr></thead>
            <tbody>
              {records.map(record => (
                <tr key={String(record.id)}>
                  <td>{record.propertyId || '—'}</td>
                  <td>{record.houseNo || '—'}</td>
                  <td>{record.mohallaName || '—'}</td>
                  <td className={styles.tdName}>{record.ownerName || '—'}</td>
                  <td>{record.wardNoOrName || '—'}</td>
                  <td>{record.submittedAt || '—'}</td>
                  <td className={styles.actions}>
                    <button className={styles.btnEdit} onClick={() => router.push(`/sirsa/${record.id}`)}>✏️ View/Edit</button>
                    <button className={styles.btnDelete} onClick={() => setDeleteRecord(record)}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && pagination.total_pages > 1 && <div className={styles.pagination}>
          <button className={styles.btnEdit} disabled={page === 1} onClick={() => setPage(value => value - 1)}>Prev</button>
          <span className={styles.paginationInfo}>Page {page} of {pagination.total_pages}</span>
          <button className={styles.btnEdit} disabled={page >= pagination.total_pages} onClick={() => setPage(value => value + 1)}>Next</button>
        </div>}
      </div>

      {toast && <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>}
      {deleteRecord && <div className={styles.overlay} onClick={() => setDeleteRecord(null)}><div className={styles.modalCard} onClick={e => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>Delete Sirsa Record</h2>
        <p className={styles.modalBody}>Permanently delete the record for <strong>{deleteRecord.ownerName || deleteRecord.houseNo || deleteRecord.id}</strong>?</p>
        <div className={styles.modalActions}><button className={styles.btnCancel} onClick={() => setDeleteRecord(null)}>Cancel</button><button className={styles.btnDelete} onClick={handleDelete}>Delete</button></div>
      </div></div>}
    </main>
  )
}