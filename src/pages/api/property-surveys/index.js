import pool from '../../../lib/db'

/**
 * GET  /api/property-surveys?page=1&limit=20
 * POST /api/property-surveys
 */
export default async function handler(req, res) {
  const client = await pool.connect()
  try {
    // ── GET: paginated list ───────────────────────────────────
    if (req.method === 'GET') {
      const page  = Math.max(1, parseInt(req.query.page  ?? '1', 10))
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit ?? '20', 10)))
      const offset = (page - 1) * limit

      const r = await client.query(
        `SELECT
           ps.id, ps.district_id, ps.ulb_id, ps.ward_id, ps.mohalla_id,
           ps.old_ward_no, ps.old_house_no, ps.old_owner_name, ps.old_father_husband_name,
           ps.old_house_tax, ps.old_house_tax_arrear,
           ps.new_house_no, ps.owner_name, ps.father_husband_name, ps.mobile_no,
           ps.property_type, ps.property_use_as, ps.nature_of_house,
           ps.total_plot_area_sqft, ps.no_of_floors, ps.total_house_tax, ps.total_water_tax,
           ps.gps_location, ps.remarks, ps.created_by, ps.created_at, ps.updated_at,
           COUNT(*) OVER() AS total_count
         FROM property_surveys ps
         ORDER BY ps.id DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      )

      const total = r.rows[0] ? parseInt(r.rows[0].total_count, 10) : 0
      const records = r.rows.map(({ total_count, ...rest }) => rest)

      return res.status(200).json({
        data: records,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      })
    }

    // ── POST: create property survey ─────────────────────────
    if (req.method === 'POST') {
      const {
        district_id, ulb_id, ward_id, mohalla_id,
        old_ward_no, old_ward_name, old_moholla_name,
        old_house_no, old_owner_name, old_father_husband_name,
        old_house_tax, old_house_tax_arrear, house_tax_arrear_2025_26,
        old_water_tax, water_tax_arrear_2025_26,
        new_house_no, owner_name, father_husband_name,
        mobile_no, address, road_location_width, rate,
        nature_of_house, property_type, property_use_as,
        construction_year, rebate_type, financial_year,
        front_feet, depth_feet, total_plot_area_sqft,
        no_of_floors, ground_floor_area, first_floor_area,
        second_floor_area, third_floor_area,
        total_residential_area, total_commercial_area, empty_area,
        total_current_arv,
        house_tax_current, house_tax_arrear, house_tax_interest, total_house_tax,
        water_tax_current, water_tax_arrear, water_tax_interest, total_water_tax,
        photo_gps, street_light_photo, gps_location, remarks,
        created_by,
      } = req.body ?? {}

      if (!new_house_no)
        return res.status(400).json({ error: 'new_house_no is required' })

      const r = await client.query(
        `INSERT INTO property_surveys (
           district_id, ulb_id, ward_id, mohalla_id,
           old_ward_no, old_ward_name, old_moholla_name,
           old_house_no, old_owner_name, old_father_husband_name,
           old_house_tax, old_house_tax_arrear, house_tax_arrear_2025_26,
           old_water_tax, water_tax_arrear_2025_26,
           new_house_no, owner_name, father_husband_name,
           mobile_no, address, road_location_width, rate,
           nature_of_house, property_type, property_use_as,
           construction_year, rebate_type, financial_year,
           front_feet, depth_feet, total_plot_area_sqft,
           no_of_floors, ground_floor_area, first_floor_area,
           second_floor_area, third_floor_area,
           total_residential_area, total_commercial_area, empty_area,
           total_current_arv,
           house_tax_current, house_tax_arrear, house_tax_interest, total_house_tax,
           water_tax_current, water_tax_arrear, water_tax_interest, total_water_tax,
           photo_gps, street_light_photo, gps_location, remarks, created_by
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
           $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
           $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
           $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
           $41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51,$52,$53
         )
         RETURNING id, new_house_no, created_at`,
        [
          district_id ?? null, ulb_id ?? null, ward_id ?? null, mohalla_id ?? null,
          old_ward_no ?? null, old_ward_name ?? null, old_moholla_name ?? null,
          old_house_no ?? null, old_owner_name ?? null, old_father_husband_name ?? null,
          old_house_tax ?? null, old_house_tax_arrear ?? null, house_tax_arrear_2025_26 ?? null,
          old_water_tax ?? null, water_tax_arrear_2025_26 ?? null,
          new_house_no, owner_name ?? null, father_husband_name ?? null,
          mobile_no ?? null, address ?? null, road_location_width ?? null, rate ?? null,
          nature_of_house ?? null, property_type ?? null, property_use_as ?? null,
          construction_year ?? null, rebate_type ?? null, financial_year ?? null,
          front_feet ?? null, depth_feet ?? null, total_plot_area_sqft ?? null,
          no_of_floors ?? null, ground_floor_area ?? null, first_floor_area ?? null,
          second_floor_area ?? null, third_floor_area ?? null,
          total_residential_area ?? null, total_commercial_area ?? null, empty_area ?? null,
          total_current_arv ?? null,
          house_tax_current ?? null, house_tax_arrear ?? null, house_tax_interest ?? null, total_house_tax ?? null,
          water_tax_current ?? null, water_tax_arrear ?? null, water_tax_interest ?? null, total_water_tax ?? null,
          photo_gps ?? null, street_light_photo ?? null, gps_location ?? null, remarks ?? null, created_by ?? null,
        ]
      )

      return res.status(201).json({ survey: r.rows[0] })
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
