import withCors from '../../../lib/cors'
import pool from '../../../lib/db'
import { SV_COLUMNS, SV_FROM, buildStreetVendorFilters, issueIdCard, pickWritable, placeholder } from '../../../lib/streetVending'

/**
 * GET  /api/street-vending  – search vendors with pagination
 *   ?municipality= &zone= &ward= &street= &name= &mobile= &application_no= &id_card_no=
 *   &nature_of_business= &status=draft|submitted|idIssued &q= &created_by=
 *   &start_date=YYYY-MM-DD &end_date=YYYY-MM-DD &page=1 &limit=10
 * POST /api/street-vending  – create (body keys = street_vendors column names,
 *   `created_by` required). With status 'submitted'/'idIssued' the application
 *   and ID card numbers are generated and returned in `record`.
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

  const { where, values } = buildStreetVendorFilters(req.query)

  try {
    const r = await pool.query(
      `SELECT ${SV_COLUMNS}, COUNT(*) OVER() AS total_count
       ${SV_FROM}
       ${where}
       ORDER BY s.id DESC
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
    fields = pickWritable(req.body)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  if (!fields.created_by) return res.status(400).json({ error: 'created_by is required' })
  delete fields.updated_by

  const issue = fields.status === 'submitted' || fields.status === 'idIssued'
  if (issue) fields.status = 'draft' // set to idIssued by issueIdCard below

  const columns = Object.keys(fields)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const r = await client.query(
      `INSERT INTO public.street_vendors (${columns.join(', ')})
       VALUES (${columns.map((c, i) => placeholder(c, i + 1)).join(', ')})
       RETURNING *`,
      columns.map(c => fields[c])
    )
    let record = r.rows[0]
    if (issue) record = await issueIdCard(client, record.id)
    await client.query('COMMIT')
    return res.status(201).json({ record })
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    if (err.code === '23503') return res.status(400).json({ error: 'Unknown surveyor (created_by)' })
    if (err.code === '23505') return res.status(409).json({ error: 'Application / ID card number already exists' })
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)
