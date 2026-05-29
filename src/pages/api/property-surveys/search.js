import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

/**
 * GET /api/property-surveys/search?ward_no=1&mohalla_name=Ambedkar&page=1&limit=20
 *
 * At least one of ward_no or mohalla_name is required.
 * old_ward_no is also checked for imported rows (no ward_id set).
 */
async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' })

  const { ward_no, mohalla_name, house_no } = req.query
  if (!ward_no && !mohalla_name && !house_no)
    return res.status(400).json({ error: 'Provide at least one of ward_no, mohalla_name, or house_no' })

  const page   = Math.max(1, parseInt(req.query.page  ?? '1', 10))
  const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10)))
  const offset = (page - 1) * limit

  const client = await pool.connect()
  try {
    const conditions = []
    const values     = []
    let   p          = 1   // parameter counter

    if (ward_no) {
      // hits wards.ward_no then idx_ward_ulb; also covers imported rows via old_ward_no
      conditions.push(
        `(ps.ward_id IN (SELECT id FROM wards WHERE ward_no = $${p}) OR ps.old_ward_no = $${p})`
      )
      values.push(ward_no.trim())
      p++
    }

    if (mohalla_name) {
      // hits idx_mohalla_ward via mohallas lookup
      conditions.push(
        `ps.mohalla_id IN (SELECT id FROM mohallas WHERE mohalla_name ILIKE $${p})`
      )
      values.push(`%${mohalla_name.trim()}%`)
      p++
    }

    if (house_no) {
      // combine with other filters for precise match
      conditions.push(`ps.old_house_no = $${p}`)
      values.push(house_no.trim())
      p++
    }

    values.push(limit)   // $p
    values.push(offset)  // $p+1

    const r = await client.query(
  `SELECT
      ps.*,

      d.district_name,
      u.ulb_name,
      usr.name AS created_by_name,
      w.ward_no,
      m.mohalla_name,

      COUNT(*) OVER() AS total_count

   FROM property_surveys ps

   LEFT JOIN districts d
      ON d.id = ps.district_id

   LEFT JOIN ulbs u
      ON u.id = ps.ulb_id

  LEFT JOIN users usr
   ON usr.id = ps.created_by

   LEFT JOIN wards w
      ON w.id = ps.ward_id

   LEFT JOIN mohallas m
      ON m.id = ps.mohalla_id

   WHERE ${conditions.join(' AND ')}

   ORDER BY ps.id ASC
   LIMIT $${p}
   OFFSET $${p + 1}`,
  values
)

    const total   = r.rows[0] ? parseInt(r.rows[0].total_count, 10) : 0
    const records = r.rows.map(({ total_count, ...row }) => {
  const {
    id,

    district_id,
    district_name,

    ulb_id,
    ulb_name,

    ward_id,
    ward_no,

    mohalla_id,
    mohalla_name,

    created_by,
    created_by_name,

    old_ward_no,
    old_ward_name,
    old_moholla_name,

    ...rest
  } = row

  return {
    id,

    district_id,
    district_name,

    ulb_id,
    ulb_name,

    ward_id,
    ward_no,

    mohalla_id,
    mohalla_name,

    created_by,
    created_by_name,

    old_ward_no,
    old_ward_name,
    old_moholla_name,

    ...rest,
  }
})

    return res.status(200).json({
      data: records,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)
