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
 * - If AI and heuristic agree → use that result with boosted confidence
 * - If AI is more severe → use AI (safety-first)
 * - If heuristic is more severe → use heuristic (safety-first)
 * - If AI unavailable → use heuristic only
 */
export function mergeVerdicts(
  heuristic: { triage: 'pass' | 'review' | 'do-not-use'; confidence: number },
  ai: AIVisionResult | null,
): { triage: 'pass' | 'review' | 'do-not-use'; confidence: number; aiEnhanced: boolean } {
  if (!ai) return { ...heuristic, aiEnhanced: false };

  const severity = { pass: 0, review: 1, 'do-not-use': 2 };
  const hSev = severity[heuristic.triage];
  const aSev = severity[ai.overallVerdict];

  // Take the more severe verdict
  const finalSev = Math.max(hSev, aSev);
  const triage = Object.entries(severity).find(([, v]) => v === finalSev)![0] as
    'pass' | 'review' | 'do-not-use';

  // Blend confidence — weight AI at 60%, heuristic at 40%
  const blended = Math.round(ai.confidence * 0.6 + heuristic.confidence * 0.4);

  return { triage, confidence: blended, aiEnhanced: true };
}
