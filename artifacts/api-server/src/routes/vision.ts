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
BLACK BACKGROUND: best for detecting haze, turbidity, opalescence, and light-scattering particles (Tyndall effect).

COMPOUND-SPECIFIC EXPECTED APPEARANCES (critical — do not flag normal appearance as a defect):
- BPC-157: crystal clear, colourless solution. Any turbidity or colour is abnormal.
- TB-500 / Thymosin β-4: clear solution. Slight transient cloudiness immediately post-reconstitution can be normal but should resolve quickly.
- Ipamorelin, CJC-1295, GHRP-2, GHRP-6: clear, colourless. Colour deviation is abnormal.
- Sermorelin, Tesamorelin, MOD-GRF: clear solution. Mild opalescence shortly after reconstitution can be normal.
- Melanotan II, PT-141 / Bremelanotide: generally clear; some batches show very slight amber tint which is acceptable. Significant discolouration is not.
- IGF-1 LR3 / IGF-1 DES: clear, colourless. Sensitive to degradation — any cloudiness is concerning.
- AOD-9604 / HGH Fragment 176-191: clear, colourless.
- Epithalon / Selank / Semax: clear. Nasal preparations may appear very slightly opalescent.
- HCG: must be crystal clear. Any turbidity or visible particulates are significant concerns.
- GHK-Cu: blue coloration is EXPECTED and NORMAL. Do not flag blue colour. Focus on turbidity and particles.
- GLP-1 / Semaglutide / Tirzepatide: colourless to slight yellow is NORMAL. Do not flag mild yellow. Flag deeper yellow, cloudiness, or particles.
- Standard clear peptide (unlisted): colourless, clear solution expected.

TEMPORAL CONTEXT — reconstitution age affects interpretation:
- "Just reconstituted (< 1 hour)": minor cloudiness or swirling may still be settling — note it but apply lower severity.
- "1–8 hours": solution should be fully clear by now; any cloudiness is more significant.
- "1–2 days (refrigerated)": clarity should be maintained; particles or colour change suggest degradation.
- "2+ days": increased scrutiny for degradation signs — cloudiness, colour shift, or new particles are meaningful concerns.

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
- Always cite the specific compound by name in your findings when it was provided
- If baseline comparison context is provided, explicitly compare and note any changes`;

router.post('/analyze', async (req, res) => {
  try {
    const {
      captures,
      peptideName,
      scanMode,
      appearanceProfile,
      baselineContext,
      reconstitutedAt,
    } = req.body as {
      captures: Array<{ background: string; dataUrl: string }>;
      peptideName?: string;
      scanMode?: string;
      appearanceProfile?: string;
      baselineContext?: string[];
      reconstitutedAt?: string | null;
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

    const nameNote = peptideName ? `Compound: ${peptideName}.` : '';

    const profileNote = appearanceProfile && appearanceProfile !== 'unknown-custom'
      ? `Appearance profile: "${appearanceProfile}" — apply compound-specific expected-appearance rules from your guidelines.`
      : appearanceProfile === 'unknown-custom'
        ? 'Appearance profile: unknown/custom — apply conservative screening; colour alone should not drive verdict.'
        : '';

    const reconNote = reconstitutedAt
      ? `Reconstitution age: ${
          reconstitutedAt === 'just-now' ? 'just reconstituted (< 1 hour) — minor cloudiness may still be settling'
          : reconstitutedAt === '1-8h'   ? '1–8 hours ago — solution should be fully clear by now'
          : reconstitutedAt === '1-2d'   ? '1–2 days ago (refrigerated) — any new cloudiness or colour change suggests degradation'
          : '2+ days old — apply increased scrutiny for degradation signs'
        }.`
      : '';

    const baselineNote = baselineContext?.length
      ? `BASELINE COMPARISON — previous scans of this sample showed: ${baselineContext.map((f, i) => `(${i + 1}) ${f}`).join('; ')}. Explicitly compare and note any changes (increased cloudiness, new particles, colour shift). If consistent with baseline, state that clearly.`
      : '';

    const userText = [
      `Analyse this ${productType} vial for visual quality control.`,
      nameNote,
      profileNote,
      reconNote,
      captures.filter((c) => c.background === 'white').length > 0 ? 'White background image included.' : '',
      captures.filter((c) => c.background === 'black').length > 0 ? 'Black background image included.' : '',
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
