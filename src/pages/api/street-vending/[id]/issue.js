import withCors from '../../../../lib/cors'
import pool from '../../../../lib/db'
import { issueIdCard } from '../../../../lib/streetVending'

/**
 * POST /api/street-vending/[id]/issue  – generate Form II application number
 * and Form III ID card (number + validity) for a record. Existing numbers are kept.
 */
async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { id } = req.query
  if (!/^\d+$/.test(String(id))) return res.status(400).json({ error: 'Invalid id' })

  try {
    const token = req.cookies?.auth_token ?? ''
    const userId = Number(req.body?.updated_by) || (/^\d+$/.test(token) ? Number(token) : null)
    const record = await issueIdCard(pool, id, userId)
    if (!record) return res.status(404).json({ error: 'Record not found' })
    return res.status(200).json({ record })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Application / ID card number already exists' })
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export default withCors(handler)
