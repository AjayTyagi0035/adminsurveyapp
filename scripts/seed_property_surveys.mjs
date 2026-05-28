import fs from 'fs'
import { Pool } from 'pg'

const csvPath = process.argv[2] || 'public/Ward_1.csv'
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

    const wardNo = (row['Ward No'] || row['Ward No '] || '').toString().trim()
    // keep it simple: store old ward no directly and set ward_id = 2 for all imports
    const wardId = 2

    const client = await pool.connect()
    try {
      // get district_id and ulb_id for ward_id=2
      const wr = await client.query(
        'SELECT id, district_id, ulb_id FROM wards WHERE id = $1 LIMIT 1',
        [wardId]
      )
      if (!wr.rows[0]) {
        console.log(`Ward id ${wardId} not found in DB (line ${i + 1}), aborting`)
        client.release()
        process.exit(1)
      }
      const ward = wr.rows[0]

      const old_house_no = row['Old House'] || row['Old House '] || ''
      const new_house_no = row['New House'] || row['New House '] || ''
      if (!new_house_no) {
        console.log(`Skipping line ${i + 1}: missing New House (new_house_no)`) 
        continue
      }

      const old_owner_name = row['Owner Name'] || ''
      const old_father_husband_name = row['Fathers Name'] || ''
      const property_type = row['property Type'] || ''
      const property_use_as = row['Property use'] || row['Property use '] || ''
      const old_house_tax = parseFloat((row['Old House Tax  2025-26'] || '').replace(/[^0-9.-]/g, '')) || null
      const old_house_tax_arrear = parseFloat((row['Arrear 2025-26'] || '').replace(/[^0-9.-]/g, '')) || null
      const old_ward_no = wardNo || null
      await client.query(
        `INSERT INTO property_surveys
          (district_id, ulb_id, old_ward_no, old_house_no, old_owner_name,
           old_father_husband_name, property_type, property_use_as, old_house_tax,
           old_house_tax_arrear, new_house_no)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          ward.district_id,
          ward.ulb_id,
          old_ward_no || null,
          old_house_no || null,
          old_owner_name || null,
          old_father_husband_name || null,
          property_type || null,
          property_use_as || null,
          old_house_tax,
          old_house_tax_arrear,
          new_house_no,
        ]
      )
      inserted++
      if (inserted % 100 === 0) console.log(`Inserted ${inserted} rows so far`)
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
