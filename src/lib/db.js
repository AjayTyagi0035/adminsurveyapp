import { Pool } from 'pg'

let connectionString = process.env.DATABASE_URL
if (connectionString) {
  try {
    const u = new URL(connectionString)
    u.searchParams.delete('sslmode')
    connectionString = u.toString()
  } catch (_) {}
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

export default pool
