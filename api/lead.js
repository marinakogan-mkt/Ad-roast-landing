// Notion database: AdRoast Leads
const NOTION_DATABASE_ID = '90888e98cd794663acaf9f94ba7bd494';

// Generate short ID (8 chars)
const generateId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  if (!NOTION_API_KEY) {
    console.error('NOTION_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const { email, linkedin, platform, adScore, lpScore, matchScore, roastData, icp } = req.body;
    
    const reportId = generateId();
    const linkedinUsername = linkedin?.split('/in/')?.[1]?.replace(/\/$/, '') || 'Unknown';
    const reportLink = `https://koganmarina.com/?id=${reportId}`;
    
    const platformMap = {
      'meta': 'Meta',
      'linkedin': 'LinkedIn', 
      'google': 'Google',
      'twitter': 'X/Twitter'
    };

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: {
          'Lead': { title: [{ text: { content: linkedinUsername } }] },
          'Report ID': { rich_text: [{ text: { content: reportId } }] },
          'Report Link': { url: reportLink },
          'Email': email ? { email: email } : { email: null },
          'LinkedIn': linkedin ? { url: linkedin.startsWith('http') ? linkedin : `https://${linkedin}` } : { url: null },
          'Platform': platform ? { select: { name: platformMap[platform] || 'Meta' } } : { select: null },
          'Ad Score': adScore && adScore !== 'N/A' ? { number: parseFloat(adScore) } : { number: null },
          'LP Score': lpScore && lpScore !== 'N/A' ? { number: parseFloat(lpScore) } : { number: null },
          'Match Score': matchScore && matchScore !== 'N/A' ? { number: parseFloat(matchScore) } : { number: null },
          'Roast Data': roastData ? { rich_text: [{ text: { content: JSON.stringify({ result: roastData, icp, platform }) } }] } : { rich_text: [] },
          'Date': { date: { start: new Date().toISOString().split('T')[0] } }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Notion API error:', error);
      return res.status(500).json({ error: 'Failed to save to database' });
    }

    return res.status(200).json({ success: true, reportId });
  } catch (error) {
    console.error('Lead save error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
