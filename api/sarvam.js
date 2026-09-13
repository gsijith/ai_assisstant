import { applyCors, readBody } from './_lib/forward.js';

// Proxies Sarvam text-to-speech. Returns Sarvam's JSON (base64 audio) as-is.
export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server missing SARVAM_API_KEY' });

  try {
    const upstream = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify(readBody(req)),
    });
    const text = await upstream.text();
    res.setHeader('Content-Type', 'application/json');
    return res.status(upstream.status).send(text);
  } catch (err) {
    return res.status(502).json({ error: `Upstream request failed: ${err.message}` });
  }
}
