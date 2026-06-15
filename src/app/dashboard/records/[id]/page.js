"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useParams } from 'next/navigation'
import styles from '../../dashboard.module.css'

const MAP_ULB_ID = 1

const EditRecordMapComponent = dynamic(() => import('./EditRecordMapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: '350px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginTop: '12px' }}>
      Loading map...
    </div>
  ),
})

export default function EditRecordPage() {
  const router = useRouter()
  const params = useParams()
  const { id } = params
  const [record, setRecord] = useState(null)
  const [otherProperties, setOtherProperties] = useState([])
  const [wards, setWards] = useState([])
  const [selectedWardId, setSelectedWardId] = useState('')
  const [loadingWards, setLoadingWards] = useState(false)
  const [showDroneLayer, setShowDroneLayer] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [viewImage, setViewImage] = useState(null)
  const wardInitializedRef = useRef(false)

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
      title: 'Utilities',
      hint: 'Water tank and related service details.',
      fields: ['watertank_present'],
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
        'watertank_tax_current', 'watertank_tax_arrear', 'watertank_tax_interest', 'total_watertank_tax', 'total_tax',
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
    if (key === 'watertank_present') return 'water tank present'
    return key.split('_').join(' ')
  }

  function formatValue(key, value) {
    if (value === null || value === undefined || value === '') return '—'
    if (key === 'created_at' || key === 'updated_at') return new Date(value).toLocaleString()
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    return String(value)
  }

  function updateField(key, nextValue) {
    setRecord(current => ({ ...current, [key]: nextValue }))
  }

  function parseGpsLocation(gps) {
    if (!gps) return null
    const [latRaw, lngRaw] = gps.split(',').map(part => part.trim())
    const lat = parseFloat(latRaw)
    const lng = parseFloat(lngRaw)
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null
    return { lat, lng }
  }

  const currentLocation = useMemo(
    () => (record ? parseGpsLocation(record.gps_location) : null),
    [record]
  )

  const filteredOtherProperties = useMemo(() => {
    if (!record) return otherProperties

    const current = parseGpsLocation(record.gps_location)
    return otherProperties.filter(prop => {
      if (String(prop.id) === String(record.id)) return false

      if (current) {
        const lat = parseFloat(prop.latitude)
        const lng = parseFloat(prop.longitude)
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          const sameLat = Math.abs(lat - current.lat) < 0.000001
          const sameLng = Math.abs(lng - current.lng) < 0.000001
          if (sameLat && sameLng) return false
        }
      }

      return true
    })
  }, [otherProperties, record])

  const handleLocationChange = useCallback((latlng) => {
    updateField('gps_location', `${latlng.lat},${latlng.lng}`)
  }, [])

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

    if (key === 'photo_gps' || key === 'street_light_photo') {
      return (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={record[key] ?? ''}
            onChange={e => updateField(key, e.target.value)}
            placeholder={formatLabel(key)}
            readOnly={isReadOnly}
            className={isReadOnly ? styles.inputReadonly : styles.recordInput}
            style={{ flex: 1 }}
          />
          {record[key] && (
            <button
              type="button"
              style={{ padding: '0 16px', cursor: 'pointer', borderRadius: '4px', border: '1px solid #ccc' }}
              onClick={() => setViewImage(`https://cdn.omgauamrit.in/${record[key]}`)}
            >
              View
            </button>
          )}
        </div>
      )
    }

    if (key === 'watertank_present') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px', padding: '0 2px' }}>
          <input
            type="checkbox"
            checked={Boolean(record[key])}
            onChange={e => updateField(key, e.target.checked)}
          />
          <span style={{ fontSize: '14px', color: '#374151' }}>{record[key] ? 'Present' : 'Not present'}</span>
        </label>
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

  useEffect(() => {
    async function loadWards() {
      setLoadingWards(true)
      try {
        const res = await fetch(`/api/locations/ulbs/${MAP_ULB_ID}/wards`)
        if (!res.ok) throw new Error('Failed to fetch wards')
        const data = await res.json()
        setWards(data.wards ?? [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingWards(false)
      }
    }

    loadWards()
  }, [])

  useEffect(() => {
    if (record?.ward_id && !wardInitializedRef.current) {
      setSelectedWardId(String(record.ward_id))
      wardInitializedRef.current = true
    }
  }, [record])

  useEffect(() => {
    async function loadOtherProperties() {
      try {
        const wardParam = selectedWardId ? `?ward_id=${selectedWardId}` : ''
        const res = await fetch(`/api/property-surveys/map${wardParam}`)
        if (!res.ok) throw new Error('Failed to fetch property survey locations')
        const data = await res.json()
        setOtherProperties(data)
      } catch (err) {
        console.error(err)
      }
    }

    loadOtherProperties()
  }, [selectedWardId])

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

              {section.title === 'Location' && (
                <>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '180px' }}>
                      <label className={styles.recordFieldLabel} htmlFor="edit-map-ward-filter">Ward</label>
                      <select
                        id="edit-map-ward-filter"
                        value={selectedWardId}
                        onChange={e => setSelectedWardId(e.target.value)}
                        className={styles.recordSelect}
                      >
                        <option value="">{loadingWards ? 'Loading wards…' : 'All wards'}</option>
                        {wards.map(ward => (
                          <option key={ward.id} value={ward.id}>
                            Ward {ward.ward_no}
                          </option>
                        ))}
                      </select>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#334155', cursor: 'pointer', marginTop: '22px' }}>
                      <input
                        type="checkbox"
                        checked={showDroneLayer}
                        onChange={e => setShowDroneLayer(e.target.checked)}
                      />
                      Show drone imagery
                    </label>
                  </div>
                  <EditRecordMapComponent
                    currentLocation={currentLocation}
                    otherProperties={filteredOtherProperties}
                    onLocationChange={handleLocationChange}
                    showDroneLayer={showDroneLayer}
                  />
                </>
              )}
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

      {viewImage && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
          onClick={() => setViewImage(null)}
        >
          <div style={{ position: 'relative', background: '#fff', padding: '16px', borderRadius: '8px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
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

      {toast && (
        <div className={toast.ok ? styles.toastOk : styles.toastErr}>{toast.msg}</div>
      )}
    </div>
  )
}
