"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from '../../dashboard/dashboard.module.css'
import { FIELDS, LOOKUP_CODE, MEDIA, OPTIONS, SECTIONS, STATUS_LABELS, fullName, mediaUrl } from '../options'

const READ_ONLY_DATES = new Set(['created_at', 'updated_at'])

const isOther = value => typeof value === 'string' && value.startsWith('Other')
const isPdf = path => /\.pdf$/i.test(path ?? '')

export default function StreetVendorEditPage() {
  const router = useRouter()
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [toast, setToast] = useState(null)
  const [viewer, setViewer] = useState(null) // { url, kind }

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function updateField(key, value) {
    setRecord(current => ({ ...current, [key]: value }))
    setDirty(true)
  }

  function updateOtherText(column, text) {
    const code = LOOKUP_CODE[column]
    setRecord(current => {
      const other = { ...(current.other_text ?? {}) }
      if (text) other[code] = text
      else delete other[code]
      return { ...current, other_text: other }
    })
    setDirty(true)
  }

  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      try {
        const r = await fetch(`/api/street-vending/${id}`)
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to fetch vendor')
        setRecord(d.record)
        setDirty(false)
      } catch (err) {
        showToast(err.message, false)
        router.push('/street-vending')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  async function handleUpload(key, file) {
    if (!file) return
    setUploading(key)
    try {
      const form = new FormData()
      form.append('file', file)
      const r = await fetch('/api/street-vending/upload', { method: 'POST', body: form })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Upload failed')
      updateField(key, d.path)
      if (key === 'video') updateField('video_name', file.name)
      showToast('File uploaded — click Update Record to save')
    } catch (err) {
      showToast(err.message, false)
    } finally {
      setUploading(null)
    }
  }

  async function save() {
    // Server keeps created_by and records the admin from the session cookie.
    const body = { ...record }
    delete body.created_by
    delete body.updated_by
    const r = await fetch(`/api/street-vending/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || 'Failed to update')
    return d.record
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await save()
      showToast('Record updated successfully')
      router.push('/street-vending')
    } catch (err) {
      showToast(err.message, false)
    } finally {
      setSaving(false)
    }
  }

  async function handleIssue() {
    setSaving(true)
    try {
      if (dirty) await save()
      const r = await fetch(`/api/street-vending/${id}/issue`, { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to generate ID card')
      setRecord(current => ({ ...current, ...d.record }))
      setDirty(false)
      showToast(`Application ${d.record.application_no} · ID card ${d.record.id_card_no} generated`)
    } catch (err) {
      showToast(err.message, false)
    } finally {
      setSaving(false)
    }
  }

  async function openPrint(doc) {
    if (dirty) {
      setSaving(true)
      try {
        await save()
        setDirty(false)
      } catch (err) {
        setSaving(false)
        return showToast(err.message, false)
      }
      setSaving(false)
    }
    window.open(`/street-vending/print/${doc}/${id}`, '_blank')
  }

  function renderControl(key) {
    const [label, kind = 'text'] = FIELDS[key]
    const value = record[key]

    if (kind === 'readonly') {
      const shown = value == null || value === '' ? '—' : READ_ONLY_DATES.has(key) ? new Date(value).toLocaleString() : String(value)
      return <input value={shown} readOnly className={styles.inputReadonly} />
    }

    if (kind === 'bool') {
      return (
        <select
          value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={e => updateField(key, e.target.value === '' ? null : e.target.value === 'true')}
          className={styles.recordSelect}
        >
          <option value="">Not answered</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )
    }

    if (kind === 'select') {
      const base = OPTIONS[key] ?? []
      const options = !value || base.includes(value) ? base : [value, ...base]
      return (
        <>
          <select value={value ?? ''} onChange={e => updateField(key, e.target.value || null)} className={styles.recordSelect}>
            <option value="">Select…</option>
            {options.map(o => <option key={o} value={o}>{key === 'status' ? STATUS_LABELS[o] ?? o : o}</option>)}
          </select>
          {isOther(value) && LOOKUP_CODE[key] && (
            <input
              value={record.other_text?.[LOOKUP_CODE[key]] ?? ''}
              onChange={e => updateOtherText(key, e.target.value)}
              placeholder="Please specify"
              className={styles.recordInput}
              style={{ marginTop: 6 }}
            />
          )}
        </>
      )
    }

    if (kind === 'multi') {
      const selected = Array.isArray(value) ? value : []
      const options = [...OPTIONS[key], ...selected.filter(s => !OPTIONS[key].includes(s))]
      const toggle = o => updateField(key, selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o])
      return (
        <div className={styles.inputReadonly} style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', background: '#fff' }}>
          {options.map(o => (
            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: '#111827' }}>
              <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
              {o}
            </label>
          ))}
          {selected.some(isOther) && LOOKUP_CODE[key] && (
            <input
              value={record.other_text?.[LOOKUP_CODE[key]] ?? ''}
              onChange={e => updateOtherText(key, e.target.value)}
              placeholder="Other — please specify"
              className={styles.recordInput}
              style={{ flexBasis: '100%' }}
            />
          )}
        </div>
      )
    }

    if (kind === 'textarea') {
      return (
        <textarea
          value={value ?? ''}
          onChange={e => updateField(key, e.target.value)}
          placeholder={label}
          rows={2}
          className={styles.recordInput}
          style={{ resize: 'vertical', fontFamily: 'inherit' }}
        />
      )
    }

    const type = kind === 'int' || kind === 'num' ? 'number' : kind === 'date' ? 'date' : 'text'
    return (
      <input
        type={type}
        step={kind === 'int' ? '1' : kind === 'num' ? '0.01' : undefined}
        value={value == null ? '' : kind === 'date' ? String(value).slice(0, 10) : value}
        onChange={e => updateField(key, e.target.value)}
        placeholder={kind === 'time' ? 'e.g. 9:00 AM' : label}
        className={styles.recordInput}
      />
    )
  }

  function renderFamily() {
    const members = Array.isArray(record.family_members) ? record.family_members : []
    const setMembers = list => updateField('family_members', list)
    const change = (i, key, value) => setMembers(members.map((m, j) => (j === i ? { ...m, [key]: value } : m)))
    return (
      <div style={{ marginTop: 16 }}>
        <label className={styles.recordFieldLabel}>Family Members (printed on Form II &amp; ID card, max 6)</label>
        {members.map((m, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '24px 2fr 1.4fr 90px auto', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <span style={{ color: '#6b7280' }}>{i + 1}.</span>
            <input className={styles.recordInput} placeholder="Name" value={m.name ?? ''} onChange={e => change(i, 'name', e.target.value)} />
            <select className={styles.recordSelect} value={m.relation ?? ''} onChange={e => change(i, 'relation', e.target.value || null)}>
              <option value="">Relation…</option>
              {OPTIONS.relation.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input className={styles.recordInput} type="number" placeholder="Age" value={m.age ?? ''} onChange={e => change(i, 'age', e.target.value === '' ? null : Number(e.target.value))} />
            <button type="button" className={styles.btnDelete} onClick={() => setMembers(members.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        {members.length < 6 && (
          <button type="button" className={styles.btnEdit} style={{ marginTop: 10 }} onClick={() => setMembers([...members, { name: '', relation: null, age: null }])}>
            ➕ Add family member
          </button>
        )}
      </div>
    )
  }

  function openViewer(key, kind) {
    const url = mediaUrl(record[key])
    if (isPdf(record[key])) return window.open(url, '_blank')
    setViewer({ url, kind })
  }

  if (loading || !record) {
    return <main className={styles.main}><div className={styles.empty}>Loading vendor...</div></main>
  }

  const issued = record.status === 'idIssued'
  const name = fullName(record)

  return (
    <>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Street Vendor</h1>
            <p className={styles.pageSubtitle}>Record ID: {id} · Review and update the registration</p>
          </div>
          <button onClick={() => router.push('/street-vending')} className={styles.btnCancel}>
            &larr; Back to Street Vendors
          </button>
        </header>

        <section className={styles.recordHero}>
          <div className={styles.recordHeroMain} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {record.passport_photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mediaUrl(record.passport_photo)}
                alt=""
                onClick={() => openViewer('passport_photo', 'image')}
                style={{ width: 72, height: 88, objectFit: 'cover', borderRadius: 8, border: '2px solid rgba(255,255,255,0.4)', cursor: 'zoom-in' }}
              />
            )}
            <div>
              <span className={styles.recordKicker}>{STATUS_LABELS[record.status] ?? record.status}</span>
              <h2 className={styles.recordHeroTitle}>{name || 'Unnamed vendor'}</h2>
              <p className={styles.recordHeroSubtitle}>
                Mobile {record.mobile_no || '—'} · {record.nature_of_business || 'Business not set'}
              </p>
            </div>
          </div>
          <div className={styles.recordSummaryGrid}>
            <div className={styles.recordSummaryItem}>
              <span className={styles.recordSummaryLabel}>Zone / Ward</span>
              <span className={styles.recordSummaryValue}>{[record.zone_name, record.ward_name].filter(Boolean).join(' / ') || '—'}</span>
            </div>
            <div className={styles.recordSummaryItem}>
              <span className={styles.recordSummaryLabel}>Application No.</span>
              <span className={styles.recordSummaryValue}>{record.application_no || '—'}</span>
            </div>
            <div className={styles.recordSummaryItem}>
              <span className={styles.recordSummaryLabel}>ID Card No.</span>
              <span className={styles.recordSummaryValue}>{record.id_card_no || '—'}</span>
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '0 0 20px' }}>
          {!issued && (
            <button type="button" className={styles.btnSave} disabled={saving} onClick={handleIssue}>
              🪪 Generate Form II &amp; ID Card
            </button>
          )}
          <button type="button" className={styles.btnEdit} disabled={!issued || saving} onClick={() => openPrint('card')}>
            🪪 Print ID Card
          </button>
          <button type="button" className={styles.btnEdit} disabled={!issued || saving} onClick={() => openPrint('form2')}>
            📄 Print Form II
          </button>
          <button type="button" className={styles.btnEdit} disabled={saving} onClick={() => openPrint('form1')}>
            🧾 Print Survey (Form I)
          </button>
          {!issued && (
            <span style={{ alignSelf: 'center', color: '#6b7280', fontSize: 13 }}>
              This record is a draft. Generate to assign the application and ID card numbers.
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className={styles.recordForm}>
          <section className={styles.recordSection}>
            <div className={styles.recordSectionHeader}>
              <div>
                <h3 className={styles.recordSectionTitle}>Photographs, Identity Proofs &amp; Video</h3>
                <p className={styles.recordSectionHint}>Click View to open. Uploads go to the streetvending container; only the path is saved.</p>
              </div>
            </div>
            <div className={styles.recordGrid}>
              {MEDIA.map(([key, label, kind]) => (
                <div key={key} className={styles.recordField}>
                  <label className={styles.recordFieldLabel}>{label}</label>
                  {/* Media loads only on View, to avoid blob egress on every page open. */}
                  <div className={styles.inputReadonly} style={{ color: record[key] ? '#15803d' : '#9ca3af' }}>
                    {record[key]
                      ? kind === 'video'
                        ? `✅ ${record.video_name || 'Video available'}`
                        : isPdf(record[key]) ? '✅ PDF document' : '✅ Photo available'
                      : kind === 'video' && record.video_name
                        ? `⚠️ ${record.video_name} (not uploaded)`
                        : kind === 'video' ? 'No video' : 'No photo'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {record[key] && (
                      <button type="button" className={styles.btnSave} style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => openViewer(key, kind)}>
                        👁️ View
                      </button>
                    )}
                    <label className={styles.btnEdit} style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                      {uploading === key ? 'Uploading…' : record[key] ? '🔄 Replace' : '⬆️ Upload'}
                      <input
                        type="file"
                        accept={kind === 'video' ? 'video/*' : key.startsWith('id_proof') ? 'image/*,application/pdf' : 'image/*'}
                        hidden
                        disabled={Boolean(uploading)}
                        onChange={e => { handleUpload(key, e.target.files?.[0]); e.target.value = '' }}
                      />
                    </label>
                    {record[key] && (
                      <button
                        type="button"
                        className={styles.btnDelete}
                        onClick={() => { updateField(key, null); if (key === 'video') updateField('video_name', null) }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {SECTIONS.map(section => (
            <section key={section.title} className={styles.recordSection}>
              <div className={styles.recordSectionHeader}>
                <div>
                  <h3 className={styles.recordSectionTitle}>{section.title}</h3>
                </div>
              </div>
              <div className={styles.recordGrid}>
                {section.fields.map(key => (
                  <div key={key} className={styles.recordField} style={FIELDS[key][1] === 'multi' ? { gridColumn: '1 / -1' } : undefined}>
                    <label className={styles.recordFieldLabel}>{FIELDS[key][0]}</label>
                    {renderControl(key)}
                  </div>
                ))}
              </div>
              {section.family && renderFamily()}
            </section>
          ))}

          <div className={styles.recordActions}>
            <div className={styles.recordActionsHint}>
              {dirty ? 'You have unsaved changes.' : 'Changes are saved back to the same vendor record.'}
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={() => router.push('/street-vending')}>Cancel</button>
              <button type="submit" className={styles.btnSave} disabled={saving || Boolean(uploading)}>
                {saving ? 'Saving…' : 'Update Record'}
              </button>
            </div>
          </div>
        </form>
      </main>

      {viewer && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
          onClick={() => setViewer(null)}
        >
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
              <a href={viewer.url} target="_blank" rel="noreferrer" className={styles.btnEdit} style={{ textDecoration: 'none' }}>↗ Open</a>
              <button
                type="button"
                onClick={() => setViewer(null)}
                style={{ background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
            {viewer.kind === 'video' ? (
              <video src={viewer.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 60px)' }} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewer.url} alt="Preview" style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 60px)', objectFit: 'contain' }} />
            )}
          </div>
        </div>
      )}

      {toast && <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>}
    </>
  )
}
