import withCors from '../../../lib/cors'
import pool from '../../../lib/db'
import { buildTauruFilters } from '../../../lib/tauru'

/** GET /api/tauru/export – CSV of all records matching the same filters as /api/tauru. */
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { where, values } = buildTauruFilters(req.query)

  try {
    const r = await pool.query(
      `SELECT t.*, u.name AS "submittedByName"
       FROM public."Taru" t
       LEFT JOIN users u ON u.id = t."submittedBy"
       ${where}
       ORDER BY t.id DESC`,
      values
    )

    const columns = r.fields.map(f => f.name)
    const escape = value => {
      if (value === null || value === undefined) return ''
      const s = value instanceof Date ? value.toISOString() : String(value)
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const csv = [
      columns.join(','),
      ...r.rows.map(row => columns.map(c => escape(row[c])).join(',')),
    ].join('\n')

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="tauru_records_${new Date().toISOString().slice(0, 10)}.csv"`)
    return res.status(200).send('﻿' + csv)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export default withCors(handler)
