import pool from '../../../../../lib/db'

export default async function handler(req, res) {
  const client = await pool.connect()
  try {
    if (req.method === 'GET') {
      const { id } = req.query ?? {}
      if (!id) return res.status(400).json({ error: 'ulb id is required' })

      const r = await client.query(
        `SELECT id, ward_no FROM wards WHERE ulb_id = $1 ORDER BY ward_no`,
        [id]
      )
      return res.status(200).json({ wards: r.rows })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}
