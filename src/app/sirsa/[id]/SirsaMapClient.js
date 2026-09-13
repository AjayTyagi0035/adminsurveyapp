"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import SafeMapContainer from '../../../components/SafeMapContainer'

const DEFAULT_CENTER = [29.405678, 77.208220]
const dotSvg = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"><circle cx="6" cy="6" r="5" fill="#ef4444" stroke="#fff" stroke-width="1"/></svg>')}`
const pinSvg = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="38" height="38"><path fill="#facc15" d="M384 192c0 87-117 243-168 307-12 15-35 15-47 0C117 435 0 279 0 192 0 86 86 0 192 0s192 86 192 192z"/><circle cx="192" cy="190" r="56" fill="#fff"/></svg>')}`
let dotIcon
let pinIcon
if (typeof window !== 'undefined') {
  dotIcon = L.icon({ iconUrl: dotSvg, iconSize: [12, 12], iconAnchor: [6, 6] })
  pinIcon = L.icon({ iconUrl: pinSvg, iconSize: [38, 38], iconAnchor: [19, 38] })
}

function CenterMap({ position }) {
  const map = useMap()
  const centered = useRef(false)
  useEffect(() => {
    if (position && !centered.current) {
      map.setView(position, 17)
      centered.current = true
    }
  }, [map, position])
  return null
}

function MapEvents({ onChange }) {
  useMapEvents({ click: event => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }) })
  return null
}

export default function SirsaMapClient({ record, onLocationChange }) {
  const currentPosition = useMemo(() => {
    const lat = Number(record?.dataLat)
    const lng = Number(record?.dataLng)
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
  }, [record?.dataLat, record?.dataLng])
  const [properties, setProperties] = useState([])

  useEffect(() => {
    fetch('/api/sirsa/map?all=true')
      .then(response => response.json())
      .then(data => setProperties(Array.isArray(data.data) ? data.data : []))
      .catch(() => setProperties([]))
  }, [])

  const center = currentPosition ? [currentPosition.lat, currentPosition.lng] : DEFAULT_CENTER
  return <div style={{ width: '100%', height: 350, marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
    <SafeMapContainer center={center} zoom={currentPosition ? 17 : 14} style={{ width: '100%', height: '100%' }} zoomControl>
      <TileLayer url="https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" subdomains={['0', '1', '2', '3']} maxZoom={22} attribution="&copy; Google Maps" />
      <CenterMap position={currentPosition} />
      <MapEvents onChange={onLocationChange} />
      {properties.map(property => {
        const position = [Number(property.dataLat), Number(property.dataLng)]
        if (!Number.isFinite(position[0]) || !Number.isFinite(position[1]) || String(property.id) === String(record.id)) return null
        return <Marker key={String(property.id)} position={position} icon={dotIcon}><Tooltip direction="top"><div><strong>Owner:</strong> {property.ownerName || '—'}</div><div><strong>House No:</strong> {property.houseNo || '—'}</div><div><strong>Mohalla:</strong> {property.mohallaName || '—'}</div></Tooltip></Marker>
      })}
      {currentPosition && <Marker position={[currentPosition.lat, currentPosition.lng]} icon={pinIcon} draggable eventHandlers={{ dragend: event => { const position = event.target.getLatLng(); onLocationChange({ lat: position.lat, lng: position.lng }) } }}></Marker>}
    </SafeMapContainer>
  </div>
}