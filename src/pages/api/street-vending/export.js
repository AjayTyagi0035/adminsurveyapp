import withCors from '../../../lib/cors'
import pool from '../../../lib/db'
import { SV_COLUMNS, SV_FROM, buildStreetVendorFilters } from '../../../lib/streetVending'

/** GET /api/street-vending/export – CSV of all vendors matching the same filters as /api/street-vending. */
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { where, values } = buildStreetVendorFilters(req.query)

  try {
    const r = await pool.query(`SELECT ${SV_COLUMNS} ${SV_FROM} ${where} ORDER BY s.id DESC`, values)

    const columns = r.fields.map(f => f.name)
    const escape = value => {
      if (value === null || value === undefined) return ''
      let s
      if (value instanceof Date) s = value.toISOString()
      else if (Array.isArray(value) && value.every(v => typeof v !== 'object')) s = value.join('; ')
      else if (typeof value === 'object') s = JSON.stringify(value)
      else s = String(value)
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [
      columns.join(','),
      ...r.rows.map(row => columns.map(c => escape(row[c])).join(',')),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="street_vendors_${new Date().toISOString().slice(0, 10)}.csv"`)
    return res.status(200).send('﻿' + csv)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export default withCors(handler)
