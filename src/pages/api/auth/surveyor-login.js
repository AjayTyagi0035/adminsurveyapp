import pool from '../../../lib/db'
import { withCors } from '../../../lib/cors'

async function surveyorHandler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { mobile, password } = req.body ?? {}
  if (!mobile || !password) return res.status(400).json({ error: 'Missing credentials' })

  const client = await pool.connect()
  try {
    const r = await client.query(
      `SELECT id, name, mobile, password_hash, role, is_blocked, blocked_reason
       FROM users WHERE mobile = $1`,
      [mobile]
    )
    if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid credentials' })

    const user = r.rows[0]

    // TODO: replace with bcrypt.compare() in production
    if (user.password_hash !== password) return res.status(401).json({ error: 'Invalid credentials' })

    if (user.role !== 'surveyor') {
      return res.status(403).json({ error: 'Access denied', reason: 'Not a surveyor account' })
    }

    if (user.is_blocked) {
      return res.status(403).json({ error: 'Account blocked', reason: user.blocked_reason ?? 'Contact your administrator.' })
    }

    res.status(200).json({ ok: true, user: { id: user.id, name: user.name, mobile: user.mobile, role: user.role } })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(surveyorHandler)
