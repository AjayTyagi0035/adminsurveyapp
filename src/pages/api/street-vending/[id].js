import withCors from '../../../lib/cors'
import pool from '../../../lib/db'
import { SV_COLUMNS, SV_FROM, issueIdCard, pickWritable, placeholder } from '../../../lib/streetVending'

/**
 * GET    /api/street-vending/[id]  – full record
 * PUT    /api/street-vending/[id]  – partial update (body keys = column names,
 *        optional `updated_by`). status 'submitted'/'idIssued' also generates
 *        any missing application / ID card numbers.
 * DELETE /api/street-vending/[id]  – delete record
 */
async function handler(req, res) {
  const { id } = req.query
  if (!/^\d+$/.test(String(id))) return res.status(400).json({ error: 'Invalid id' })

  try {
    if (req.method === 'GET') {
      const r = await pool.query(`SELECT ${SV_COLUMNS} ${SV_FROM} WHERE s.id = $1`, [id])
      if (r.rowCount === 0) return res.status(404).json({ error: 'Record not found' })
      return res.status(200).json({ record: r.rows[0] })
    }

    if (req.method === 'PUT') return update(req, res, id)

    if (req.method === 'DELETE') {
      const r = await pool.query(`DELETE FROM public.street_vendors WHERE id = $1 RETURNING id`, [id])
      if (r.rowCount === 0) return res.status(404).json({ error: 'Record not found' })
      return res.status(200).json({ ok: true, deleted_id: Number(id) })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

async function update(req, res, id) {
  let fields
  try {
    fields = pickWritable(req.body)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
  // The original surveyor stays the owner of the record.
  delete fields.created_by
  // Portal edits: the logged-in admin (auth_token cookie = user id).
  if (fields.updated_by == null && /^\d+$/.test(req.cookies?.auth_token ?? '')) {
    fields.updated_by = Number(req.cookies.auth_token)
  }

  const issue = fields.status === 'submitted' || fields.status === 'idIssued'
  if (issue) delete fields.status // set to idIssued by issueIdCard below

  const columns = Object.keys(fields)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    let record
    if (columns.length) {
      const r = await client.query(
        `UPDATE public.street_vendors
         SET ${columns.map((c, i) => `${c} = ${placeholder(c, i + 1)}`).join(', ')}, updated_at = NOW()
         WHERE id = $${columns.length + 1}
         RETURNING *`,
        [...columns.map(c => fields[c]), id]
      )
      record = r.rows[0]
    } else {
      const r = await client.query(`SELECT * FROM public.street_vendors WHERE id = $1`, [id])
      record = r.rows[0]
    }
    if (!record) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Record not found' })
    }
    if (issue) record = await issueIdCard(client, id, fields.updated_by ?? null)
    await client.query('COMMIT')
    return res.status(200).json({ record })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    if (err.code === '23503') return res.status(400).json({ error: 'Unknown user (updated_by)' })
    if (err.code === '23505') return res.status(409).json({ error: 'Application / ID card number already exists' })
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)
