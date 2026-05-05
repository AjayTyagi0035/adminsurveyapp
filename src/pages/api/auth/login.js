import { Pool } from 'pg'

// Ensure we pass a connection string without libpq `sslmode` so
// the `ssl` option below is honored. Keep `rejectUnauthorized:false`
// for development only.
let connectionString = process.env.DATABASE_URL
if (connectionString) {
  try {
    const u = new URL(connectionString)
    u.searchParams.delete('sslmode')
    connectionString = u.toString()
  } catch (e) {
    // ignore URL parse errors and use original
  }
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
})

export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'})
  const { email, password } = req.body
  if(!email||!password) return res.status(400).json({error:'Missing credentials'})

  try{
    const client = await pool.connect()
    try{
      const r = await client.query('SELECT id,email,password_hash FROM users WHERE email=$1',[email])
      if(r.rowCount===0) return res.status(401).json({error:'Invalid credentials'})
      const user = r.rows[0]
      // For scaffold: compare plain password (replace with bcrypt in prod)
      if(user.password_hash !== password) return res.status(401).json({error:'Invalid credentials'})
      // Simplest session: return success
      res.status(200).json({ok:true})
    } finally {
      client.release()
    }
  } catch(err){
    console.error(err)
    res.status(500).json({error:'Server error'})
  }
}
