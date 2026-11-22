// Shared helpers for the public.street_vendors table (Street Vending).
// JSON keys used by the API = column names (snake_case).
import { types } from 'pg'

// Return DATE columns as plain 'YYYY-MM-DD' strings instead of JS Dates
// (a Date would shift by the server timezone when serialised to JSON).
// No other table in this database uses DATE, so this is safe globally.
types.setTypeParser(1082, v => v)

export const SV_CONTAINER = 'streetvending'

/** Media columns: hold blob paths like 'streetvending/123-abc.jpg'. */
export const SV_MEDIA_COLUMNS = [
  'photo_with_location', 'photo_with_thela', 'id_proof_1', 'id_proof_2',
  'video', 'passport_photo', 'signature',
]

const INTEGER_COLUMNS = new Set([
  'age', 'years_in_city', 'male_members', 'female_members', 'children',
  'earning_male', 'earning_female', 'years_in_vending', 'years_in_area',
  'months_per_year', 'created_by', 'updated_by',
])

const NUMERIC_COLUMNS = new Set([
  'distance_to_place_km', 'hours_per_day', 'km_per_day_mobile', 'land_space_sqft',
  'vehicle_rent', 'avg_employee_pay', 'rent_amount', 'daily_purchase',
  'daily_sales', 'daily_profit', 'loan_amount',
])

export const SV_BOOLEAN_COLUMNS = new Set([
  'has_caste_certificate', 'has_disability_certificate', 'other_vendor_in_house',
  'other_income', 'uses_vehicle', 'same_work_mostly', 'satisfied_with_location',
  'pays_rent', 'has_loan', 'has_savings_account', 'has_insurance',
  'uses_social_security', 'satisfied_with_work', 'ready_to_shift',
  'need_covered_market', 'need_open_space', 'union_member', 'aware_of_act',
  'interested_in_license', 'drinking_water', 'toilet_access', 'aware_of_traffic_problem',
])

export const SV_ARRAY_COLUMNS = new Set([
  'residential_proofs', 'satisfied_reasons', 'unsatisfied_reasons', 'desired_facilities',
])

const JSON_COLUMNS = new Set(['family_members', 'other_text'])
const DATE_COLUMNS = new Set(['application_date', 'id_valid_from', 'id_valid_to'])
const STATUSES = new Set(['draft', 'submitted', 'idIssued'])

const TEXT_COLUMNS = [
  'video_name',
  'municipality_name', 'zone_name', 'ward_name', 'street_name', 'landmark',
  'area_type', 'place_of_business', 'nature_of_business', 'service_provider_type',
  'vending_place_name', 'gps_location',
  'first_name', 'middle_name', 'surname', 'guardian_relation', 'guardian_name',
  'house_no', 'colony_sector', 'residential_address', 'permanent_address', 'block',
  'city', 'district', 'mobile_no', 'phone_no', 'gender', 'nationality', 'category',
  'marital_status', 'education', 'disability', 'disability_certificate_no',
  'bpl_card_no', 'migration', 'native_district',
  'other_vendor_relation', 'other_vendor_name',
  'previous_work', 'previous_city', 'license', 'vending_frequency', 'business_type',
  'vending_from', 'vending_to', 'structure_type', 'vehicle_type', 'vehicle_ownership',
  'employees_count', 'employee_wage_type', 'rent_paid_to', 'rent_payment_type',
  'purchase_source', 'seed_money_source', 'raw_material_frequency', 'bank_name',
  'insurance_details', 'social_security_scheme', 'union_name', 'favourite_time',
  'market_type', 'garbage_disposal', 'storage_access', 'light_source',
  'traffic_solution', 'vendor_remarks', 'surveyor_note',
  'application_no', 'application_place', 'vending_activity', 'vending_mode',
  'id_card_no',
]

/** Columns a client may write on create / update. */
export const SV_WRITABLE_COLUMNS = [
  'status',
  ...SV_MEDIA_COLUMNS,
  ...TEXT_COLUMNS,
  ...INTEGER_COLUMNS,
  ...NUMERIC_COLUMNS,
  ...SV_BOOLEAN_COLUMNS,
  ...SV_ARRAY_COLUMNS,
  ...JSON_COLUMNS,
  ...DATE_COLUMNS,
]

