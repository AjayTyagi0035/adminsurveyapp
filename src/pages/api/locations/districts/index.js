import pool from '../../../../lib/db'

export default async function handler(req, res) {
  const client = await pool.connect()
  try {
    if (req.method === 'GET') {
      const r = await client.query(
        `SELECT id, district_name FROM districts ORDER BY district_name`
      )
      return res.status(200).json({ districts: r.rows })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}
