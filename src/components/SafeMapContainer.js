"use client"

import { useEffect, useState } from 'react'
import { MapContainer as LeafletMapContainer } from 'react-leaflet'

/**
 * Avoids Leaflet "Map container is already initialized" when React
 * remounts the tree (Strict Mode, dynamic imports, route transitions).
 */
export default function SafeMapContainer({
  children,
  placeholder = null,
  style,
  className,
  ...mapProps
}) {
  const [hostKey] = useState(() => `leaflet-${Math.random().toString(36).slice(2)}`)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    const frame = requestAnimationFrame(() => {
      if (!cancelled) setIsReady(true)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      setIsReady(false)
    }
  }, [])

  if (!isReady) {
    if (placeholder) return placeholder

    return (
      <div
        style={{ width: '100%', height: '100%', ...(style || {}) }}
        className={className}
        aria-hidden="true"
      />
    )
  }

  return (
    <div
      key={hostKey}
      style={{ width: '100%', height: '100%', ...(style || {}) }}
      className={className}
    >
      <LeafletMapContainer
        {...mapProps}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </LeafletMapContainer>
    </div>
  )
}
