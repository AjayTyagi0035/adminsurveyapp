"use client"
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import styles from '../../dashboard.module.css'

export default function EditRecordPage() {
  const router = useRouter()
  const params = useParams()
  const { id } = params
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (!id) return
    async function loadRecord() {
      setLoading(true)
      try {
        const r = await fetch(`/api/property-surveys/${id}`)
        if (!r.ok) throw new Error('Failed to fetch record')
        const d = await r.json()
        setRecord(d.survey)
      } catch (err) {
        showToast(err.message, false)
        router.back()
      } finally {
        setLoading(false)
      }
    }
    loadRecord()
  }, [id, router])

  async function handleRecordUpdate(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch(`/api/property-surveys/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
      })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to update', false)
      showToast('Record updated successfully')
      router.push('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !record) {
    return <div className={styles.empty}>Loading record...</div>
  }

  return (
    <div className={styles.layout}>
      <main className={`${styles.main} ${styles.mainStandalone}`}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Edit Property Record</h1>
            <p className={styles.pageSubtitle}>Record ID: {id}</p>
          </div>
          <button onClick={() => router.back()} className={styles.btnCancel}>
            &larr; Back to Dashboard
          </button>
        </header>

        <form onSubmit={handleRecordUpdate} className={`${styles.modalForm} ${styles.recordForm}`}>
          {Object.entries(record).map(([key, value]) => (
            <div key={key}>
              <label>{key.split('_').join(' ')}</label>
              <input
                value={value ?? ''}
                onChange={e => setRecord(f => ({ ...f, [key]: e.target.value }))}
                placeholder={key.split('_').join(' ')}
                readOnly={['id', 'created_at', 'updated_at', 'created_by'].includes(key)}
                className={['id', 'created_at', 'updated_at', 'created_by'].includes(key) ? styles.inputReadonly : ''}
              />
            </div>
          ))}
          <div className={styles.modalActions}>
            <button type="button" className={styles.btnCancel} onClick={() => router.back()}>Cancel</button>
            <button type="submit" className={styles.btnSave} disabled={saving}>
              {saving ? 'Saving…' : 'Update Record'}
            </button>
          </div>
        </form>
      </main>

      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>
      )}
    </div>
  )
}
