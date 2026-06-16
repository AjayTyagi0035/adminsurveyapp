import fs from 'fs'
import { Pool } from 'pg'

const csvPath = process.argv[2] || 'public/Ward_4.csv'
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Please set DATABASE_URL environment variable')
  process.exit(1)
}

let connectionString = DATABASE_URL
try {
  const u = new URL(connectionString)
  u.searchParams.delete('sslmode')
  connectionString = u.toString()
} catch (_) {}

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } })

function parseCSVLine(line) {
  const res = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === ',' && !inQuotes) {
      res.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  res.push(cur)
  return res.map(s => s.trim())
}
function generateHouseNo(index) {
  let result = ''
  let n = index + 1

  while (n > 0) {
    n--
    result = String.fromCharCode(65 + (n % 26)) + result
    n = Math.floor(n / 26)
  }

  return `4${result}`
}
async function main() {
  const data = fs.readFileSync(csvPath, 'utf8')
  const lines = data.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) {
    console.error('CSV looks empty')
    process.exit(1)
  }

  const headers = parseCSVLine(lines[0])
  let inserted = 0
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.every(c => c === '')) continue
    const row = {}
    for (let j = 0; j < headers.length; j++) row[headers[j]] = cols[j] ?? ''

    const client = await pool.connect()

try {
  const old_house_no = (row['HOUSE NO'] || '').trim()
  
  const new_house_no = generateHouseNo(inserted)
  const old_owner_name = (row['OWNER NAME'] || '').trim()
  const old_father_husband_name = (row['FATHER NAME'] || '').trim()

  const owner_name = old_owner_name
  const father_husband_name = old_father_husband_name
  const old_moholla_name = 'Aal Khurd West'

const address =
  row['ADDRESS'] && row['ADDRESS'] !== '-'
    ? row['ADDRESS'].toString().trim()
    : null

  const old_house_tax =
    parseFloat(
      (row['OLD HOUSE TAX 2025-2016'] || '')
        .toString()
        .replace(/[^0-9.-]/g, '')
    ) || null

  const house_tax_arrear =
    parseFloat(
      (row['HOUSE TAX ARRER2025-2026'] || '')
        .toString()
        .replace(/[^0-9.-]/g, '')
    ) || null

  const old_water_tax =
    parseFloat(
      (row['OLD WATER TAX  2025-2026'] || '')
        .toString()
        .replace(/[^0-9.-]/g, '')
    ) || null

  const water_tax_arrear =
    parseFloat(
      (row['OLD WATER TAX ARRER 2025-2026'] || '')
        .toString()
        .replace(/[^0-9.-]/g, '')
    ) || null

  const watertank_tax_arrear =
    parseFloat(
      (row['WATER TAX AMOUNT  ARRER 2025-26'] || '')
        .toString()
        .replace(/[^0-9.-]/g, '')
    ) || null

  const mobile_no =
    row['MOBILE NO'] && row['MOBILE NO'] !== '-'
      ? row['MOBILE NO'].toString().trim()
      : null

  const property_use_as =
    row['PROPERTY USE AS'] && row['PROPERTY USE AS'] !== '-'
      ? row['PROPERTY USE AS'].toString().trim()
      : null

  await client.query(
    `INSERT INTO property_surveys (
      district_id,
      ulb_id,
      ward_id,
      mohalla_id,
      old_moholla_name,

      old_house_no,
      new_house_no,

      old_owner_name,
      old_father_husband_name,

      owner_name,
      father_husband_name,

      old_house_tax,

      house_tax_arrear_2025_26,
      house_tax_arrear,

      old_water_tax,

      water_tax_arrear_2025_26,
      water_tax_arrear,

      watertank_tax_current,
      watertank_tax_arrear,

      mobile_no,
      address,
      property_use_as
    )
    VALUES (
  $1,$2,$3,$4,
  $5,

  $6,$7,

  $8,$9,

  $10,$11,

  $12,

  $13,$14,

  $15,

  $16,$17,

  $18,$19,

  $20,$21,

  $22
)`,
    [
  1,
  1,
  4,
  5,
  old_moholla_name,
  old_house_no || null,
  new_house_no,

  old_owner_name || null,
  old_father_husband_name || null,

  owner_name || null,
  father_husband_name || null,

  old_house_tax,

  house_tax_arrear,
  house_tax_arrear,

  old_water_tax,

  water_tax_arrear,
  water_tax_arrear,

  600,
  watertank_tax_arrear,

  mobile_no,
  address,
  property_use_as
]
  )

  inserted++

  if (inserted % 100 === 0) {
    console.log(`Inserted ${inserted} rows so far`)
  }
} catch (err) {
  console.error(`Error on line ${i + 1}:`, err.message)
} finally {
  client.release()
}
  }

  console.log(`Done. Inserted ${inserted} rows.`)
  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