/** Strips a full CDN/blob URL down to the stored path ('streetvending/x.jpg'). */
export function toMediaPath(value) {
  if (typeof value !== 'string') return value
  const v = value.trim()
  if (!/^https?:\/\//i.test(v)) return v.replace(/^\/+/, '')
  try {
    return decodeURIComponent(new URL(v).pathname).replace(/^\/+/, '')
  } catch {
    return v
  }
}

/** Normalises a client value to what the column expects. */
export function normaliseValue(column, value) {
  if (SV_ARRAY_COLUMNS.has(column)) {
    if (value == null || value === '') return []
    const list = Array.isArray(value) ? value : String(value).split(',')
    return list.map(s => String(s).trim()).filter(Boolean)
  }
  if (JSON_COLUMNS.has(column)) {
    if (value == null || value === '') return column === 'family_members' ? '[]' : '{}'
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    if (column === 'family_members') {
      if (!Array.isArray(parsed)) throw new TypeError('family_members must be an array')
      const members = parsed
        .filter(m => m && String(m.name ?? '').trim())
        .slice(0, 6)
        .map(m => ({
          name: String(m.name).trim(),
          relation: m.relation ? String(m.relation) : null,
          age: m.age === '' || m.age == null || !Number.isFinite(Number(m.age)) ? null : Math.trunc(Number(m.age)),
        }))
      return JSON.stringify(members)
    }
    if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new TypeError(`${column} must be an object`)
    return JSON.stringify(parsed)
  }

  if (value === undefined || value === null) return null
  if (typeof value === 'string') {
    value = value.trim()
    if (value === '') return null
  }

  if (column === 'status') {
    if (!STATUSES.has(value)) throw new TypeError('status must be draft, submitted or idIssued')
    return value
  }
  if (SV_BOOLEAN_COLUMNS.has(column)) {
    if (typeof value === 'boolean') return value
    const s = String(value).toLowerCase()
    if (['true', 'yes', '1'].includes(s)) return true
    if (['false', 'no', '0'].includes(s)) return false
    throw new TypeError(`${column} must be true or false`)
  }
  if (INTEGER_COLUMNS.has(column) || NUMERIC_COLUMNS.has(column)) {
    const n = Number(value)
    if (!Number.isFinite(n)) throw new TypeError(`${column} must be a number`)
    return INTEGER_COLUMNS.has(column) ? Math.trunc(n) : n
  }
  if (DATE_COLUMNS.has(column)) {
    const s = String(value).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new TypeError(`${column} must be YYYY-MM-DD`)
    return s
  }
  if (SV_MEDIA_COLUMNS.includes(column)) return toMediaPath(value)
  if (column === 'gps_location') {
    // 'lat,lng' – same format as property_surveys.gps_location
    const [lat, lng, extra] = String(value).split(',').map(s => Number(s.trim()))
    if (extra !== undefined || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      throw new TypeError('gps_location must be "latitude,longitude"')
    }
    return `${lat},${lng}`
  }
  return value
}

/** Picks the writable columns present in `body`, normalised. */
export function pickWritable(body) {
  const out = {}
  for (const col of SV_WRITABLE_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(body ?? {}, col)) {
      out[col] = normaliseValue(col, body[col])
    }
  }
  return out
}

/** SQL cast per column so array/JSON params are typed correctly. */
export function placeholder(column, index) {
  if (SV_ARRAY_COLUMNS.has(column)) return `$${index}::text[]`
  if (JSON_COLUMNS.has(column)) return `$${index}::jsonb`
  return `$${index}`
}

/**
 * Builds a WHERE clause from search query params. Text filters are
 * case-insensitive partial matches; dates are inclusive whole days.
 */
