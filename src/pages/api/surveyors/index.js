import pool from '../../../lib/db'

/**
 * GET  /api/surveyors          – list all surveyors
 * POST /api/surveyors          – create a new surveyor
 */
export default async function handler(req, res) {
  const client = await pool.connect()
  try {
    if (req.method === 'GET') {
      // ── GET: list surveyors ──────────────────────────────────
      const r = await client.query(
        `SELECT id, name, mobile, role, is_blocked, blocked_reason, created_at, updated_at
         FROM users
         WHERE role = 'surveyor'
         ORDER BY created_at DESC`
      )
      return res.status(200).json({ surveyors: r.rows })
    }

    if (req.method === 'POST') {
      // ── POST: create surveyor ────────────────────────────────
      const { name, mobile, password } = req.body ?? {}
      if (!name || !mobile || !password)
        return res.status(400).json({ error: 'name, mobile and password are required' })

      // TODO: hash password with bcrypt before inserting in production
      const r = await client.query(
        `INSERT INTO users (name, mobile, password_hash, role)
         VALUES ($1, $2, $3, 'surveyor')
         RETURNING id, name, mobile, role, is_blocked, created_at`,
        [name, mobile, password]
      )
      return res.status(201).json({ surveyor: r.rows[0] })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Mobile number already exists' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}
