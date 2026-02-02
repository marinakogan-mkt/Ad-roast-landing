export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { platform, offerType, icpDescription, landingUrl, adCopy, visualDescription, hasImage, landingCopy } = req.body;

  // Fetch landing page content if URL provided
  let landingPageContent = '';
  if (landingUrl) {
    try {
      const pageRes = await fetch(landingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      const html = await pageRes.text();
      
      // Extract text content, removing scripts/styles
      landingPageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000); // Limit to ~8k chars for context
      
      // Also extract specific elements
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/gi);
      const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      
      const extractedElements = [];
      if (titleMatch) extractedElements.push(`Page Title: ${titleMatch[1]}`);
      if (h1Match) extractedElements.push(`H1 Headlines: ${h1Match.slice(0, 3).map(h => h.replace(/<[^>]+>/g, '')).join(' | ')}`);
      if (metaDesc) extractedElements.push(`Meta Description: ${metaDesc[1]}`);
      
      if (extractedElements.length > 0) {
        landingPageContent = `EXTRACTED ELEMENTS:\n${extractedElements.join('\n')}\n\nPAGE CONTENT:\n${landingPageContent}`;
      }
    } catch (e) {
      landingPageContent = `[Could not fetch landing page: ${e.message}. Analyze based on URL pattern only.]`;
    }
  }

  const systemPrompt = `You are AdRoast, a brutally honest ad and landing page analyst for SaaS founders.

Your job:
1. Analyze whether the AD speaks to the user's stated ICP
2. Analyze the LANDING PAGE content for conversion issues (you'll receive the actual page content)
3. Identify MESSAGING MISMATCH between what the ad promises and what the landing page delivers

Key Analysis Points:
- Does the ad headline match the landing page headline?
- Does the ad promise match the landing page's value proposition?
- Is the CTA consistent between ad and landing page?
- Would clicking this ad feel like a seamless journey or a jarring disconnect?

Approach: Direct, sarcastic but not mean. Use the "barbecue test" - would this copy make sense at a casual BBQ? Cite specific copy from both ad AND landing page when critiquing. Be harsh but fair — most ads and pages deserve 4-6.

Scoring (1-10): 1-3 = Actively hurting conversions, 4-6 = Generic/forgettable, 7-8 = Solid, 9-10 = Best-in-class

Return ONLY valid JSON, no markdown.`;

  const userPrompt = `Analyze this ad AND its landing page for ICP: "${icpDescription}"

Platform: ${platform}
Offer: ${offerType}
Landing Page URL: ${landingUrl || 'Not provided'}

${adCopy ? `=== AD COPY ===
${adCopy}` : ''}

${visualDescription ? `=== AD VISUAL DESCRIPTION ===
${visualDescription}` : ''}

${landingPageContent ? `=== LANDING PAGE CONTENT (SCRAPED) ===
${landingPageContent}` : ''}

${landingCopy ? `=== LANDING PAGE CONTENT (USER-PROVIDED) ===
${landingCopy}` : ''}

${!landingPageContent && !landingCopy ? 'No landing page content available' : ''}

ANALYSIS REQUIRED:
1. AD ROAST: Score and critique the ad copy against the ICP
2. LANDING PAGE ROAST: Score and critique the landing page content - is the headline clear? Is the value prop compelling? Are CTAs visible and low-friction?
3. MESSAGING MATCH/MISMATCH: Does the landing page deliver on what the ad promises? Quote specific copy from BOTH ad and landing page to show alignment or disconnect.

Return this JSON structure:
{
  "icp_mismatch": "Does this ad speak to the ICP or accidentally target someone else?",
  "overall_score": <1-10>,
  "issues": [
    {"category": "headline_clarity", "title": "Headline Clarity", "score": <1-10>, "explanation": "feedback on ad headline"},
    {"category": "cta_friction", "title": "CTA Friction", "score": <1-10>, "explanation": "feedback on ad CTA"},
    {"category": "visual_copy_match", "title": "Visual-Copy Match", "score": <1-10>, "explanation": "feedback on visual"},
    {"category": "benefit_specificity", "title": "Benefit Specificity", "score": <1-10>, "explanation": "feedback on benefits"},
    {"category": "trust_signals", "title": "Trust Signals", "score": <1-10>, "explanation": "feedback on trust"}
  ],
  "landing_page_roast": {
    "overall_score": <1-10>,
    "headline_score": <1-10>,
    "headline_feedback": "Quote the actual landing page headline and critique it for the ICP",
    "value_prop_score": <1-10>,
    "value_prop_feedback": "Does the page clearly communicate the value? Quote specific copy.",
    "cta_score": <1-10>,
    "cta_feedback": "Is the CTA clear, visible, and low-friction? What does it say?",
    "trust_score": <1-10>,
    "trust_feedback": "Are there logos, testimonials, stats? What's missing?",
    "top_issues": ["Specific issue 1 with the landing page", "Issue 2", "Issue 3"],
    "quick_wins": ["Specific quick fix 1", "Quick fix 2", "Quick fix 3"]
  },
  "ad_landing_mismatch": {
    "alignment_score": <1-10>,
    "verdict": "One sentence: does the landing page deliver on the ad's promise? Be specific.",
    "disconnects": [
      {"problem": "Ad says X but landing page says Y - quote both", "fix": "How to align them"},
      {"problem": "Another specific mismatch with quotes", "fix": "How to fix"}
    ],
    "message_match_issues": "Detailed explanation with specific quotes showing where ad promise differs from landing page delivery"
  },
  "fix_kit": {
    "headlines": ["headline1", "headline2", "headline3"],
    "body": "rewritten ad body that matches landing page messaging",
    "ctas": ["cta1", "cta2"],
    "landing_page_headline": "Suggested landing page headline that aligns with ad",
    "landing_page_subhead": "Suggested subheadline for landing page",
    "rationale": "Why these changes create message match between ad and landing page"
  },
  "experiments": [
    {"title": "Test 1", "description": "what to test"},
    {"title": "Test 2", "description": "what to test"},
    {"title": "Test 3", "description": "what to test"}
  ],
  "next_steps": ["step1", "step2", "step3", "step4"]
}

CRITICAL: Quote actual copy from both ad AND landing page when critiquing. If the landing page says "Automate your workflow" but the ad says "Save 10 hours/week", that's a mismatch—call it out with the exact quotes.

IMPORTANT: If ANY landing page content is provided (either scraped or user-pasted), you MUST return real scores (1-10) for landing_page_roast and ad_landing_mismatch. Never return 0 when content exists.
If no landing page content is provided at all, set landing_page_roast scores to 0 and note "No landing page content available".
If no ad copy is provided, focus more heavily on landing page analysis.`;

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
        max_tokens: 4000,
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
        const parsed = JSON.parse(jsonMatch[0]);
        // Ensure landing_page_roast and ad_landing_mismatch always exist
        if (!parsed.landing_page_roast) {
          parsed.landing_page_roast = { overall_score: null, headline_score: null, headline_feedback: 'No landing page content available', value_prop_score: null, value_prop_feedback: '', cta_score: null, cta_feedback: '', trust_score: null, trust_feedback: '', top_issues: [], quick_wins: [] };
        }
        if (!parsed.ad_landing_mismatch) {
          parsed.ad_landing_mismatch = { alignment_score: null, verdict: 'No landing page provided for comparison', disconnects: [], message_match_issues: '' };
        }
        return res.status(200).json(parsed);
      }
    }

    return res.status(500).json({ error: 'Could not parse response' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
