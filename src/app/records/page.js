"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../dashboard/dashboard.module.css'

const RECORD_FILTERS_STORAGE_KEY = 'adminsurveyapp.records.filters'

function readStoredFilters() {
  if (typeof window === 'undefined') {
    return {
      selectedWardId: '',
      selectedMohallaId: '',
      houseNo: '',
      page: 1,
      startDate: '',
      endDate: '',
    }
  }

  try {
    const raw = window.sessionStorage.getItem(RECORD_FILTERS_STORAGE_KEY)
    if (!raw) {
      return {
        selectedWardId: '',
        selectedMohallaId: '',
        houseNo: '',
        page: 1,
        startDate: '',
        endDate: '',
      }
    }

    const parsed = JSON.parse(raw)
    return {
      selectedWardId: parsed.selectedWardId ?? '',
      selectedMohallaId: parsed.selectedMohallaId ?? '',
      houseNo: parsed.houseNo ?? '',
      page: Number.isFinite(Number(parsed.page)) ? Math.max(1, Number(parsed.page)) : 1,
      startDate: parsed.startDate ?? '',
      endDate: parsed.endDate ?? '',
    }
  } catch {
    return {
      selectedWardId: '',
      selectedMohallaId: '',
      houseNo: '',
      page: 1,
      startDate: '',
      endDate: '',
    }
  }
}

