"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../dashboard/dashboard.module.css'

export default function RecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadRecords() {
    setLoading(true)
    try {
      const url = searchQuery
        ? `/api/property-surveys/search?q=${searchQuery}`
        : '/api/property-surveys'
      const r = await fetch(url)
      const d = await r.json()
      setRecords(d.data ?? d ?? [])
    } catch {
      showToast('Failed to load records', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      loadRecords()
    }, 500)
    return () => clearTimeout(handler)
  }, [searchQuery])

  async function handleDelete() {
    if (modal.type === 'delete-record') {
      setSaving(true)
      try {
        const r = await fetch(`/api/property-surveys/${modal.data.id}`, { method: 'DELETE' })
        const d = await r.json()
        if (!r.ok) return showToast(d.error || 'Failed to delete', false)
        showToast('Record deleted')
        setModal(null)
        loadRecords()
      } finally { setSaving(false) }
    }
  }

  function openEditRecord(r) {
    router.push(`/dashboard/records/${r.id}`)
  }

  return (
    <>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Property Records</h1>
            <p className={styles.pageSubtitle}>Browse and manage submitted surveys</p>
          </div>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search by owner, mobile, house no…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </header>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{records.length}</span>
            <span className={styles.statLabel}>Total Records</span>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : records.length === 0 ? (
            <div className={styles.empty}>{searchQuery ? 'No records found.' : 'No records yet.'}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>House No</th>
                  <th>Owner</th>
                  <th>Mobile</th>
                  <th>Property Type</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>{r.new_house_no}</td>
                    <td className={styles.tdName}>{r.owner_name}</td>
                    <td>{r.mobile_no}</td>
                    <td>{r.property_type}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className={styles.actions}>
                      <button className={styles.btnEdit} onClick={() => openEditRecord(r)}>✏️ View/Edit</button>
                      <button className={styles.btnDelete} onClick={() => setModal({ type: 'delete-record', data: r })}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>
      )}

      {modal && modal.type === 'delete-record' && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Delete Record</h2>
            <p className={styles.modalBody}>
              Permanently delete record for house <strong>{modal.data.new_house_no}</strong>? This cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.btnCancel} onClick={() => setModal(null)}>Cancel</button>
              <button className={styles.btnDelete} disabled={saving} onClick={handleDelete}>
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
