"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const Map = dynamic(() => import('./SirsaMapClient'), { ssr: false, loading: () => <div style={{ height: 350, display: 'grid', placeItems: 'center', color: '#64748b' }}>Loading map…</div> })

export default function SirsaMap(props) {
  return <Map {...props} />
}