"use client"
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter } from 'next/navigation'
import styles from '../../dashboard/dashboard.module.css'

const SirsaMap = dynamic(() => import('./SirsaMap'), { ssr: false })
const fields = [
  ['ulbName', 'ULB'], ['district', 'District'], ['mohallaName', 'Mohalla'], ['wardNoOrName', 'Ward'], ['propertyId', 'Property ID'], ['houseNo', 'House No'],
  ['ownerName', 'Owner Name'], ['fatherOrHusbandName', 'Father / Husband Name'], ['membersInHouse', 'Members in House'], ['address', 'Address'], ['mobileNo', 'Mobile No'],
  ['natureOfHouse', 'Nature of House'], ['WidthofRoadInFront', 'Road Width'], ['Typeofconstruction', 'Type of Construction'], ['Useofhouse', 'Use of House'],
  ['frontWidthofPlotInFeet', 'Plot Front Width'], ['depthofPlotInFeet', 'Plot Depth'], ['totalAreaInFeet', 'Total Area'], ['builtUpArea', 'Built-up Area'], ['openArea', 'Open Area'],
  ['ifmixed', 'Mixed Details'], ['firstFloorArea', 'First Floor Area'], ['secondFloorArea', 'Second Floor Area'], ['thirdFloorArea', 'Third Floor Area'], ['fourthFloorArea', 'Fourth Floor Area'],
  ['totalBuiltUpArea', 'Total Built-up Area'], ['occupancyStatus', 'Occupancy Status'], ['waterConnection', 'Water Connection'], ['sewerConnection', 'Sewer Connection'], ['remarks', 'Remarks'],
]
const readOnlyFields = new Set(['id', 'updatedAt'])

export default function SirsaEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!id) return
    fetch(`/api/sirsa/${id}`).then(response => response.json()).then(data => {
      if (!data.record) throw new Error(data.error || 'Failed to load record')
      setRecord(data.record)
    }).catch(error => setToast({ msg: error.message, ok: false })).finally(() => setLoading(false))
  }, [id])

  function updateField(field, value) {
    setRecord(current => ({ ...current, [field]: value }))
  }

  function handleLocationChange(position) {
    updateField('dataLat', position.lat)
    updateField('dataLng', position.lng)
  }

  async function saveRecord(event) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch(`/api/sirsa/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(record) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update record')
      setToast({ msg: 'Sirsa record updated successfully', ok: true })
      setTimeout(() => router.push('/sirsa'), 700)
    } catch (error) {
      setToast({ msg: error.message, ok: false })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className={styles.main}><div className={styles.empty}>Loading Sirsa record…</div></main>
  if (!record) return <main className={styles.main}><div className={styles.empty}>Sirsa record not found.</div></main>

  return <main className={styles.main}>
    <header className={styles.header}><div><h1 className={styles.pageTitle}>Edit Sirsa Record</h1><p className={styles.pageSubtitle}>Record ID: {record.id}</p></div><button className={styles.btnCancel} onClick={() => router.back()}>&larr; Back to Sirsa</button></header>
    <section className={styles.recordHero}>
      <div className={styles.recordHeroMain}><span className={styles.recordKicker}>Sirsa record summary</span><h2 className={styles.recordHeroTitle}>{record.ownerName || 'Unnamed owner'}</h2><p className={styles.recordHeroSubtitle}>House {record.houseNo || '—'} · {record.mohallaName || 'Mohalla not set'}</p></div>
      <div className={styles.recordSummaryGrid}><div className={styles.recordSummaryItem}><span className={styles.recordSummaryLabel}>Mohalla</span><span className={styles.recordSummaryValue}>{record.mohallaName || '—'}</span></div><div className={styles.recordSummaryItem}><span className={styles.recordSummaryLabel}>Ward</span><span className={styles.recordSummaryValue}>{record.wardNoOrName || '—'}</span></div><div className={styles.recordSummaryItem}><span className={styles.recordSummaryLabel}>Coordinates</span><span className={styles.recordSummaryValue}>{record.dataLat && record.dataLng ? `${record.dataLat}, ${record.dataLng}` : '—'}</span></div></div>
    </section>
    <form onSubmit={saveRecord} className={styles.recordForm}>
      <section className={styles.recordSection}><div className={styles.recordSectionHeader}><div><h3 className={styles.recordSectionTitle}>Location</h3><p className={styles.recordSectionHint}>The map shows only records from this record&apos;s mohalla.</p></div></div><div className={styles.recordGrid}>{fields.slice(0, 6).map(([field, label]) => <div className={styles.recordField} key={field}><label className={styles.recordFieldLabel}>{label}</label><input className={readOnlyFields.has(field) ? styles.inputReadonly : styles.recordInput} value={record[field] ?? ''} readOnly={readOnlyFields.has(field)} onChange={e => updateField(field, e.target.value)} /></div>)}</div><SirsaMap record={record} onLocationChange={handleLocationChange} /></section>
      <section className={styles.recordSection}><div className={styles.recordSectionHeader}><div><h3 className={styles.recordSectionTitle}>Survey Details</h3><p className={styles.recordSectionHint}>Update the submitted Sirsa survey information.</p></div></div><div className={styles.recordGrid}>{fields.slice(6).map(([field, label]) => <div className={styles.recordField} key={field}><label className={styles.recordFieldLabel}>{label}</label><input className={styles.recordInput} value={record[field] ?? ''} onChange={e => updateField(field, e.target.value)} /></div>)}</div></section>
      <div className={styles.recordActions}><div className={styles.recordActionsHint}>Changes are saved back to the Sirsa survey record.</div><div className={styles.modalActions}><button type="button" className={styles.btnCancel} onClick={() => router.back()}>Cancel</button><button type="submit" className={styles.btnSave} disabled={saving}>{saving ? 'Saving…' : 'Update Record'}</button></div></div>
    </form>
    {toast && <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>}
  </main>
}