import pool from '../../../lib/db'

/**
 * GET /api/property-surveys/[id]   – get full detail of one survey record
 * PUT /api/property-surveys/[id]   – update any fields (partial update supported)
 * DELETE /api/property-surveys/[id]   – delete a record by id
 */
export default async function handler(req, res) {
  const { id } = req.query
  if (isNaN(Number(id))) return res.status(400).json({ error: 'Invalid id' })

  const client = await pool.connect()
  try {
    // ── GET: full record ──────────────────────────────────────
    if (req.method === 'GET') {
      const r = await client.query(
        `SELECT * FROM property_surveys WHERE id = $1`,
        [id]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Survey not found' })
      return res.status(200).json({ survey: r.rows[0] })
    }

    // ── PUT: partial update ───────────────────────────────────
    if (req.method === 'PUT') {
      const ALLOWED = [
        'district_id','ulb_id','ward_id','mohalla_id',
        'old_ward_no','old_ward_name','old_moholla_name',
        'old_house_no','old_owner_name','old_father_husband_name',
        'old_house_tax','old_house_tax_arrear','house_tax_arrear_2025_26',
        'old_water_tax','water_tax_arrear_2025_26',
        'new_house_no','owner_name','father_husband_name',
        'mobile_no','address','road_location_width','rate',
        'nature_of_house','property_type','property_use_as',
        'construction_year','rebate_type','financial_year',
        'front_feet','depth_feet','total_plot_area_sqft',
        'no_of_floors','ground_floor_area','first_floor_area',
        'second_floor_area','third_floor_area',
        'total_residential_area','total_commercial_area','empty_area',
        'total_current_arv',
        'house_tax_current','house_tax_arrear','house_tax_interest','total_house_tax',
        'water_tax_current','water_tax_arrear','water_tax_interest','total_water_tax',
        'photo_gps','street_light_photo','gps_location','remarks',
      ]

      const body = req.body ?? {}
      const setClauses = []
      const values = []
      let p = 1

      for (const field of ALLOWED) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          setClauses.push(`${field} = $${p++}`)
          values.push(body[field] ?? null)
        }
      }

      if (setClauses.length === 0)
        return res.status(400).json({ error: 'Provide at least one field to update' })

      setClauses.push(`updated_at = NOW()`)
      values.push(id) // $p — id always last

      const r = await client.query(
        `UPDATE property_surveys
         SET ${setClauses.join(', ')}
         WHERE id = $${p}
         RETURNING id, new_house_no, owner_name, updated_at`,
        values
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Survey not found' })
      return res.status(200).json({ survey: r.rows[0] })
    }

    // ── DELETE: remove record ────────────────────────────────
    if (req.method === 'DELETE') {
      const r = await client.query(
        `DELETE FROM property_surveys WHERE id = $1 RETURNING id`,
        [id]
      )
      if (r.rowCount === 0) return res.status(404).json({ error: 'Survey not found' })
      return res.status(200).json({ ok: true, deleted_id: Number(id) })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Duplicate entry for this house in the same location' })
    console.error(err)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
}
