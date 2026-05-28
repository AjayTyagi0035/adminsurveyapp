import pool from '../../../../../lib/db'

export default async function handler(req, res) {
  const client = await pool.connect()
  try {
    if (req.method === 'GET') {
      const { id } = req.query ?? {}
      if (!id) return res.status(400).json({ error: 'district id is required' })

      const r = await client.query(
        `SELECT id, ulb_name FROM ulbs WHERE district_id = $1 ORDER BY ulb_name`,
        [id]
      )
      return res.status(200).json({ ulbs: r.rows })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}
