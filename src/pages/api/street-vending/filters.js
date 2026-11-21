import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

/**
 * GET /api/street-vending/filters – distinct values for the search dropdowns.
 * ?municipality= narrows zones; ?zone= narrows wards.
 */
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const municipality = String(req.query.municipality ?? '').trim()
  const zone = String(req.query.zone ?? '').trim()

  const distinct = async (column, conditions = []) => {
    const where = [`NULLIF(TRIM(${column}), '') IS NOT NULL`]
    const values = []
    for (const [col, value] of conditions) {
      if (!value) continue
      values.push(value)
      where.push(`${col} = $${values.length}`)
    }
    const r = await pool.query(
      `SELECT DISTINCT TRIM(${column}) AS v FROM public.street_vendors WHERE ${where.join(' AND ')} ORDER BY 1`,
      values
    )
    return r.rows.map(row => row.v)
  }

  try {
    const [municipalities, zones, wards] = await Promise.all([
      distinct('municipality_name'),
      distinct('zone_name', [['municipality_name', municipality]]),
      distinct('ward_name', [['municipality_name', municipality], ['zone_name', zone]]),
    ])
    return res.status(200).json({ municipalities, zones, wards })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export default withCors(handler)
