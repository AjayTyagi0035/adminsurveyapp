import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { ward_no, start_date, end_date } = req.query

  const client = await pool.connect()
  try {
    const conditions = []
    const values = []
    let p = 1

    if (ward_no) {
      conditions.push(`(ps.ward_id IN (SELECT id FROM wards WHERE ward_no = $${p}) OR ps.old_ward_no = $${p})`)
      values.push(ward_no.trim())
      p++
    }
    
    if (start_date) {
      conditions.push(`ps.created_at >= $${p}::timestamp`)
      values.push(start_date)
      p++
    }
    
    if (end_date) {
      // include up to the very end of the end_date
      conditions.push(`ps.created_at <= $${p}::timestamp + interval '23 hours 59 minutes 59 seconds'`)
      values.push(end_date)
      p++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const r = await client.query(
      `SELECT
          ps.*,

          d.district_name,
          u.ulb_name,
          w.ward_no,
          m.mohalla_name,
          usr.name AS created_by_name

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
       ${whereClause}
       ORDER BY ps.id DESC`,
      values
    )

    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'No records found for export' })
    }

    const headers = Object.keys(r.rows[0])
    const csvRows = [headers.join(',')]

    for (const row of r.rows) {
      const rowValues = headers.map(header => {
        let val = row[header]
        if (val === null || val === undefined) val = ''
        if (val instanceof Date) val = val.toISOString()
        val = String(val).replace(/"/g, '""') // Escape quotes
        return `"${val}"` // Wrap each in quotes
      })
      csvRows.push(rowValues.join(','))
    }

    const csvData = csvRows.join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=property_surveys.csv')
    return res.status(200).send(csvData)

  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)