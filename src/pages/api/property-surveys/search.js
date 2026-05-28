import pool from '../../../lib/db'

/**
 * GET /api/property-surveys/search?ward_no=1&mohalla_name=Ambedkar&page=1&limit=20
 *
 * At least one of ward_no or mohalla_name is required.
 * old_ward_no is also checked for imported rows (no ward_id set).
 */
export default async function handler(req, res) {
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
         ps.id, ps.district_id, ps.ulb_id, ps.ward_id, ps.mohalla_id,
         ps.old_ward_no, ps.old_house_no, ps.old_owner_name, ps.old_father_husband_name,
         ps.old_house_tax, ps.old_house_tax_arrear,
         ps.new_house_no, ps.owner_name, ps.father_husband_name, ps.mobile_no,
         ps.property_type, ps.property_use_as, ps.nature_of_house,
         ps.total_plot_area_sqft, ps.no_of_floors, ps.total_house_tax, ps.total_water_tax,
         ps.gps_location, ps.remarks, ps.created_at,
         COUNT(*) OVER() AS total_count
       FROM property_surveys ps
       WHERE ${conditions.join(' AND ')}
       ORDER BY ps.id ASC
       LIMIT $${p} OFFSET $${p + 1}`,
      values
    )

    const total   = r.rows[0] ? parseInt(r.rows[0].total_count, 10) : 0
    const records = r.rows.map(({ total_count, ...rest }) => rest)

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
