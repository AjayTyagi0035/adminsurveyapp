"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../dashboard/dashboard.module.css'
import { OPTIONS, STATUS_LABELS, mediaUrl } from './options'

const FILTERS_STORAGE_KEY = 'adminsurveyapp.streetVending.filters'
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

const EMPTY_FILTERS = {
  municipality: '',
  zone: '',
  ward: '',
  street: '',
  name: '',
  mobile: '',
  application_no: '',
  id_card_no: '',
  nature_of_business: '',
  status: '',
  start_date: '',
  end_date: '',
}

const STATUS_STYLE = {
  draft: { background: '#fff7ed', color: '#c2410c' },
  submitted: { background: '#e0e7ff', color: '#3730a3' },
  idIssued: { background: '#f0fdf4', color: '#15803d' },
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

export default function StreetVendingPage() {
  const router = useRouter()
  const [stored] = useState(readStoredState)
  const [filters, setFilters] = useState(stored.filters)
  const [page, setPage] = useState(stored.page)
  const [limit, setLimit] = useState(stored.limit)
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 })
  const [counts, setCounts] = useState(null)
  const [choices, setChoices] = useState({ municipalities: [], zones: [], wards: [] })
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
    setFilters(current => {
      const next = { ...current, [key]: value }
      // Narrower dropdowns depend on the wider ones.
      if (key === 'municipality') { next.zone = ''; next.ward = '' }
      if (key === 'zone') next.ward = ''
      return next
    })
    setPage(1)
  }

  function loadCounts() {
    fetch('/api/street-vending/counts')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setCounts(d))
      .catch(() => {}) // Counts are informational only.
  }

  async function loadRecords() {
    setLoading(true)
    try {
      const r = await fetch(`/api/street-vending?${queryString(filters, { page, limit })}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to load vendors')
      setRecords(d.data ?? [])
      setPagination(d.pagination ?? { total: 0, total_pages: 1 })
      if (d.pagination && page > d.pagination.total_pages) setPage(d.pagination.total_pages)
    } catch (err) {
      setRecords([])
      showToast(err.message || 'Failed to load vendors', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCounts()
  }, [])

  useEffect(() => {
    const q = queryString({ municipality: filters.municipality, zone: filters.zone })
    fetch(`/api/street-vending/filters?${q}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setChoices(d))
      .catch(() => {})
  }, [filters.municipality, filters.zone])

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
      const r = await fetch(`/api/street-vending/${modal.data.id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to delete', false)
      showToast('Vendor deleted')
      setModal(null)
      loadRecords()
      loadCounts()
    } finally {
      setSaving(false)
    }
  }

  async function handleIssue(record) {
    setSaving(true)
    try {
      const r = await fetch(`/api/street-vending/${record.id}/issue`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to generate ID card', false)
      showToast(`ID card ${d.record.id_card_no} generated`)
      loadRecords()
      loadCounts()
    } finally {
      setSaving(false)
    }
  }

  function openPrint(id, doc) {
    window.open(`/street-vending/print/${doc}/${id}`, '_blank')
  }

  function handleExport() {
    window.open(`/api/street-vending/export?${queryString(filters)}`, '_blank')
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

  const selectFilter = (key, label, options, allLabel, format = o => o) => {
    // Keep a stored value selectable even if it is no longer in the list.
    const list = filters[key] && !options.includes(filters[key]) ? [filters[key], ...options] : options
    return (
      <div className={styles.filterGroup}>
        <label className={styles.filterLabel}>{label}</label>
        <select className={styles.filterSelect} value={filters[key]} onChange={e => setFilter(key, e.target.value)}>
          <option value="">{allLabel}</option>
          {list.map(o => <option key={o} value={o}>{format(o)}</option>)}
        </select>
      </div>
    )
  }

  return (
    <>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Street Vendors</h1>
            <p className={styles.pageSubtitle}>Search registrations, edit records, generate and print Form II and ID cards</p>
          </div>
        </header>

        <div className={styles.filterRow} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {selectFilter('municipality', 'Municipality', choices.municipalities, 'All municipalities')}
          {selectFilter('zone', 'Zone', choices.zones, 'All zones')}
          {selectFilter('ward', 'Ward', choices.wards, 'All wards')}
          {textFilter('street', 'Street / Vending Place', 'Street, landmark or place')}
        </div>

        <div className={styles.filterRow} style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {textFilter('name', 'Vendor Name', 'Enter name')}
          {textFilter('mobile', 'Mobile No', 'Enter mobile number')}
          {textFilter('application_no', 'Application No', 'APP/…')}
          {textFilter('id_card_no', 'ID Card No', 'SV/…')}
        </div>

        <div className={styles.filterRow} style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr 150px 150px' }}>
          {selectFilter('nature_of_business', 'Nature of Business', OPTIONS.nature_of_business, 'All businesses')}
          {selectFilter('status', 'Status', OPTIONS.status, 'All statuses', s => STATUS_LABELS[s] ?? s)}
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
            <span className={styles.statLabel}>Total Vendors</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{counts ? counts.issued : '…'}</span>
            <span className={styles.statLabel}>ID Cards Issued</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{counts ? counts.drafts : '…'}</span>
            <span className={styles.statLabel}>Drafts</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{counts ? counts.today : '…'}</span>
            <span className={styles.statLabel}>Registered Today</span>
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
            <div className={styles.empty}>{hasFilters ? 'No vendors found.' : 'No vendors registered yet.'}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Photo</th>
                    <th>Vendor</th>
                    <th>Mobile</th>
                    <th>Zone / Ward</th>
                    <th>Business</th>
                    <th>Application / ID No.</th>
                    <th>Status</th>
                    <th>Surveyor</th>
                    <th>Registered</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>
                        {r.passport_photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaUrl(r.passport_photo)} alt="" loading="lazy" style={{ width: 36, height: 44, objectFit: 'cover', borderRadius: 4, border: '1px solid #e5e7eb' }} />
                        ) : (
                          <span style={{ color: '#9ca3af' }}>—</span>
                        )}
                      </td>
                      <td className={styles.tdName}>{r.full_name || '(no name)'}</td>
                      <td>{r.mobile_no}</td>
                      <td>{[r.zone_name, r.ward_name].filter(Boolean).join(' / ') || '—'}</td>
                      <td style={{ maxWidth: 180 }}>{r.nature_of_business}</td>
                      <td style={{ fontSize: 12 }}>
                        {r.application_no || '—'}
                        <br />
                        <span style={{ color: '#6b7280' }}>{r.id_card_no || ''}</span>
                      </td>
                      <td>
                        <span className={styles.roleBadge} style={STATUS_STYLE[r.status]}>{STATUS_LABELS[r.status] ?? r.status}</span>
                      </td>
                      <td>{r.created_by_name}</td>
                      <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                      <td className={styles.actions} style={{ flexWrap: 'wrap', minWidth: 230 }}>
                        <button className={styles.btnEdit} onClick={() => router.push(`/street-vending/${r.id}`)}>✏️ View/Edit</button>
                        {r.status === 'idIssued' ? (
                          <>
                            <button className={styles.btnUnblock} onClick={() => openPrint(r.id, 'card')}>🪪 ID Card</button>
                            <button className={styles.btnUnblock} onClick={() => openPrint(r.id, 'form2')}>📄 Form II</button>
                          </>
                        ) : (
                          <button className={styles.btnBlock} disabled={saving} onClick={() => handleIssue(r)}>🪪 Generate Card</button>
                        )}
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
            <h2 className={styles.modalTitle}>Delete Vendor</h2>
            <p className={styles.modalBody}>
              Permanently delete vendor #{modal.data.id} <strong>{modal.data.full_name || '(no name)'}</strong>
              {modal.data.id_card_no ? <> (ID {modal.data.id_card_no})</> : null}? This cannot be undone.
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
