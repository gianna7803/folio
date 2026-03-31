// api/generate.js
// Vercel serverless function — proxies requests to the Anthropic API.
// ANTHROPIC_API_KEY is set in Vercel environment variables, never in client code.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set in environment variables.' });
  }

  // Parse body — Vercel sometimes needs manual parsing
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {
      return res.status(400).json({ error: 'Invalid JSON in request body.' });
    }
  }

  const { prompt } = body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    // Read as text first so we never hit "unexpected end of JSON"
    const raw = await response.text();

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return res.status(500).json({ error: 'Anthropic returned invalid JSON: ' + raw.slice(0, 200) });
    }

    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'Anthropic API error' });
    }

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
