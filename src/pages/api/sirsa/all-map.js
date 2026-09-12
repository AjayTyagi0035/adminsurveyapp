import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT "id", "mohallaName", "wardNoOrName", "propertyId", "houseNo", "ownerName", "dataLat", "dataLng"
       FROM surveyor_s_submissions
       WHERE "dataLat" IS NOT NULL
         AND "dataLng" IS NOT NULL
         AND "dataLat" BETWEEN -90 AND 90
         AND "dataLng" BETWEEN -180 AND 180
       ORDER BY "id" DESC`
    )
    return res.status(200).json({ data: result.rows })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)
