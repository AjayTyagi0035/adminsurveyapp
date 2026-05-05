import pool from '../../../lib/db'

/**
 * GET    /api/surveyors/[id]   – get a single surveyor
 * PUT    /api/surveyors/[id]   – update name / mobile / password
 * DELETE /api/surveyors/[id]   – delete a surveyor
 */
export default async function handler(req, res) {
  const { id } = req.query
  if (isNaN(Number(id))) return res.status(400).json({ error: 'Invalid id' })

  const client = await pool.connect()
  try {
    if (req.method === 'GET') {
      const r = await client.query(
        `SELECT id, name, mobile, role, is_blocked, blocked_reason, created_at, updated_at
         FROM users WHERE id = $1 AND role = 'surveyor'`,
        [id]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Surveyor not found' })
      return res.status(200).json({ surveyor: r.rows[0] })
    }

    if (req.method === 'PUT') {
      const { name, mobile, password } = req.body ?? {}
      // Build dynamic SET clause for only the provided fields
      const fields = []
      const values = []
      let idx = 1
      if (name)     { fields.push(`name = $${idx++}`);          values.push(name) }
      if (mobile)   { fields.push(`mobile = $${idx++}`);        values.push(mobile) }
      if (password) { fields.push(`password_hash = $${idx++}`); values.push(password) }
      if (fields.length === 0)
        return res.status(400).json({ error: 'Provide at least one field to update' })

      fields.push(`updated_at = NOW()`)
      values.push(id)

      const r = await client.query(
        `UPDATE users SET ${fields.join(', ')}
         WHERE id = $${idx} AND role = 'surveyor'
         RETURNING id, name, mobile, role, is_blocked, updated_at`,
        values
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Surveyor not found' })
      return res.status(200).json({ surveyor: r.rows[0] })
    }

    if (req.method === 'DELETE') {
      const r = await client.query(
        `DELETE FROM users WHERE id = $1 AND role = 'surveyor' RETURNING id`,
        [id]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Surveyor not found' })
      return res.status(200).json({ ok: true, deleted_id: Number(id) })
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
