"use client"
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from './dashboard.module.css'
import Surveyors from './components/Surveyors'

export default function Dashboard() {
  const pathname = usePathname()
  const [surveyors, setSurveyors] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Modal state
  const [modal, setModal] = useState(null)
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

  useEffect(() => {
    loadSurveyors()
  }, [])

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

  async function handleEdit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {}
      if (form.name) body.name = form.name
      if (form.mobile) body.mobile = form.mobile
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

  async function handleDelete() {
    if (modal.type === 'delete-surveyor') {
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
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>📋 SurveyAdmin</div>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={`${styles.navItem} ${pathname === '/dashboard' ? styles.navActive : ''}`}>
            👥 Surveyors
          </Link>
          <Link href="/records" className={`${styles.navItem} ${pathname === '/records' ? styles.navActive : ''}`}>
            📝 Records
          </Link>
          <Link href="/map" className={`${styles.navItem} ${pathname === '/map' ? styles.navActive : ''}`}>
            🗺️ Map View
          </Link>
        </nav>
        <button className={styles.logoutBtn} onClick={() => window.location.href = '/login'}>
          ⬅ Logout
        </button>
      </aside>

      <main className={styles.main}>
        <Surveyors
          surveyors={surveyors}
          loading={loading}
          openAdd={openAdd}
          openEdit={openEdit}
          openBlock={openBlock}
          setModal={setModal}
        />
      </main>

      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>
      )}

      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>

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

            {modal.type === 'delete-surveyor' && (
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

