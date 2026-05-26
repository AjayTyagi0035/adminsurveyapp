"use client"
import { useEffect, useState } from 'react'
import styles from './dashboard.module.css'

export default function Dashboard() {
  const [surveyors, setSurveyors] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Modal state
  const [modal, setModal] = useState(null) // { type: 'add' | 'edit' | 'block' | 'delete', data? }
  const [form, setForm] = useState({ name: '', mobile: '', password: '' })
  const [blockReason, setBlockReason] = useState('')
  const [saving, setSaving] = useState(false)

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  async function loadSurveyors() {
    setLoading(true)
    try {
      const r = await fetch('/api/surveyors')
      const d = await r.json()
      setSurveyors(d.surveyors ?? [])
    } catch {
      showToast('Failed to load surveyors', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSurveyors() }, [])

  // ── Add surveyor ───────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch('/api/surveyors', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to add', false)
      showToast('Surveyor added successfully')
      setModal(null)
      loadSurveyors()
    } finally { setSaving(false) }
  }

  // ── Edit surveyor ──────────────────────────────────────────
  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {}
      if (form.name)     body.name     = form.name
      if (form.mobile)   body.mobile   = form.mobile
      if (form.password) body.password = form.password
      const r = await fetch(`/api/surveyors/${modal.data.id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to update', false)
      showToast('Surveyor updated')
      setModal(null)
      loadSurveyors()
    } finally { setSaving(false) }
  }

  // ── Block / Unblock ────────────────────────────────────────
  async function handleBlock(action) {
    setSaving(true)
    try {
      const body = action === 'block' ? { reason: blockReason } : {}
      const r = await fetch(`/api/surveyors/${modal.data.id}/${action}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed', false)
      showToast(action === 'block' ? 'Surveyor blocked' : 'Surveyor unblocked')
      setModal(null)
      loadSurveyors()
    } finally { setSaving(false) }
  }

  // ── Delete ─────────────────────────────────────────────────
  async function handleDelete() {
    setSaving(true)
    try {
      const r = await fetch(`/api/surveyors/${modal.data.id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to delete', false)
      showToast('Surveyor deleted')
      setModal(null)
      loadSurveyors()
    } finally { setSaving(false) }
  }

  function openAdd() {
    setForm({ name: '', mobile: '', password: '' })
    setModal({ type: 'add' })
  }

  function openEdit(s) {
    setForm({ name: s.name, mobile: s.mobile, password: '' })
    setModal({ type: 'edit', data: s })
  }

  function openBlock(s) {
    setBlockReason('')
    setModal({ type: 'block', data: s })
  }

  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>📋 SurveyAdmin</div>
        <nav className={styles.nav}>
          <span className={`${styles.navItem} ${styles.navActive}`}>👥 Surveyors</span>
        </nav>
        <button className={styles.logoutBtn} onClick={() => window.location.href = '/login'}>
          ⬅ Logout
        </button>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Surveyor Management</h1>
            <p className={styles.pageSubtitle}>Manage accounts, roles and access</p>
          </div>
          <button className={styles.addBtn} onClick={openAdd}>+ Add Surveyor</button>
        </header>

        {/* Stats */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{surveyors.length}</span>
            <span className={styles.statLabel}>Total</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statNum}>{surveyors.filter(s => !s.is_blocked).length}</span>
            <span className={styles.statLabel}>Active</span>
          </div>
          <div className={`${styles.statCard} ${styles.statRed}`}>
            <span className={styles.statNum}>{surveyors.filter(s => s.is_blocked).length}</span>
            <span className={styles.statLabel}>Blocked</span>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : surveyors.length === 0 ? (
            <div className={styles.empty}>No surveyors yet. Add one to get started.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {surveyors.map((s, i) => (
                  <tr key={s.id} className={s.is_blocked ? styles.rowBlocked : ''}>
                    <td className={styles.tdMuted}>{i + 1}</td>
                    <td className={styles.tdName}>{s.name}</td>
                    <td>{s.mobile}</td>
                    <td><span className={styles.roleBadge}>{s.role}</span></td>
                    <td>
                      {s.is_blocked
                        ? <span className={styles.badgeBlocked}>Blocked</span>
                        : <span className={styles.badgeActive}>Active</span>}
                    </td>
                    <td className={styles.actions}>
                      <button className={styles.btnEdit} onClick={() => openEdit(s)}>✏️ </button>
                      {s.is_blocked
                        ? <button className={styles.btnUnblock} onClick={() => openBlock(s)}>🔓 Unblock</button>
                        : <button className={styles.btnBlock}  onClick={() => openBlock(s)}>🚫</button>}
                      <button className={styles.btnDelete} onClick={() => setModal({ type: 'delete', data: s })}>🗑️ Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>
      )}

      {/* ── Modals ── */}
      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

            {/* Add */}
            {modal.type === 'add' && (
              <>
                <h2 className={styles.modalTitle}>Add Surveyor</h2>
                <form onSubmit={handleAdd} className={styles.modalForm}>
                  <label>Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Full name" />
                  <label>Mobile</label>
                  <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} required placeholder="10-digit mobile" type="tel" />
                  <label>Password</label>
                  <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required placeholder="Password" type="password" />
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.btnCancel} onClick={() => setModal(null)}>Cancel</button>
                    <button type="submit" className={styles.btnSave} disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
                  </div>
                </form>
              </>
            )}

            {/* Edit */}
            {modal.type === 'edit' && (
              <>
                <h2 className={styles.modalTitle}>Edit Surveyor</h2>
                <form onSubmit={handleEdit} className={styles.modalForm}>
                  <label>Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
                  <label>Mobile</label>
                  <input value={form.mobile} onChange={e => setForm(f => ({ ...f, mobile: e.target.value }))} placeholder="Mobile" type="tel" />
                  <label>New Password <span className={styles.optional}>(leave blank to keep)</span></label>
                  <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="New password" type="password" />
                  <div className={styles.modalActions}>
                    <button type="button" className={styles.btnCancel} onClick={() => setModal(null)}>Cancel</button>
                    <button type="submit" className={styles.btnSave} disabled={saving}>{saving ? 'Saving…' : 'Update'}</button>
                  </div>
                </form>
              </>
            )}

            {/* Block / Unblock */}
            {modal.type === 'block' && (
              <>
                <h2 className={styles.modalTitle}>
                  {modal.data.is_blocked ? 'Unblock Surveyor' : 'Block Surveyor'}
                </h2>
                <p className={styles.modalBody}>
                  {modal.data.is_blocked
                    ? `Allow ${modal.data.name} to log in again?`
                    : `Block ${modal.data.name} from logging in?`}
                </p>
                {!modal.data.is_blocked && (
                  <div className={styles.modalForm}>
                    <label>Reason (optional)</label>
                    <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Suspended pending review" />
                  </div>
                )}
                <div className={styles.modalActions}>
                  <button className={styles.btnCancel} onClick={() => setModal(null)}>Cancel</button>
                  <button
                    className={modal.data.is_blocked ? styles.btnUnblock : styles.btnBlock}
                    disabled={saving}
                    onClick={() => handleBlock(modal.data.is_blocked ? 'unblock' : 'block')}
                  >
                    {saving ? '…' : modal.data.is_blocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              </>
            )}

            {/* Delete */}
            {modal.type === 'delete' && (
              <>
                <h2 className={styles.modalTitle}>Delete Surveyor</h2>
                <p className={styles.modalBody}>
                  Permanently delete <strong>{modal.data.name}</strong>? This cannot be undone.
                </p>
                <div className={styles.modalActions}>
                  <button className={styles.btnCancel} onClick={() => setModal(null)}>Cancel</button>
                  <button className={styles.btnDelete} disabled={saving} onClick={handleDelete}>
                    {saving ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

