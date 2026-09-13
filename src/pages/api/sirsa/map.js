import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const mohallaName = String(req.query.mohallaName ?? '').trim()
  const showAll = String(req.query.all ?? '').toLowerCase() === 'true'
  if (!mohallaName && !showAll) return res.status(400).json({ error: 'mohallaName is required' })

  const client = await pool.connect()
  try {
    const result = await client.query(
      `SELECT "id", "mohallaName", "houseNo", "ownerName", "dataLat", "dataLng"
       FROM surveyor_s_submissions
       WHERE "dataLat" IS NOT NULL
         AND "dataLng" IS NOT NULL
       ${showAll ? '' : 'AND "mohallaName" ILIKE $1'}
       ORDER BY id DESC`,
      showAll ? [] : [mohallaName]
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