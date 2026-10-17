"use client"
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styles from '../../dashboard/dashboard.module.css'

// Keep in sync with tauruapp/lib/constants/survey_options.dart
const OPTIONS = {
  natureOfHouse: ['Pakka', 'Semi Pakka', 'Kachha', 'Open Plot'],
  WidthofRoadInFront: ['Less than 3 m', '3 - 9 m', '9 - 12 m', '12 - 24 m', 'More than 24 m'],
  Typeofconstruction: ['RCC', 'RBC', 'Tin / Asbestos Shed', 'Mud / Kachha', 'Other'],
  Useofhouse: ['Residential', 'Commercial', 'Mixed', 'Institutional', 'Industrial', 'Religious', 'Government', 'Vacant'],
  occupancyStatus: ['Self Occupied', 'Rented', 'Partially Rented', 'Vacant'],
  floorNo: ['Ground', 'G+1', 'G+2', 'G+3', 'G+4'],
  waterConnection: ['Yes', 'No'],
  sewerConnection: ['Yes', 'No'],
}

const LABELS = {
  district: 'District',
  ulbName: 'ULB Name',
  wardNoOrName: 'Ward No. / Name',
  mohallaName: 'Mohalla Name',
  propertyId: 'Property ID',
  houseNo: 'House No.',
  ownerName: 'Owner Name',
  fatherOrHusbandName: 'Father / Husband Name',
  mobileNo: 'Mobile No.',
  membersInHouse: 'Members in House',
  address: 'Address',
  natureOfHouse: 'Nature of House',
  Typeofconstruction: 'Type of Construction',
  WidthofRoadInFront: 'Width of Road in Front',
  floorNo: 'Number of Floors',
  Useofhouse: 'Use of House',
  ifmixed: 'If Mixed, Specify Use',
  occupancyStatus: 'Occupancy Status',
  waterConnection: 'Water Connection',
  sewerConnection: 'Sewer Connection',
  frontWidthofPlotInFeet: 'Front Width (ft)',
  depthofPlotInFeet: 'Depth (ft)',
  totalAreaInFeet: 'Total Plot Area (sq ft)',
  builtUpArea: 'Built-up Area, Ground (sq ft)',
  firstFloorArea: 'First Floor Area (sq ft)',
  secondFloorArea: 'Second Floor Area (sq ft)',
  thirdFloorArea: 'Third Floor Area (sq ft)',
  fourthFloorArea: 'Fourth Floor Area (sq ft)',
  commercialArea: 'Commercial Area (sq ft)',
  openArea: 'Open Area (sq ft)',
  totalBuiltUpArea: 'Total Built-up Area (sq ft)',
  dataLat: 'Latitude',
  dataLng: 'Longitude',
  remarks: 'Remarks',
  id: 'Record ID',
  submittedByName: 'Submitted By',
  submittedAt: 'Submitted At',
  updatedAt: 'Last Updated',
}

const SECTIONS = [
  { title: 'Administrative Area', hint: 'District and ULB are fixed for Tauru.', fields: ['district', 'ulbName', 'wardNoOrName', 'mohallaName'] },
  { title: 'Owner Details', hint: 'Property identification and owner information.', fields: ['propertyId', 'houseNo', 'ownerName', 'fatherOrHusbandName', 'mobileNo', 'membersInHouse', 'address'] },
  { title: 'Property Details', hint: 'Construction, usage and utilities.', fields: ['natureOfHouse', 'Typeofconstruction', 'WidthofRoadInFront', 'floorNo', 'Useofhouse', 'ifmixed', 'occupancyStatus', 'waterConnection', 'sewerConnection'] },
  { title: 'Area & Measurements', hint: 'Plot size and floor-wise built-up area.', fields: ['frontWidthofPlotInFeet', 'depthofPlotInFeet', 'totalAreaInFeet', 'builtUpArea', 'firstFloorArea', 'secondFloorArea', 'thirdFloorArea', 'fourthFloorArea', 'commercialArea', 'openArea', 'totalBuiltUpArea'] },
  { title: 'GPS & Remarks', hint: 'Captured location and notes.', fields: ['dataLat', 'dataLng', 'remarks'] },
  { title: 'System', hint: 'Record metadata kept for reference.', fields: ['id', 'submittedByName', 'submittedAt', 'updatedAt'] },
]

