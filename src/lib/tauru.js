// Shared helpers for the public."Taru" table (Tauru survey records).

// Columns a client may write on create / update. Column names are
// case-sensitive in Postgres, so they are always double-quoted in SQL.
export const TAURU_WRITABLE_COLUMNS = [
  'ulbName', 'district', 'mohallaName', 'wardNoOrName',
  'propertyId', 'houseNo', 'ownerName', 'fatherOrHusbandName',
  'membersInHouse', 'address', 'mobileNo', 'natureOfHouse',
  'WidthofRoadInFront', 'Typeofconstruction', 'Useofhouse',
  'frontWidthofPlotInFeet', 'depthofPlotInFeet', 'totalAreaInFeet',
  'builtUpArea', 'openArea', 'ifmixed',
  'firstFloorArea', 'secondFloorArea', 'thirdFloorArea', 'fourthFloorArea',
  'commercialArea', 'totalBuiltUpArea', 'occupancyStatus',
  'frontPhotoUrl', 'rightSidePhotoUrl', 'leftSidePhotoUrl',
  'dataLat', 'dataLng', 'waterConnection', 'sewerConnection',
  'remarks', 'floorNo', 'submittedBy',
]

// District and ULB are fixed for every Tauru record.
export const TAURU_FIXED_VALUES = { district: 'Nuh', ulbName: 'Tauru' }

const INTEGER_COLUMNS = new Set(['membersInHouse', 'submittedBy'])
const NUMERIC_COLUMNS = new Set([
  'frontWidthofPlotInFeet', 'depthofPlotInFeet', 'totalAreaInFeet',
  'builtUpArea', 'openArea', 'firstFloorArea', 'secondFloorArea',
  'thirdFloorArea', 'fourthFloorArea', 'commercialArea', 'totalBuiltUpArea',
  'dataLat', 'dataLng',
])

/** Normalises a client value: '' → null, numeric strings → numbers. */
export function normaliseValue(column, value) {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') {
    value = value.trim()
    if (value === '') return null
  }
  if (INTEGER_COLUMNS.has(column) || NUMERIC_COLUMNS.has(column)) {
    const n = Number(value)
    if (!Number.isFinite(n)) throw new TypeError(`${column} must be a number`)
    return INTEGER_COLUMNS.has(column) ? Math.trunc(n) : n
  }
  return value
}

/** Picks the writable columns present in `body`, normalised. */
export function pickWritable(body) {
  const out = {}
  for (const col of TAURU_WRITABLE_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(body ?? {}, col)) {
      out[col] = normaliseValue(col, body[col])
    }
  }
  return out
}

/**
 * Builds a WHERE clause from search query params. Text filters are
 * case-insensitive partial matches; dates are inclusive whole days.
 */
export function buildTauruFilters(query) {
  const conditions = []
  const values = []
  const add = (sql, value) => {
    values.push(value)
    conditions.push(sql.replace('?', `$${values.length}`))
  }

  const text = v => (typeof v === 'string' ? v.trim() : '')

  if (text(query.ward)) add(`t."wardNoOrName" ILIKE ?`, `%${text(query.ward)}%`)
  if (text(query.mohalla)) add(`t."mohallaName" ILIKE ?`, `%${text(query.mohalla)}%`)
  if (text(query.house_no)) add(`t."houseNo" ILIKE ?`, `%${text(query.house_no)}%`)
  if (text(query.property_id)) add(`t."propertyId" ILIKE ?`, `%${text(query.property_id)}%`)
  if (text(query.owner)) add(`t."ownerName" ILIKE ?`, `%${text(query.owner)}%`)
  if (text(query.mobile)) add(`t."mobileNo" ILIKE ?`, `%${text(query.mobile)}%`)

  // Free-text search used by the mobile app's history screen.
  if (text(query.q)) {
    values.push(`%${text(query.q)}%`)
    const p = `$${values.length}`
    conditions.push(
      `(t."houseNo" ILIKE ${p} OR t."ownerName" ILIKE ${p} OR t."propertyId" ILIKE ${p} OR t."mohallaName" ILIKE ${p} OR t."wardNoOrName" ILIKE ${p})`
    )
  }

  if (text(query.submitted_by)) {
    const id = Number(query.submitted_by)
    if (Number.isFinite(id)) add(`t."submittedBy" = ?`, id)
  }
  if (text(query.start_date)) add(`t."submittedAt" >= ?::date`, text(query.start_date))
  if (text(query.end_date)) add(`t."submittedAt" < ?::date + interval '1 day'`, text(query.end_date))

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  }
}
