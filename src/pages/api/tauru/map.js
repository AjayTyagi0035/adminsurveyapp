import withCors from '../../../lib/cors'
import pool from '../../../lib/db'
import { buildTauruFilters } from '../../../lib/tauru'

/**
 * GET /api/tauru/map – lightweight marker data for every Tauru record with GPS.
 * Accepts the same filters as /api/tauru (ward, mohalla, house_no, q, start_date, ...).
 * Optional viewport: ne_lat, ne_lng, sw_lat, sw_lng. Capped at 10,000 rows.
 */
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { where, values } = buildTauruFilters(req.query)
  const conditions = [`t."dataLat" IS NOT NULL`, `t."dataLng" IS NOT NULL`]

  const { ne_lat, ne_lng, sw_lat, sw_lng } = req.query
  const box = [sw_lat, ne_lat, sw_lng, ne_lng].map(Number)
  if (ne_lat && ne_lng && sw_lat && sw_lng && box.every(Number.isFinite)) {
    values.push(...box)
    const n = values.length
    conditions.push(
      `t."dataLat" BETWEEN $${n - 3} AND $${n - 2}`,
      `t."dataLng" BETWEEN $${n - 1} AND $${n}`
    )
  }

  const whereClause = where
    ? `${where} AND ${conditions.join(' AND ')}`
    : `WHERE ${conditions.join(' AND ')}`

  try {
    const r = await pool.query(
      `SELECT t.id, t."houseNo", t."ownerName", t."propertyId", t."wardNoOrName",
              t."mohallaName", t."Useofhouse", t."submittedAt", t."updatedAt",
              t."dataLat"::double precision AS latitude,
              t."dataLng"::double precision AS longitude
       FROM public."Taru" t
       ${whereClause}
       ORDER BY t.id DESC
       LIMIT 10000`,
      values
    )
    return res.status(200).json(r.rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export default withCors(handler)