export default function RecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingWards, setLoadingWards] = useState(false)
  const [loadingMohallas, setLoadingMohallas] = useState(false)
  const [countLoading, setCountLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [wards, setWards] = useState([])
  const [mohallas, setMohallas] = useState([])
  const storedFilters = readStoredFilters()
  const [selectedWardId, setSelectedWardId] = useState(storedFilters.selectedWardId)
  const [selectedMohallaId, setSelectedMohallaId] = useState(storedFilters.selectedMohallaId)
  const [houseNo, setHouseNo] = useState(storedFilters.houseNo)
  const [page, setPage] = useState(storedFilters.page)
  const [limit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [filteredCount, setFilteredCount] = useState(0)
  const [surveyCounts, setSurveyCounts] = useState({
    total: 0,
    completed: 0,
    uncompleted: 0,
  })
  const [startDate, setStartDate] = useState(storedFilters.startDate)
  const [endDate, setEndDate] = useState(storedFilters.endDate)

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function getSelectedWardNo() {
    return wards.find(ward => String(ward.id) === String(selectedWardId))?.ward_no ?? ''
  }

  function getSelectedMohallaName() {
    return mohallas.find(mohalla => String(mohalla.id) === String(selectedMohallaId))?.mohalla_name ?? ''
  }

  async function loadWards() {
    setLoadingWards(true)
    try {
      const r = await fetch('/api/locations/ulbs/1/wards')
      const d = await r.json()
      setWards(d.wards ?? [])
    } catch {
      showToast('Failed to load wards', false)
    } finally {
      setLoadingWards(false)
    }
  }

  async function loadMohallas(wardId) {
    if (!wardId) {
      setMohallas([])
      return
    }

    setLoadingMohallas(true)
    try {
      const r = await fetch(`/api/locations/wards/${wardId}/mohallas`)
      const d = await r.json()
      setMohallas(d.mohallas ?? [])
    } catch {
      showToast('Failed to load mohallas', false)
    } finally {
      setLoadingMohallas(false)
    }
  }

  async function loadSurveyCounts() {
    setCountLoading(true)
    try {
      const r = await fetch('/api/property-surveys/counts')
      const d = await r.json()
      setSurveyCounts({
        total: d.totalSurveys ?? 0,
        completed: d.completedSurveys ?? 0,
        uncompleted: d.uncompletedSurveys ?? 0,
      })
    } catch {
      showToast('Failed to load survey counts', false)
    } finally {
      setCountLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.sessionStorage.setItem(
      RECORD_FILTERS_STORAGE_KEY,
      JSON.stringify({
        selectedWardId,
        selectedMohallaId,
        houseNo,
        page,
        startDate,
        endDate,
      })
    )
  }, [selectedWardId, selectedMohallaId, houseNo, page, startDate, endDate])

  async function loadRecords() {
    setLoading(true)
    try {
      const wardNo = getSelectedWardNo()
      const mohallaName = getSelectedMohallaName()
      const url = `/api/property-surveys/all-search?ward_no=${encodeURIComponent(wardNo)}&mohalla_name=${encodeURIComponent(mohallaName)}&house_no=${encodeURIComponent(houseNo.trim())}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}&page=${page}&limit=${limit}`
      const r = await fetch(url)
      const d = await r.json()
      if (d?.message) {
        setRecords([])
        setFilteredCount(0)
        showToast(d.message, false)
      } else {
        setRecords(Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : [])
        setFilteredCount(d?.pagination?.total ?? (Array.isArray(d?.data) ? d.data.length : Array.isArray(d) ? d.length : 0))
      }
      if (d.pagination) {
        setTotalPages(d.pagination.total_pages ?? 1)
      } else {
        setTotalPages(1)
        setFilteredCount(Array.isArray(d?.data) ? d.data.length : Array.isArray(d) ? d.length : 0)
      }
    } catch {
      showToast('Failed to load records', false)
    } finally {
      setLoading(false)
    }
  }

  function handleExport() {
    const wardNo = getSelectedWardNo()
    const query = new URLSearchParams()
    if (wardNo) query.append('ward_no', wardNo)
    if (startDate) query.append('start_date', startDate)
    if (endDate) query.append('end_date', endDate)
    window.open(`/api/property-surveys/export?${query.toString()}`, '_blank')
  }

  useEffect(() => {
    loadWards()
    loadSurveyCounts()
  }, [])

  useEffect(() => {
    const handler = setTimeout(() => {
      loadRecords()
    }, 350)
    return () => clearTimeout(handler)
  }, [selectedWardId, selectedMohallaId, houseNo, startDate, endDate, page, wards, mohallas])

  useEffect(() => {
    loadMohallas(selectedWardId)
  }, [selectedWardId])

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
        </header>

        <div className={styles.filterRow}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Ward</label>
            <select
              className={styles.filterSelect}
              value={selectedWardId}
              onChange={e => {
                setSelectedWardId(e.target.value)
                setSelectedMohallaId('')
                setPage(1)
              }}
              disabled={loadingWards}
            >
              <option value="">{loadingWards ? 'Loading wards…' : 'Select ward'}</option>
              {wards.map(ward => (
                <option key={ward.id} value={ward.id}>
                  {ward.ward_no}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Mohalla</label>
            <select
              className={styles.filterSelect}
              value={selectedMohallaId}
              onChange={e => {
                setSelectedMohallaId(e.target.value)
                setPage(1)
              }}
              disabled={!selectedWardId || loadingMohallas}
            >
              <option value="">
                {selectedWardId ? (loadingMohallas ? 'Loading mohallas…' : 'Select mohalla') : 'Select ward first'}
              </option>
              {mohallas.map(mohalla => (
                <option key={mohalla.id} value={mohalla.id}>
                  {mohalla.mohalla_name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>House No</label>
            <input
              type="text"
              className={styles.filterInput}
              placeholder="Enter house number"
              value={houseNo}
              onChange={e => {
                setHouseNo(e.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>

        <div className={styles.filterRow} style={{ gridTemplateColumns: '1fr 1fr 150px' }}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Start Date</label>
            <input
              type="date"
              className={styles.filterInput}
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>End Date</label>
            <input
              type="date"
              className={styles.filterInput}
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value)
                setPage(1)
              }}
            />
          </div>

          <div className={styles.filterGroup} style={{ justifyContent: 'flex-end', paddingTop: '1.5rem' }}>
            <button className={styles.btnSave} onClick={handleExport}>
              📥 Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{countLoading ? '…' : surveyCounts.total}</span>
            <span className={styles.statLabel}>Total Surveys</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{countLoading ? '…' : surveyCounts.completed}</span>
            <span className={styles.statLabel}>Completed Surveys</span>
          </div>
          <div className={`${styles.statCard} ${styles.statRed}`}>
            <span className={styles.statNum}>{countLoading ? '…' : surveyCounts.uncompleted}</span>
            <span className={styles.statLabel}>Uncompleted Surveys</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{loading ? '…' : filteredCount}</span>
            <span className={styles.statLabel}>Current Search Count</span>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : records.length === 0 ? (
            <div className={styles.empty}>{selectedWardId || selectedMohallaId || houseNo ? 'No records found.' : 'No records yet.'}</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Old House No</th>
                  <th>House No</th>
                  <th>Mohalla</th>
                  <th>Old Owner</th>
                  <th>Owner</th>
                  <th>Remarks</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id}>
                    <td>{r.old_house_no}</td>
                    <td>{r.new_house_no}</td>
                    <td>{r.mohalla_name}</td>
                    <td>{r.old_owner_name}</td>
                    <td className={styles.tdName}>{r.owner_name}</td>
                    <td>{r.remarks}</td>
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

          {!loading && totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.btnEdit}
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className={styles.paginationInfo}>
                Page {page} of {totalPages}
              </span>
              <button
                className={styles.btnEdit}
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
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
