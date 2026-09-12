import withCors from '../../../lib/cors'
import pool from '../../../lib/db'

const ALLOWED_FIELDS = [
  'ulbName', 'district', 'mohallaName', 'wardNoOrName', 'propertyId', 'houseNo',
  'ownerName', 'fatherOrHusbandName', 'membersInHouse', 'address', 'mobileNo',
  'natureOfHouse', 'WidthofRoadInFront', 'Typeofconstruction', 'Useofhouse',
  'frontWidthofPlotInFeet', 'depthofPlotInFeet', 'totalAreaInFeet', 'builtUpArea',
  'openArea', 'ifmixed', 'firstFloorArea', 'secondFloorArea', 'thirdFloorArea',
  'fourthFloorArea', 'totalBuiltUpArea', 'occupancyStatus', 'frontPhotoUrl',
  'rightSidePhotoUrl', 'leftSidePhotoUrl', 'dataLat', 'dataLng', 'waterConnection',
  'sewerConnection', 'submittedAt', 'remarks',
]

async function handler(req, res) {
  const id = req.query.id
  if (!id || !/^\d+$/.test(String(id))) return res.status(400).json({ error: 'Invalid id' })

  const client = await pool.connect()
  try {
    if (req.method === 'GET') {
      const result = await client.query('SELECT * FROM surveyor_s_submissions WHERE id = $1', [id])
      if (!result.rowCount) return res.status(404).json({ error: 'Sirsa record not found' })
      return res.status(200).json({ record: result.rows[0] })
    }

    if (req.method === 'PUT') {
      const body = req.body ?? {}
      const fields = ALLOWED_FIELDS.filter(field => Object.prototype.hasOwnProperty.call(body, field))
      if (!fields.length) return res.status(400).json({ error: 'Provide at least one field to update' })

      const values = fields.map(field => body[field] ?? null)
      const assignments = fields.map((field, index) => `"${field}" = $${index + 1}`)
      values.push(id)
      const result = await client.query(
        `UPDATE surveyor_s_submissions
         SET ${assignments.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id = $${values.length}
         RETURNING *`,
        values
      )
      if (!result.rowCount) return res.status(404).json({ error: 'Sirsa record not found' })
      return res.status(200).json({ record: result.rows[0] })
    }

    if (req.method === 'DELETE') {
      const result = await client.query('DELETE FROM surveyor_s_submissions WHERE id = $1 RETURNING id', [id])
      if (!result.rowCount) return res.status(404).json({ error: 'Sirsa record not found' })
      return res.status(200).json({ ok: true, deleted_id: result.rows[0].id })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}

export default withCors(handler)