const PHOTOS = [
  ['frontPhotoUrl', 'Front Photo'],
  ['rightSidePhotoUrl', 'Right Side'],
  ['leftSidePhotoUrl', 'Left Side'],
]

const READ_ONLY = new Set(['district', 'ulbName', 'id', 'submittedByName', 'submittedAt', 'updatedAt'])
const DATE_FIELDS = new Set(['submittedAt', 'updatedAt'])
const NUMBER_FIELDS = new Set([
  'membersInHouse', 'frontWidthofPlotInFeet', 'depthofPlotInFeet', 'totalAreaInFeet', 'builtUpArea',
  'firstFloorArea', 'secondFloorArea', 'thirdFloorArea', 'fourthFloorArea', 'commercialArea',
  'openArea', 'totalBuiltUpArea', 'dataLat', 'dataLng',
])

export default function TauruRecordEditPage() {
  const router = useRouter()
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null)
  const [toast, setToast] = useState(null)
  const [viewImage, setViewImage] = useState(null)

  function showToast(msg, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  function updateField(key, value) {
    setRecord(current => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    if (!id) return
    async function load() {
      setLoading(true)
      try {
        const r = await fetch(`/api/tauru/${id}`)
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Failed to fetch record')
        setRecord(d.record)
      } catch (err) {
        showToast(err.message, false)
        router.push('/tauru-records')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  async function handlePhotoUpload(key, file) {
    if (!file) return
    setUploading(key)
    try {
      const form = new FormData()
      form.append('image', file)
      const r = await fetch('/api/tauru/upload-image', { method: 'POST', body: form })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Upload failed')
      updateField(key, d.imageUrl)
      showToast('Photo uploaded — click Update Record to save')
    } catch (err) {
      showToast(err.message, false)
    } finally {
      setUploading(null)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const r = await fetch(`/api/tauru/${id}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(record),
      })
      const d = await r.json()
      if (!r.ok) return showToast(d.error || 'Failed to update', false)
      showToast('Record updated successfully')
      router.push('/tauru-records')
    } finally {
      setSaving(false)
    }
  }

  function renderControl(key) {
    const value = record[key]
    if (READ_ONLY.has(key)) {
      const shown = value == null || value === '' ? '—' : DATE_FIELDS.has(key) ? new Date(value).toLocaleString() : String(value)
      return <input value={shown} readOnly className={styles.inputReadonly} />
    }
    if (OPTIONS[key]) {
      const options = OPTIONS[key].includes(value) || !value ? OPTIONS[key] : [value, ...OPTIONS[key]]
      return (
        <select value={value ?? ''} onChange={e => updateField(key, e.target.value)} className={styles.recordSelect}>
          <option value="">Select {LABELS[key].toLowerCase()}</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )
    }
    return (
      <input
        type={NUMBER_FIELDS.has(key) ? 'number' : 'text'}
        step={key === 'dataLat' || key === 'dataLng' ? 'any' : key === 'membersInHouse' ? '1' : '0.01'}
        value={value ?? ''}
        onChange={e => updateField(key, e.target.value)}
        placeholder={LABELS[key]}
        className={styles.recordInput}
      />
    )
  }

  if (loading || !record) {
    return <main className={styles.main}><div className={styles.empty}>Loading record...</div></main>
  }

  const hasLocation = record.dataLat != null && record.dataLng != null && record.dataLat !== '' && record.dataLng !== ''

  return (
    <>
      <main className={styles.main}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Edit Tauru Record</h1>
            <p className={styles.pageSubtitle}>Record ID: {id} · Review and update the survey</p>
          </div>
          <button onClick={() => router.push('/tauru-records')} className={styles.btnCancel}>
            &larr; Back to Tauru Records
          </button>
        </header>

        <section className={styles.recordHero}>
          <div className={styles.recordHeroMain}>
            <span className={styles.recordKicker}>Record summary</span>
            <h2 className={styles.recordHeroTitle}>{record.ownerName || 'Unnamed owner'}</h2>
            <p className={styles.recordHeroSubtitle}>
              House {record.houseNo || '—'} · Property ID {record.propertyId || '—'} · {record.mohallaName || 'Mohalla not set'}
            </p>
          </div>
          <div className={styles.recordSummaryGrid}>
            <div className={styles.recordSummaryItem}>
              <span className={styles.recordSummaryLabel}>Ward</span>
              <span className={styles.recordSummaryValue}>{record.wardNoOrName || '—'}</span>
            </div>
            <div className={styles.recordSummaryItem}>
              <span className={styles.recordSummaryLabel}>Surveyor</span>
              <span className={styles.recordSummaryValue}>{record.submittedByName || '—'}</span>
            </div>
            <div className={styles.recordSummaryItem}>
              <span className={styles.recordSummaryLabel}>Submitted</span>
              <span className={styles.recordSummaryValue}>{record.submittedAt ? new Date(record.submittedAt).toLocaleString() : '—'}</span>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className={styles.recordForm}>
          {SECTIONS.map(section => (
            <section key={section.title} className={styles.recordSection}>
              <div className={styles.recordSectionHeader}>
                <div>
                  <h3 className={styles.recordSectionTitle}>{section.title}</h3>
                  <p className={styles.recordSectionHint}>{section.hint}</p>
                </div>
              </div>
              <div className={styles.recordGrid}>
                {section.fields.map(key => (
                  <div key={key} className={styles.recordField}>
                    <label className={styles.recordFieldLabel}>{LABELS[key]}</label>
                    {renderControl(key)}
                  </div>
                ))}
              </div>
              {section.title === 'GPS & Remarks' && hasLocation && (
                <a
                  href={`https://www.google.com/maps?q=${record.dataLat},${record.dataLng}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.btnEdit}
                  style={{ marginTop: '12px', textDecoration: 'none' }}
                >
                  📍 Open location in Google Maps
                </a>
              )}
            </section>
          ))}

          <section className={styles.recordSection}>
            <div className={styles.recordSectionHeader}>
              <div>
                <h3 className={styles.recordSectionTitle}>Photos</h3>
                <p className={styles.recordSectionHint}>Click View to open a photo. Replacing uploads to the tauruimage container.</p>
              </div>
            </div>
            <div className={styles.recordGrid}>
              {PHOTOS.map(([key, label]) => (
                <div key={key} className={styles.recordField}>
                  <label className={styles.recordFieldLabel}>{label}</label>
                  {/* Photos load only on View, to avoid blob egress on every page open. */}
                  <div className={styles.inputReadonly} style={{ color: record[key] ? '#15803d' : '#9ca3af' }}>
                    {record[key] ? '✅ Photo available' : 'No photo'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    {record[key] && (
                      <button type="button" className={styles.btnSave} style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => setViewImage(record[key])}>
                        👁️ View
                      </button>
                    )}
                    <label className={styles.btnEdit} style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                      {uploading === key ? 'Uploading…' : record[key] ? '🔄 Replace' : '⬆️ Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        disabled={Boolean(uploading)}
                        onChange={e => { handlePhotoUpload(key, e.target.files?.[0]); e.target.value = '' }}
                      />
                    </label>
                    {record[key] && (
                      <button type="button" className={styles.btnDelete} onClick={() => updateField(key, null)}>Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className={styles.recordActions}>
            <div className={styles.recordActionsHint}>Changes are saved back to the same Tauru record.</div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={() => router.push('/tauru-records')}>Cancel</button>
              <button type="submit" className={styles.btnSave} disabled={saving || Boolean(uploading)}>
                {saving ? 'Saving…' : 'Update Record'}
              </button>
            </div>
          </div>
        </form>
      </main>

      {viewImage && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
          onClick={() => setViewImage(null)}
        >
          <div style={{ background: '#fff', padding: '16px', borderRadius: '8px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setViewImage(null)}
              style={{ alignSelf: 'flex-end', marginBottom: '8px', background: '#dc3545', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Close
            </button>
            <img src={viewImage} alt="Preview" style={{ maxWidth: '100%', maxHeight: 'calc(90vh - 60px)', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      {toast && <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>}
    </>
  )
}