export function buildStreetVendorFilters(query) {
  const conditions = []
  const values = []
  const add = (sql, value) => {
    values.push(value)
    conditions.push(sql.replaceAll('?', `$${values.length}`))
  }
  const text = v => (typeof v === 'string' ? v.trim() : '')

  if (text(query.municipality)) add(`s.municipality_name ILIKE ?`, `%${text(query.municipality)}%`)
  if (text(query.zone)) add(`s.zone_name ILIKE ?`, `%${text(query.zone)}%`)
  if (text(query.ward)) add(`s.ward_name ILIKE ?`, `%${text(query.ward)}%`)
  if (text(query.street)) add(`(s.street_name ILIKE ? OR s.vending_place_name ILIKE ? OR s.landmark ILIKE ?)`, `%${text(query.street)}%`)
  if (text(query.name)) {
    add(`concat_ws(' ', s.first_name, s.middle_name, s.surname) ILIKE ?`, `%${text(query.name)}%`)
  }
  if (text(query.mobile)) add(`s.mobile_no ILIKE ?`, `%${text(query.mobile)}%`)
  if (text(query.application_no)) add(`s.application_no ILIKE ?`, `%${text(query.application_no)}%`)
  if (text(query.id_card_no)) add(`s.id_card_no ILIKE ?`, `%${text(query.id_card_no)}%`)
  if (text(query.nature_of_business)) add(`s.nature_of_business = ?`, text(query.nature_of_business))
  if (STATUSES.has(text(query.status))) add(`s.status = ?`, text(query.status))

  // Free-text search used by the mobile app's home screen.
  if (text(query.q)) {
    add(
      `(concat_ws(' ', s.first_name, s.middle_name, s.surname) ILIKE ? OR s.mobile_no ILIKE ?
        OR s.application_no ILIKE ? OR s.id_card_no ILIKE ? OR s.ward_name ILIKE ?)`,
      `%${text(query.q)}%`
    )
  }

  if (text(query.created_by)) {
    const id = Number(query.created_by)
    if (Number.isFinite(id)) add(`s.created_by = ?`, id)
  }
  if (text(query.start_date)) add(`s.created_at >= ?::date`, text(query.start_date))
  if (text(query.end_date)) add(`s.created_at < ?::date + interval '1 day'`, text(query.end_date))

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  }
}

/** ID card validity in years. */
export const ID_VALIDITY_YEARS = 5

/**
 * Marks a record submitted and generates the Form II application number and
 * Form III ID card (number + validity). Numbers already assigned are kept.
 * Numbering uses the record id, so it is unique without extra sequences:
 *   APP/2026/00012   SV/WARD12/2026/00012
 */
export async function issueIdCard(db, id, userId = null) {
  const r = await db.query(
    `WITH t AS (SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS today)
     UPDATE public.street_vendors s SET
       application_no   = COALESCE(NULLIF(s.application_no, ''),
                            'APP/' || EXTRACT(YEAR FROM t.today)::int || '/' || LPAD(s.id::text, 5, '0')),
       application_date = COALESCE(s.application_date, t.today),
       application_place = COALESCE(NULLIF(s.application_place, ''), s.city),
       vending_mode     = COALESCE(s.vending_mode,
                            CASE s.business_type WHEN 'Mobile' THEN 'Movable' WHEN 'Stationary' THEN 'Stationary' END),
       id_card_no       = COALESCE(NULLIF(s.id_card_no, ''),
                            'SV/' || COALESCE(NULLIF(UPPER(REGEXP_REPLACE(COALESCE(s.ward_name, ''), '[^A-Za-z0-9]', '', 'g')), ''), 'W')
                            || '/' || EXTRACT(YEAR FROM t.today)::int || '/' || LPAD(s.id::text, 5, '0')),
       id_valid_from    = COALESCE(s.id_valid_from, t.today),
       id_valid_to      = COALESCE(s.id_valid_to, (t.today + make_interval(years => $2) - interval '1 day')::date),
       status           = 'idIssued',
       updated_by       = COALESCE($3, s.updated_by),
       updated_at       = NOW()
     FROM t
     WHERE s.id = $1
     RETURNING s.*`,
    [id, ID_VALIDITY_YEARS, userId]
  )
  return r.rows[0] ?? null
}

/** SELECT columns used by list / detail / export endpoints (pair with SV_FROM). */
export const SV_COLUMNS = `
  s.*,
  concat_ws(' ', s.first_name, s.middle_name, s.surname) AS full_name,
  cu.name AS created_by_name,
  uu.name AS updated_by_name`

export const SV_FROM = `
  FROM public.street_vendors s
  LEFT JOIN users cu ON cu.id = s.created_by
  LEFT JOIN users uu ON uu.id = s.updated_by`
