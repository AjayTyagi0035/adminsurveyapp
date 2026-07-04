import { withCors } from '../../../lib/cors'

async function handler(req, res) {
  // Clear the auth cookie by setting it with an expired date
  res.setHeader('Set-Cookie', [
    'auth_token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0',
  ])
  res.status(200).json({ ok: true })
}

export default withCors(handler)
