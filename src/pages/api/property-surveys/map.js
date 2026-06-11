import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

/**
 * GET /api/property-surveys/map?ne_lat=...&ne_lng=...&sw_lat=...&sw_lng=...
 *
 * Returns property surveys locations.
 * If bounding box parameters (ne_lat, ne_lng, sw_lat, sw_lng) are provided,
 * filters properties to only those within the viewport.
 * Otherwise, returns the most recent 10,000 surveys with valid GPS coords.
 */
async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { ne_lat, ne_lng, sw_lat, sw_lng } = req.query
  const client = await pool.connect()

  try {
    let queryText = `
      SELECT id, old_house_no, new_house_no, owner_name,
             (split_part(gps_location, ',', 1))::double precision AS latitude,
             (split_part(gps_location, ',', 2))::double precision AS longitude
      FROM property_surveys
      WHERE gps_location IS NOT NULL
        AND gps_location ~ '^-?[0-9]+(\\.[0-9]+)?,[ ]*-?[0-9]+(\\.[0-9]+)?$'
    `
    const params = []

    if (ne_lat && ne_lng && sw_lat && sw_lng) {
      queryText = `
        SELECT * FROM (
          ${queryText}
        ) AS sub
        WHERE latitude >= $1 AND latitude <= $2
          AND longitude >= $3 AND longitude <= $4
      `
      params.push(
        parseFloat(sw_lat),
        parseFloat(ne_lat),
        parseFloat(sw_lng),
        parseFloat(ne_lng)
      )
    } else {
      // Limit to 10,000 for initial loading to avoid overload
      queryText += ` ORDER BY id DESC LIMIT 10000`
    }

    const r = await client.query(queryText, params)
    return res.status(200).json(r.rows)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error', message: err.message })
  } finally {
    client.release()
  }
}

export default withCors(handler)
