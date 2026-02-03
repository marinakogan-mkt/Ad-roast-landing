// Fetch roast data by Report ID
const NOTION_DATABASE_ID = '90888e98cd794663acaf9f94ba7bd494';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing report ID' });
  }

  const NOTION_API_KEY = process.env.NOTION_API_KEY;
  if (!NOTION_API_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Query Notion database for the report ID
    const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Report ID',
          rich_text: { equals: id }
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Notion query error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const page = data.results[0];
    const roastDataText = page.properties['Roast Data']?.rich_text?.[0]?.text?.content;
    
    if (!roastDataText) {
      return res.status(404).json({ error: 'Roast data not found' });
    }

    const roastData = JSON.parse(roastDataText);
    return res.status(200).json(roastData);
    
  } catch (error) {
    console.error('Fetch roast error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
