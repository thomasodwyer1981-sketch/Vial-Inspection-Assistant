/**
 * PepScan — AI Vision Analysis Client
 *
 * Sends captures to the API server's /vision/analyze endpoint.
 * Returns structured AI analysis or null if the server is unreachable.
 * The heuristic engine always runs independently as a fallback.
 */

export interface AIVisionCategoryScore {
  score: number;
  status: 'pass' | 'review' | 'flag';
  finding: string;
}

export interface AIVisionResult {
  overallVerdict: 'pass' | 'review' | 'do-not-use';
  confidence: number;
  clarity: AIVisionCategoryScore;
  particles: AIVisionCategoryScore;
  color: AIVisionCategoryScore;
  fillLevel: AIVisionCategoryScore;
  integrity: AIVisionCategoryScore;
  primaryFindings: string[];
  recommendedAction: string;
}

export interface VisionAnalysisInput {
  captures: Array<{ background: string; dataUrl: string }>;
  peptideName?: string | null;
  scanMode?: string;
  appearanceProfile?: string | null;
  /** Pro: previous scan findings for the same sample — drives baseline comparison. */
  baselineContext?: string[];
  /** How long ago the vial was reconstituted — gives AI temporal context. */
  reconstitutedAt?: 'just-now' | '1-8h' | '1-2d' | '2d-plus' | null;
}

export async function runVisionAnalysis(
  input: VisionAnalysisInput,
): Promise<AIVisionResult | null> {
  try {
    const base = (import.meta.env.BASE_URL as string).replace(/\/$/, '');
    const res = await fetch(`${base}/api/vision/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        captures: input.captures.map((c) => ({
          background: c.background,
          dataUrl: c.dataUrl,
        })),
        peptideName: input.peptideName ?? undefined,
        scanMode: input.scanMode ?? 'liquid',
        appearanceProfile: input.appearanceProfile ?? undefined,
        baselineContext: input.baselineContext?.length ? input.baselineContext : undefined,
        reconstitutedAt: input.reconstitutedAt ?? undefined,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as { success: boolean; analysis?: AIVisionResult };
    return data.success && data.analysis ? data.analysis : null;
  } catch {
    return null;
  }
}

/**
 * Merge AI verdict with heuristic triage to produce the final call.
 * - If AI and heuristic agree → blend confidence (AI 60%, heuristic 40%)
 * - If they disagree → use the confidence of the MORE SEVERE instrument,
 *   reduced by 12% to reflect the disagreement between tools.
 *   A simple average when the two instruments give different verdicts
 *   produces misleading numbers (e.g. "DO NOT USE — 43% confidence").
 * - Safety-first: the more severe verdict always wins.
 * - If AI unavailable → use heuristic only.
 */
export function mergeVerdicts(
  heuristic: { triage: 'pass' | 'review' | 'do-not-use'; confidence: number },
  ai: AIVisionResult | null,
): { triage: 'pass' | 'review' | 'do-not-use'; confidence: number; aiEnhanced: boolean } {
  if (!ai) return { ...heuristic, aiEnhanced: false };

  const severity = { pass: 0, review: 1, 'do-not-use': 2 };
  const hSev = severity[heuristic.triage];
  const aSev = severity[ai.overallVerdict];

  // Take the more severe verdict (safety-first)
  const finalSev = Math.max(hSev, aSev);
  const triage = Object.entries(severity).find(([, v]) => v === finalSev)![0] as
    'pass' | 'review' | 'do-not-use';

  let confidence: number;

  if (hSev === aSev) {
    // Both instruments agree — blend normally and allow slight boost
    confidence = Math.min(95, Math.round(ai.confidence * 0.6 + heuristic.confidence * 0.4));
  } else {
    // Instruments disagree — use the confidence of whichever drove the worse verdict,
    // reduced by 12% to reflect the genuine uncertainty from the disagreement.
    const worseConfidence = hSev > aSev ? heuristic.confidence : ai.confidence;
    confidence = Math.round(worseConfidence * 0.88);
  }

  return { triage, confidence, aiEnhanced: true };
}
