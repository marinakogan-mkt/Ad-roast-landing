export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, offerType, icpDescription, landingUrl, adCopy, visualDescription, hasImage } = req.body;

  const systemPrompt = `You are AdRoast, a brutally honest ad performance analyst for SaaS founders.

CRITICAL: Analyze whether the ad speaks to the user's stated ICP.

Approach: Direct, sarcastic but not mean. Use the "barbecue test". Cite specific copy. Be harsh but fair — most ads are 4-6.

Return ONLY valid JSON, no markdown.`;

  const userPrompt = `Analyze this ad for ICP: "${icpDescription}"

Platform: ${platform}
Offer: ${offerType}
${landingUrl ? `URL: ${landingUrl}` : ''}
${adCopy ? `Copy: ${adCopy}` : ''}
${visualDescription ? `Visual: ${visualDescription}` : ''}

Return JSON:
{
  "icp_mismatch": "Does this ad speak to the ICP or accidentally target someone else?",
  "overall_score": <1-10>,
  "issues": [
    {"category": "headline_clarity", "title": "Headline Clarity", "score": <1-10>, "explanation": "feedback"},
    {"category": "cta_friction", "title": "CTA Friction", "score": <1-10>, "explanation": "feedback"},
    {"category": "visual_copy_match", "title": "Visual-Copy Match", "score": <1-10>, "explanation": "feedback"},
    {"category": "benefit_specificity", "title": "Benefit Specificity", "score": <1-10>, "explanation": "feedback"},
    {"category": "trust_signals", "title": "Trust Signals", "score": <1-10>, "explanation": "feedback"}
  ],
  "fix_kit": {
    "headlines": ["headline1", "headline2", "headline3"],
    "body": "rewritten body",
    "ctas": ["cta1", "cta2"],
    "rationale": "why these work"
  },
  "experiments": [
    {"title": "Test 1", "description": "what to test"},
    {"title": "Test 2", "description": "what to test"},
    {"title": "Test 3", "description": "what to test"}
  ],
  "next_steps": ["step1", "step2", "step3", "step4"]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'API error' });
    }

    if (data.content?.[0]?.text) {
      const jsonMatch = data.content[0].text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return res.status(200).json(JSON.parse(jsonMatch[0]));
      }
    }

    return res.status(500).json({ error: 'Could not parse response' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
