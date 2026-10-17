"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../dashboard/dashboard.module.css'

const FILTERS_STORAGE_KEY = 'adminsurveyapp.tauruRecords.filters'
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const EMPTY_FILTERS = {
  ward: '',
  mohalla: '',
  house_no: '',
  property_id: '',
  owner: '',
  mobile: '',
  start_date: '',
  end_date: '',
}

function readStoredState() {
  const fallback = { filters: EMPTY_FILTERS, page: 1, limit: 10 }
  if (typeof window === 'undefined') return fallback
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(FILTERS_STORAGE_KEY) ?? 'null')
    if (!parsed) return fallback
    return {
      filters: { ...EMPTY_FILTERS, ...parsed.filters },
      page: Math.max(1, Number(parsed.page) || 1),
      limit: PAGE_SIZE_OPTIONS.includes(Number(parsed.limit)) ? Number(parsed.limit) : 10,
    }
  } catch {
    return fallback
  }
}

/** Page numbers to show, with '…' gaps: 1 … 4 5 [6] 7 8 … 20 */
function pageList(page, totalPages) {
  const pages = new Set([1, totalPages, page - 2, page - 1, page, page + 1, page + 2])
  const sorted = [...pages].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b)
  const out = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`)
    out.push(p)
  })
  return out
}

function queryString(filters, extra = {}) {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (String(value ?? '').trim()) q.append(key, String(value).trim())
  }
  return q.toString()
}

export default function TauruRecordsPage() {
  const router = useRouter()
  const stored = readStoredState()
  const [filters, setFilters] = useState(stored.filters)
  const [page, setPage] = useState(stored.page)
  const [limit, setLimit] = useState(stored.limit)
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 })
  const [counts, setCounts] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const hasFilters = Object.values(filters).some(v => String(v).trim())

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function setFilter(key, value) {
    setFilters(current => ({ ...current, [key]: value }))
    setPage(1)
  }

  async function loadCounts() {
    try {
      const r = await fetch('/api/tauru/counts')
      if (r.ok) setCounts(await r.json())
    } catch {
      // Counts are informational only.
    }
  }

  async function loadRecords() {
    setLoading(true)
    try {
      const r = await fetch(`/api/tauru?${queryString(filters, { page, limit })}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to load records')
      setRecords(d.data ?? [])
      setPagination(d.pagination ?? { total: 0, total_pages: 1 })
      // Deleting the last row of the last page leaves us past the end.
      if (d.pagination && page > d.pagination.total_pages) setPage(d.pagination.total_pages)
    } catch (err) {
      setRecords([])
      showToast(err.message || 'Failed to load records', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCounts()
  }, [])

  useEffect(() => {
    try {
      window.sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({ filters, page, limit }))
    } catch {}
    const handle = setTimeout(loadRecords, 350)
    return () => clearTimeout(handle)
  }, [filters, page, limit])

  async function handleDelete() {
    setSaving(true)
    try {
      const r = await fetch(`/api/tauru/${modal.data.id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to delete', false)
      showToast('Record deleted')
      setModal(null)
      loadRecords()
      loadCounts()
    } finally {
      setSaving(false)
    }
  }

  function handleExport() {
    window.open(`/api/tauru/export?${queryString(filters)}`, '_blank')
  }

  const totalPages = pagination.total_pages || 1
  const firstRow = pagination.total === 0 ? 0 : (page - 1) * limit + 1
  const lastRow = Math.min(page * limit, pagination.total)

  const textFilter = (key, label, placeholder) => (
    <div className={styles.filterGroup}>
      <label className={styles.filterLabel}>{label}</label>
      <input
        type="text"
        className={styles.filterInput}
        placeholder={placeholder}
        value={filters[key]}
        onChange={e => setFilter(key, e.target.value)}
      />
    </div>
  )

  return (
    <>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Tauru Records</h1>
            <p className={styles.pageSubtitle}>District Nuh · ULB Tauru · Browse and manage submitted surveys</p>
          </div>
        </header>

        <div className={styles.filterRow} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {textFilter('ward', 'Ward No. / Name', 'Enter ward')}
          {textFilter('mohalla', 'Mohalla', 'Enter mohalla name')}
          {textFilter('house_no', 'House No', 'Enter house number')}
        </div>

        <div className={styles.filterRow} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {textFilter('property_id', 'Property ID', 'Enter property ID')}
          {textFilter('owner', 'Owner Name', 'Enter owner name')}
          {textFilter('mobile', 'Mobile No', 'Enter mobile number')}
        </div>

        <div className={styles.filterRow} style={{ gridTemplateColumns: '1fr 1fr 150px 150px' }}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Start Date</label>
            <input type="date" className={styles.filterInput} value={filters.start_date} onChange={e => setFilter('start_date', e.target.value)} />
          </div>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>End Date</label>
            <input type="date" className={styles.filterInput} value={filters.end_date} onChange={e => setFilter('end_date', e.target.value)} />
          </div>
          <div className={styles.filterGroup} style={{ justifyContent: 'flex-end' }}>
            <button className={styles.btnCancel} disabled={!hasFilters} onClick={() => { setFilters(EMPTY_FILTERS); setPage(1) }}>
              ✖ Clear Filters
            </button>
          </div>
          <div className={styles.filterGroup} style={{ justifyContent: 'flex-end' }}>
            <button className={styles.btnSave} onClick={handleExport}>📥 Export CSV</button>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{counts ? counts.total : '…'}</span>
            <span className={styles.statLabel}>Total Surveys</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{counts ? counts.today : '…'}</span>
            <span className={styles.statLabel}>Submitted Today</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{counts ? counts.surveyors : '…'}</span>
            <span className={styles.statLabel}>Surveyors</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{loading ? '…' : pagination.total}</span>
            <span className={styles.statLabel}>Current Search Count</span>
          </div>
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : records.length === 0 ? (
            <div className={styles.empty}>{hasFilters ? 'No records found.' : 'No records yet.'}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Ward</th>
                    <th>Mohalla</th>
                    <th>Property ID</th>
                    <th>House No</th>
                    <th>Owner</th>
                    <th>Mobile</th>
                    <th>Use</th>
                    <th>Surveyor</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.wardNoOrName}</td>
                      <td>{r.mohallaName}</td>
                      <td>{r.propertyId}</td>
                      <td>{r.houseNo}</td>
                      <td className={styles.tdName}>{r.ownerName}</td>
                      <td>{r.mobileNo}</td>
                      <td>{r.Useofhouse}</td>
                      <td>{r.submittedByName}</td>
                      <td>{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}</td>
                      <td className={styles.actions}>
                        <button className={styles.btnEdit} onClick={() => router.push(`/tauru-records/${r.id}`)}>✏️ View/Edit</button>
                        <button className={styles.btnDelete} onClick={() => setModal({ type: 'delete', data: r })}>🗑️ Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && pagination.total > 0 && (
            <div className={styles.pagination} style={{ flexWrap: 'wrap' }}>
              <span className={styles.paginationInfo}>
                Showing {firstRow}–{lastRow} of {pagination.total}
              </span>
              <button className={styles.btnEdit} disabled={page === 1} onClick={() => setPage(1)}>« First</button>
              <button className={styles.btnEdit} disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹ Prev</button>
              {pageList(page, totalPages).map(p =>
                typeof p === 'string' ? (
                  <span key={p} className={styles.paginationInfo}>…</span>
                ) : (
                  <button
                    key={p}
                    className={p === page ? styles.btnSave : styles.btnEdit}
                    style={p === page ? { padding: '5px 10px', fontSize: '12px' } : undefined}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
              <button className={styles.btnEdit} disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next ›</button>
              <button className={styles.btnEdit} disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last »</button>
              <select
                className={styles.filterSelect}
                style={{ width: 'auto', padding: '5px 8px' }}
                value={limit}
                onChange={e => { setLimit(Number(e.target.value)); setPage(1) }}
              >
                {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
              </select>
            </div>
          )}
        </div>
      </main>

      {toast && <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>}

      {modal?.type === 'delete' && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Delete Record</h2>
            <p className={styles.modalBody}>
              Permanently delete record #{modal.data.id} for house <strong>{modal.data.houseNo || '—'}</strong>
              {modal.data.ownerName ? <> ({modal.data.ownerName})</> : null}? This cannot be undone.
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
