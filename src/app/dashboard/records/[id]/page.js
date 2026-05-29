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

  const dropdownOptions = {
    road_location_width: ['3 -9 meter', '9 -12 meter', '12 -24 meter', '24 -more than  meter'],
    nature_of_house: ['RCC &RBC pakka', 'Semi Pakka', 'Kachha', 'Open Plot'],
    property_type: ['Residential', 'Commercial', 'Mixed self'],
    property_use_as: [
      'Residential Self',
      'Residential rented',
      'Commercial Self',
      'Commercial Rented',
      'Mixed self',
      'Mixed Rented',
      'Temple',
      'Govt Hospital',
      'Pvt hospital',
      'Govt school & college',
      'Pvt school & college',
      'Mosque',
      'Petrol Pump',
      'Hotel',
      'Park',
      'Dharamshala',
    ],
  }

  const sections = [
    {
      title: 'Overview',
      hint: 'Core house and owner details.',
      fields: ['old_house_no', 'new_house_no', 'owner_name', 'father_husband_name', 'mobile_no'],
    },
    {
      title: 'Location',
      hint: 'Administrative and ward mapping.',
      fields: ['district_name', 'ulb_name', 'ward_no', 'mohalla_name', 'old_ward_no', 'old_ward_name', 'old_moholla_name'],
    },
    {
      title: 'Property Details',
      hint: 'Physical property attributes.',
      fields: ['address', 'road_location_width', 'nature_of_house', 'property_type', 'property_use_as', 'construction_year', 'rebate_type', 'financial_year'],
    },
    {
      title: 'Area & Tax',
      hint: 'Measurements and calculated tax fields.',
      fields: [
        'front_feet', 'depth_feet', 'total_plot_area_sqft', 'no_of_floors', 'ground_floor_area',
        'first_floor_area', 'second_floor_area', 'third_floor_area', 'total_residential_area',
        'total_commercial_area', 'empty_area', 'total_current_arv', 'old_house_tax',
        'old_house_tax_arrear', 'house_tax_arrear_2025_26', 'house_tax_current', 'house_tax_arrear',
        'house_tax_interest', 'total_house_tax', 'old_water_tax', 'water_tax_arrear_2025_26',
        'water_tax_current', 'water_tax_arrear', 'water_tax_interest', 'total_water_tax',
      ],
    },
    {
      title: 'Media & Notes',
      hint: 'Files, GPS, and free-form remarks.',
      fields: ['photo_gps', 'street_light_photo', 'gps_location', 'remarks'],
    },
    {
      title: 'System',
      hint: 'Record metadata kept for reference.',
      fields: ['created_by_name', 'created_by', 'created_at', 'updated_at', 'id'],
    },
  ]

  const readOnlyFields = new Set([
    'id',
    'created_at',
    'updated_at',
    'created_by',
    'created_by_name',
    'district_name',
    'ulb_name',
    'ward_no',
    'mohalla_name',
    'old_ward_no',
    'old_ward_name',
    'old_moholla_name',
  ])

  function formatLabel(key) {
    return key.split('_').join(' ')
  }

  function formatValue(key, value) {
    if (value === null || value === undefined || value === '') return '—'
    if (key === 'created_at' || key === 'updated_at') return new Date(value).toLocaleString()
    return String(value)
  }

  function updateField(key, nextValue) {
    setRecord(current => ({ ...current, [key]: nextValue }))
  }

  function renderFieldControl(key) {
    const isReadOnly = readOnlyFields.has(key)
    const options = dropdownOptions[key]

    if (options) {
      return (
        <select
          value={record[key] ?? ''}
          onChange={e => updateField(key, e.target.value)}
          disabled={isReadOnly}
          className={isReadOnly ? styles.inputReadonly : styles.recordSelect}
        >
          <option value="">Select {formatLabel(key)}</option>
          {options.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        value={record[key] ?? ''}
        onChange={e => updateField(key, e.target.value)}
        placeholder={formatLabel(key)}
        readOnly={isReadOnly}
        className={isReadOnly ? styles.inputReadonly : styles.recordInput}
      />
    )
  }

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
      router.push('/records')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !record) {
    return <div className={`${styles.layout} ${styles.recordLoadingShell}`}><div className={styles.empty}>Loading record...</div></div>
  }

  return (
    <div className={styles.layout}>
      <main className={`${styles.main} ${styles.mainStandalone}`}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Edit Property Record</h1>
            <p className={styles.pageSubtitle}>Record ID: {id} · Review and update the survey in grouped sections</p>
          </div>
          <button onClick={() => router.back()} className={styles.btnCancel}>
            &larr; Back to Dashboard
          </button>
        </header>

        <section className={styles.recordHero}>
          <div className={styles.recordHeroMain}>
            <span className={styles.recordKicker}>Record summary</span>
            <h2 className={styles.recordHeroTitle}>{record.owner_name || 'Unnamed owner'}</h2>
            <p className={styles.recordHeroSubtitle}>
              House {record.new_house_no || '—'} · Old house {record.old_house_no || '—'} · {record.mohalla_name || 'Mohalla not set'}
            </p>
          </div>
          <div className={styles.recordSummaryGrid}>
            <div className={styles.recordSummaryItem}>
              <span className={styles.recordSummaryLabel}>Ward</span>
              <span className={styles.recordSummaryValue}>{record.ward_no || '—'}</span>
            </div>
            <div className={styles.recordSummaryItem}>
              <span className={styles.recordSummaryLabel}>ULB</span>
              <span className={styles.recordSummaryValue}>{record.ulb_name || '—'}</span>
            </div>
            <div className={styles.recordSummaryItem}>
              <span className={styles.recordSummaryLabel}>Updated</span>
              <span className={styles.recordSummaryValue}>{formatValue('updated_at', record.updated_at)}</span>
            </div>
          </div>
        </section>

        <form onSubmit={handleRecordUpdate} className={styles.recordForm}>
          {sections.map(section => (
            <section key={section.title} className={styles.recordSection}>
              <div className={styles.recordSectionHeader}>
                <div>
                  <h3 className={styles.recordSectionTitle}>{section.title}</h3>
                  <p className={styles.recordSectionHint}>{section.hint}</p>
                </div>
              </div>

              <div className={styles.recordGrid}>
                {section.fields
                  .filter(field => Object.prototype.hasOwnProperty.call(record, field))
                  .map(key => (
                    <div key={key} className={styles.recordField}>
                      <label className={styles.recordFieldLabel}>{formatLabel(key)}</label>
                      {renderFieldControl(key)}
                    </div>
                  ))}
              </div>
            </section>
          ))}

          <div className={styles.recordActions}>
            <div className={styles.recordActionsHint}>Changes are saved back to the same survey record.</div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnCancel} onClick={() => router.back()}>Cancel</button>
              <button type="submit" className={styles.btnSave} disabled={saving}>
                {saving ? 'Saving…' : 'Update Record'}
              </button>
            </div>
          </div>
        </form>
      </main>

      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>
      )}
    </div>
  )
}
