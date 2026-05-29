import withCors from '../../../../lib/cors'
import pool from '../../../../lib/db'

async function handler(req, res) {
  const client = await pool.connect()
  try {
    if (req.method === 'GET') {
      const r = await client.query(
        `SELECT id, district_name FROM districts ORDER BY district_name`
      )
      return res.status(200).json({ districts: r.rows })
    }

    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)
