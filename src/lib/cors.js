// Central CORS helper for API routes
export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:60874', // your app origin
  'http://localhost:3000',  // next dev server
]

export function withCors(handler, options = {}) {
  const ALLOWED_ORIGINS = options.allowedOrigins || DEFAULT_ALLOWED_ORIGINS

  return async function wrapped(req, res) {
    const origin = req.headers.origin
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Access-Control-Allow-Credentials', 'true')

    if (req.method === 'OPTIONS') return res.status(204).end()

    return handler(req, res)
  }
}

export default withCors
