import withCors from '../../../../../lib/cors'
import pool from '../../../../../lib/db'

async function handler(req, res) {
  const client = await pool.connect()
  try {
    if (req.method === 'GET') {
      const { id } = req.query ?? {}
      if (!id) return res.status(400).json({ error: 'ward id is required' })

      const r = await client.query(
        `SELECT id, mohalla_name FROM mohallas WHERE ward_id = $1 ORDER BY mohalla_name`,
        [id]
      )
      return res.status(200).json({ mohallas: r.rows })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)
