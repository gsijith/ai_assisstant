// Shared helpers for the /api proxy functions.
// Files/dirs prefixed with "_" are NOT exposed as routes by Vercel.

// Same-origin requests (the deployed web app) need no CORS headers.
// For the Capacitor/native build the requests are cross-origin, so allow
// only origins listed in the ALLOWED_ORIGINS env var (comma-separated).
export function applyCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Vercel parses JSON bodies automatically; guard for safety anyway.
export function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}
