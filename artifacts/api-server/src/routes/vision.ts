/**
 * POST /vision/analyze
 *
 * Accepts white + black vial captures and runs GPT-5.6-terra vision analysis.
 * Returns a structured quality assessment that supplements the heuristic engine.
 */

import { Router } from 'express';
import OpenAI from 'openai';

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? 'placeholder',
});

const SYSTEM_PROMPT = `You are an expert pharmaceutical visual quality control scientist specialising in peptide research compounds and injectable vials. You have deep experience with lyophilised powders, reconstituted solutions, and parenteral preparations.

You will receive one or two photographs of the same vial taken against different backgrounds (white, black, or both). Analyse them with scientific rigour.

WHITE BACKGROUND: best for detecting particles, foreign matter, colour deviations, fill level, cap integrity.
BLACK BACKGROUND: best for detecting haze, turbidity, opalescence, and light-scattering particles.

Return ONLY a valid JSON object in this exact shape — no markdown, no commentary:
{
  "overallVerdict": "pass" | "review" | "do-not-use",
  "confidence": <integer 0-100>,
  "clarity": { "score": <0-100>, "status": "pass"|"review"|"flag", "finding": "<concise scientific finding>" },
  "particles": { "score": <0-100>, "status": "pass"|"review"|"flag", "finding": "<concise finding>" },
  "color": { "score": <0-100>, "status": "pass"|"review"|"flag", "finding": "<concise finding>" },
  "fillLevel": { "score": <0-100>, "status": "pass"|"review"|"flag", "finding": "<concise finding>" },
  "integrity": { "score": <0-100>, "status": "pass"|"review"|"flag", "finding": "<concise finding>" },
  "primaryFindings": ["<finding 1>", "<finding 2>"],
  "recommendedAction": "<specific actionable recommendation>"
}

SCORING RULES:
- 70-100 = pass (no visual concerns)
- 40-69 = review (marginal or uncertain)
- 0-39  = flag → do-not-use
- Overall verdict must be consistent with category scores
- When uncertain, prefer "review" over "pass" — never falsely reassure
- Poor image quality lowers confidence, never inflates verdict
- Distinguish expected product appearance (e.g. GLP-1 peptides have slight yellow tint) from genuine concern`;

router.post('/vision/analyze', async (req, res) => {
  try {
    const {
      captures,
      peptideName,
      scanMode,
      appearanceProfile,
      baselineContext,
    } = req.body as {
      captures: Array<{ background: string; dataUrl: string }>;
      peptideName?: string;
      scanMode?: string;
      appearanceProfile?: string;
      baselineContext?: string[];
    };

    if (!captures || captures.length === 0) {
      res.status(400).json({ success: false, error: 'No captures provided' });
      return;
    }

    // Build the image content blocks
    const imageBlocks: OpenAI.Chat.ChatCompletionContentPart[] = captures
      .filter((c) => c.dataUrl && (c.background === 'white' || c.background === 'black'))
      .map((c) => ({
        type: 'image_url' as const,
        image_url: {
          url: c.dataUrl,
          detail: 'high' as const,
        },
      }));

    if (imageBlocks.length === 0) {
      res.status(400).json({ success: false, error: 'No usable captures' });
      return;
    }

    const productType = scanMode === 'powder' ? 'lyophilised powder (pre-mix)' : 'reconstituted liquid solution';
    const profileNote = appearanceProfile
      ? `Expected appearance profile: "${appearanceProfile}".`
      : '';
    const nameNote = peptideName ? `Product name: ${peptideName}.` : '';

    const baselineNote = baselineContext?.length
      ? `BASELINE COMPARISON — previous scans of this sample showed the following findings: ${baselineContext.map((f, i) => `(${i + 1}) ${f}`).join('; ')}. Compare the current images against this baseline and explicitly note any significant changes or deviations (e.g. increased cloudiness, new particles, colour shift). If this scan looks consistent with the baseline, state that clearly.`
      : '';

    const userText = [
      `Analyse this ${productType} vial for visual quality control.`,
      nameNote,
      profileNote,
      `${captures.filter((c) => c.background === 'white').length > 0 ? 'White background image included.' : ''}`,
      `${captures.filter((c) => c.background === 'black').length > 0 ? 'Black background image included.' : ''}`,
      'Check for: particles/foreign matter, cloudiness/haze/turbidity, colour deviations, fill level, cap and stopper integrity.',
      baselineNote,
    ]
      .filter(Boolean)
      .join(' ');

    const response = await openai.chat.completions.create({
      model: 'gpt-5.6-terra',
      max_completion_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [{ type: 'text', text: userText }, ...imageBlocks],
        },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) throw new Error('Empty AI response');

    const analysis = JSON.parse(raw);
    res.json({ success: true, analysis });
  } catch (err) {
    console.error('[vision] analysis error:', err);
    res.status(500).json({ success: false, error: 'Vision analysis failed' });
  }
});

export default router;
