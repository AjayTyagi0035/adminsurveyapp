import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

/**
 * GET /api/property-surveys/by-created-by?created_by=1&page=1&limit=20
 */
async function handler(req, res) {
  if (req.method !== 'GET')
    return res.status(405).json({ error: 'Method not allowed' })

  const { created_by } = req.query ?? {}
  if (!created_by)
    return res.status(400).json({ error: 'created_by is required' })

  const page = Math.max(1, parseInt(req.query.page ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10)))
  const offset = (page - 1) * limit

  const client = await pool.connect()
  try {
    const r = await client.query(
      `SELECT
          ps.*,

          d.district_name,
          u.ulb_name,
          w.ward_no,
          m.mohalla_name,
          usr.name AS created_by_name,

          COUNT(*) OVER() AS total_count

       FROM property_surveys ps

       LEFT JOIN districts d
          ON d.id = ps.district_id

       LEFT JOIN ulbs u
          ON u.id = ps.ulb_id

       LEFT JOIN wards w
          ON w.id = ps.ward_id

       LEFT JOIN mohallas m
          ON m.id = ps.mohalla_id

       LEFT JOIN users usr
          ON usr.id = ps.created_by

       WHERE ps.created_by = $1

       ORDER BY ps.id DESC
       LIMIT $2 OFFSET $3`,
      [created_by, limit, offset]
    )

    const total = r.rows[0] ? parseInt(r.rows[0].total_count, 10) : 0
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
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)