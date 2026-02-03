// /api/lead.js — Logs AdRoast leads to Notion database
// Requires NOTION_API_KEY env var in Vercel

const NOTION_DB_ID = '9ea604b8390742939a3fb02bc113eb20';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.NOTION_API_KEY;
  if (!key) return res.status(500).json({ error: 'NOTION_API_KEY not set' });

  const { linkedin, email, platform, offer, icp, landingUrl, adScore, lpScore, matchScore, source } = req.body;

  const properties = {
    'Lead': { title: [{ text: { content: linkedin || email || 'Anonymous' } }] },
    'Platform': platform ? { select: { name: platform } } : undefined,
    'Offer': offer ? { select: { name: offer } } : undefined,
    'Ad Score': adScore && adScore !== 'N/A' ? { number: Number(adScore) } : undefined,
    'LP Score': { rich_text: [{ text: { content: String(lpScore || 'N/A') } }] },
    'Match Score': { rich_text: [{ text: { content: String(matchScore || 'N/A') } }] },
    'ICP': { rich_text: [{ text: { content: (icp || '').slice(0, 2000) } }] },
    'Source': source ? { select: { name: source } } : undefined,
  };

  if (email) properties['Email'] = { email: email };
  if (landingUrl) properties['Landing URL'] = { url: landingUrl };

  // Remove undefined values
  Object.keys(properties).forEach(k => properties[k] === undefined && delete properties[k]);

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('Notion error:', err);
      return res.status(500).json({ error: 'Notion write failed' });
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Lead log error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
