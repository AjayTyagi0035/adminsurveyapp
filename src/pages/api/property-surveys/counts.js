import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const client = await pool.connect()
  try {
    const r = await client.query(
      `SELECT
          COUNT(*)::int AS total_surveys,
          COUNT(*) FILTER (WHERE gps_location IS NOT NULL)::int AS completed_surveys,
          COUNT(*) FILTER (WHERE gps_location IS NULL)::int AS uncompleted_surveys
       FROM property_surveys`
    )

    const row = r.rows[0] ?? {}

    return res.status(200).json({
      totalSurveys: row.total_surveys ?? 0,
      completedSurveys: row.completed_surveys ?? 0,
      uncompletedSurveys: row.uncompleted_surveys ?? 0,
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)