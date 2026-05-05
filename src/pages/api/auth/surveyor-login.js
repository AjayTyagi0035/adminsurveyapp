/**
 * Surveyor login is now handled by the unified /api/auth/login endpoint.
 * This file redirects for backward compatibility.
 */
export default function handler(req, res) {
  res.status(301).json({
    message: 'Use POST /api/auth/login with { mobile, password } instead.',
  })
}
