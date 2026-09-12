"use client"
import { useEffect, useMemo, useRef } from 'react'
import { CircleMarker, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import SafeMapContainer from '../../components/SafeMapContainer'

const DEFAULT_CENTER = [29.405678, 77.208220]

function FitToPoints({ points }) {
  const map = useMap()
  const fittedKey = useRef('')

  useEffect(() => {
    if (!points.length) return
    const key = points.map(point => `${point[0]},${point[1]}`).join('|')
    if (fittedKey.current === key) return
    fittedKey.current = key

    if (points.length === 1) {
      map.setView(points[0], 17)
      return
    }

    map.fitBounds(points, { padding: [36, 36], maxZoom: 18 })
  }, [map, points])

  return null
}

export default function SirsaAllMapClient({ records }) {
  const mappedRecords = useMemo(() => records.filter(record => {
    const lat = Number(record.dataLat)
    const lng = Number(record.dataLng)
    return Number.isFinite(lat) && Number.isFinite(lng)
  }), [records])
  const points = useMemo(() => mappedRecords.map(record => [Number(record.dataLat), Number(record.dataLng)]), [mappedRecords])

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 18px rgba(15, 23, 42, 0.08)' }}>
      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <strong style={{ color: '#111827' }}>Sirsa survey locations</strong>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 3 }}>Each marker represents one submission. Click a marker for record details.</div>
        </div>
        <span style={{ color: '#475569', fontSize: 13, fontWeight: 600 }}>● {mappedRecords.length} points</span>
      </div>
      <div style={{ height: 'calc(100vh - 245px)', minHeight: 460, minWidth: 0 }}>
        <SafeMapContainer center={points[0] || DEFAULT_CENTER} zoom={points.length ? 15 : 14} style={{ width: '100%', height: '100%' }} zoomControl>
          <TileLayer url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" subdomains={['0', '1', '2', '3']} maxZoom={22} attribution="&copy; Google Maps" />
          <FitToPoints points={points} />
          {mappedRecords.map(record => {
            const position = [Number(record.dataLat), Number(record.dataLng)]
            return (
              <CircleMarker key={String(record.id)} center={position} radius={5} pathOptions={{ color: '#fff', weight: 1.5, fillColor: '#dc2626', fillOpacity: 0.9 }}>
                <Tooltip direction="top" offset={[0, -5]}>
                  <div style={{ minWidth: 150 }}>
                    <div><strong>{record.ownerName || 'Unnamed owner'}</strong></div>
                    <div>House: {record.houseNo || '—'}</div>
                    <div>Mohalla: {record.mohallaName || '—'}</div>
                    <div>Ward: {record.wardNoOrName || '—'}</div>
                    <div>Property ID: {record.propertyId || '—'}</div>
                  </div>
                </Tooltip>
              </CircleMarker>
            )
          })}
        </SafeMapContainer>
      </div>
    </section>
  )
}
