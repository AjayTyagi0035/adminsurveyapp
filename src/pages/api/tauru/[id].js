import withCors from '../../../lib/cors'
import pool from '../../../lib/db'
import { TAURU_FIXED_VALUES, pickWritable } from '../../../lib/tauru'

/**
 * GET    /api/tauru/[id]  – full record
 * PUT    /api/tauru/[id]  – partial update (body keys = "Taru" column names)
 * DELETE /api/tauru/[id]  – delete record
 */
async function handler(req, res) {
  const { id } = req.query
  if (!/^\d+$/.test(String(id))) return res.status(400).json({ error: 'Invalid id' })

  try {
    if (req.method === 'GET') {
      const r = await pool.query(
        `SELECT t.*, u.name AS "submittedByName"
         FROM public."Taru" t
         LEFT JOIN users u ON u.id = t."submittedBy"
         WHERE t.id = $1`,
        [id]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Record not found' })
      return res.status(200).json({ record: r.rows[0] })
    }

    if (req.method === 'PUT') {
      let fields
      try {
        fields = pickWritable(req.body)
      } catch (err) {
        return res.status(400).json({ error: err.message })
      }
      // The original surveyor stays the owner of the record.
      delete fields.submittedBy
      Object.assign(fields, TAURU_FIXED_VALUES)

      const columns = Object.keys(fields)
      const r = await pool.query(
        `UPDATE public."Taru"
         SET ${columns.map((c, i) => `"${c}" = $${i + 1}`).join(', ')}, "updatedAt" = NOW()
         WHERE id = $${columns.length + 1}
         RETURNING *`,
        [...columns.map(c => fields[c]), id]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Record not found' })
      return res.status(200).json({ record: r.rows[0] })
    }

    if (req.method === 'DELETE') {
      const r = await pool.query(`DELETE FROM public."Taru" WHERE id = $1 RETURNING id`, [id])
      if (r.rowCount === 0) return res.status(404).json({ error: 'Record not found' })
      return res.status(200).json({ ok: true, deleted_id: Number(id) })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export default withCors(handler)
