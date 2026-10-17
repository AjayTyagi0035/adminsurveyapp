import withCors from '../../../lib/cors'
import pool from '../../../lib/db'
import { TAURU_FIXED_VALUES, buildTauruFilters, pickWritable } from '../../../lib/tauru'

/**
 * GET  /api/tauru  – search Tauru records with pagination
 *   ?ward= &mohalla= &house_no= &property_id= &owner= &mobile= &q=
 *   &submitted_by= &start_date=YYYY-MM-DD &end_date=YYYY-MM-DD &page=1 &limit=10
 * POST /api/tauru  – create a record (body keys = "Taru" column names)
 */
async function handler(req, res) {
  if (req.method === 'GET') return list(req, res)
  if (req.method === 'POST') return create(req, res)
  return res.status(405).json({ error: 'Method not allowed' })
}

async function list(req, res) {
  const page = Math.max(1, parseInt(req.query.page ?? '1', 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '10', 10) || 10))
  const offset = (page - 1) * limit

  const { where, values } = buildTauruFilters(req.query)

  try {
    const r = await pool.query(
      `SELECT t.*, u.name AS "submittedByName", COUNT(*) OVER() AS total_count
       FROM public."Taru" t
       LEFT JOIN users u ON u.id = t."submittedBy"
       ${where}
       ORDER BY t.id DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    )

    const total = r.rows[0] ? parseInt(r.rows[0].total_count, 10) : 0
    return res.status(200).json({
      data: r.rows.map(({ total_count, ...row }) => row),
      pagination: { page, limit, total, total_pages: Math.max(1, Math.ceil(total / limit)) },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

async function create(req, res) {
  let fields
  try {
    fields = { ...pickWritable(req.body), ...TAURU_FIXED_VALUES }
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  if (!fields.submittedBy) return res.status(400).json({ error: 'submittedBy is required' })
  if (!fields.wardNoOrName) return res.status(400).json({ error: 'wardNoOrName is required' })
  if (!fields.ownerName) return res.status(400).json({ error: 'ownerName is required' })

  const columns = Object.keys(fields)
  try {
    const r = await pool.query(
      `INSERT INTO public."Taru" (${columns.map(c => `"${c}"`).join(', ')})
       VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
       RETURNING *`,
      columns.map(c => fields[c])
    )
    return res.status(201).json({ record: r.rows[0] })
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Unknown surveyor (submittedBy)' })
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  }
}

export default withCors(handler)
