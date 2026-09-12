import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const page = Math.max(1, parseInt(req.query.page ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '10', 10)))
  const offset = (page - 1) * limit
  const search = String(req.query.search ?? '').trim()
  const values = []
  let whereClause = ''

  if (search) {
    values.push(`%${search}%`)
    whereClause = `WHERE "mohallaName" ILIKE $1
      OR "houseNo" ILIKE $1
      OR "ownerName" ILIKE $1
      OR "propertyId" ILIKE $1`
  }

  const client = await pool.connect()
  try {
    values.push(limit, offset)
    const result = await client.query(
      `SELECT *, COUNT(*) OVER() AS total_count
       FROM surveyor_s_submissions
       ${whereClause}
       ORDER BY id DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    )
    const total = result.rows[0] ? Number(result.rows[0].total_count) : 0
    const data = result.rows.map(({ total_count, ...row }) => row)
    return res.status(200).json({ data, pagination: { page, limit, total, total_pages: Math.ceil(total / limit) } })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)