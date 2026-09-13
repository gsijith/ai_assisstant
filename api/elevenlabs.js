import { applyCors, readBody } from './_lib/forward.js';

// Proxies ElevenLabs text-to-speech. Returns binary audio (audio/mpeg).
export default async function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server missing ELEVENLABS_API_KEY' });

  const { voiceId, ...body } = readBody(req);
  const id = voiceId || '21m00Tcm4TlvDq8ikWAM';

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });
    if (!upstream.ok) {
      const text = await upstream.text();
      res.setHeader('Content-Type', 'application/json');
      return res.status(upstream.status).send(text);
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    return res.status(200).send(buf);
  } catch (err) {
    return res.status(502).json({ error: `Upstream request failed: ${err.message}` });
  }
}
