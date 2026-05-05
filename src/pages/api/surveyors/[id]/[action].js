import pool from '../../../lib/db'

/**
 * POST /api/surveyors/[id]/block
 * Body: { reason? }   – block a surveyor (they cannot login)
 *
 * POST /api/surveyors/[id]/unblock
 *                     – unblock a surveyor
 *
 * Both return: { ok: true, surveyor: { id, name, mobile, is_blocked, blocked_reason } }
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { id, action } = req.query   // action = 'block' | 'unblock'
  if (isNaN(Number(id))) return res.status(400).json({ error: 'Invalid id' })
  if (action !== 'block' && action !== 'unblock')
    return res.status(400).json({ error: 'action must be block or unblock' })

  const client = await pool.connect()
  try {
    let r
    if (action === 'block') {
      const { reason } = req.body ?? {}
      r = await client.query(
        `UPDATE users
         SET is_blocked = TRUE, blocked_at = NOW(), blocked_reason = $2, updated_at = NOW()
         WHERE id = $1 AND role = 'surveyor'
         RETURNING id, name, mobile, is_blocked, blocked_reason`,
        [id, reason ?? null]
      )
    } else {
      r = await client.query(
        `UPDATE users
         SET is_blocked = FALSE, blocked_at = NULL, blocked_reason = NULL, updated_at = NOW()
         WHERE id = $1 AND role = 'surveyor'
         RETURNING id, name, mobile, is_blocked, blocked_reason`,
        [id]
      )
    }

    if (r.rowCount === 0) return res.status(404).json({ error: 'Surveyor not found' })
    return res.status(200).json({ ok: true, surveyor: r.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}
