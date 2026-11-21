import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

/** GET /api/street-vending/counts – headline numbers for the Street Vending page. */
async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const r = await pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'idIssued')::int AS issued,
         COUNT(*) FILTER (WHERE status <> 'idIssued')::int AS drafts,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')::int AS today
       FROM public.street_vendors`
    )
    return res.status(200).json(r.rows[0])
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export default withCors(handler)
