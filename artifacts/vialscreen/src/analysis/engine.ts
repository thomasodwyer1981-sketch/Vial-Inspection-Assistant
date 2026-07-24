/**
 * VialScreen — Heuristic Scoring Engine
 *
 * All scoring is rule-based and heuristic only.
 * No AI inference. No lab-grade analysis.
 * Results represent visual screening only.
 *
 * SCORING PHILOSOPHY:
 * - Low confidence → prefer REVIEW over PASS
 * - Poor capture quality → never produce a falsely reassuring result
 * - Uncertain findings → bias toward REVIEW, not PASS
 * - Multiple strong flags → DO_NOT_USE
 * - Profile-aware: color/tint interpretation depends on the selected appearance profile
 */

import type {
  AnalysisResult,
  CategoryScore,
  CategoryKey,
  CategoryStatus,
  MediaCapture,
  TriageResult,
  AppearanceProfile,
  ScanMode,
} from '../types';
import {
  loadImage,
  drawToCanvas,
  computePixelStats,
  computeBlurMetrics,
  computeGlareAnalysis,
  computeParticleAnalysis,
  computeColorProfile,
  estimateFillLevel,
  computeDifferentialTurbidity,
  estimateVialROI,
  type DifferentialTurbidity,
} from './imageAnalysis';

// ----------------------------------------------------------------
// Score → Status thresholds
// ----------------------------------------------------------------
function scoreToStatus(score: number, invert = false): CategoryStatus {
  // For most categories: higher score = better
  // invert=true for risk scores (higher score = worse)
  const effective = invert ? 100 - score : score;
  if (effective >= 70) return 'pass';
  if (effective >= 40) return 'review';
  return 'flag';
}

// ----------------------------------------------------------------
// 1. CAPTURE QUALITY
// Combines: blur, exposure, image size
// Method: Laplacian variance for sharpness + brightness stats
// ----------------------------------------------------------------
async function scoreCaptureQuality(
  captures: MediaCapture[],
): Promise<CategoryScore> {
  const category: CategoryKey = 'captureQuality';
  const label = 'Capture Quality';

  const whiteCapture = captures.find((c) => c.background === 'white');
  const blackCapture = captures.find((c) => c.background === 'black');

  if (!whiteCapture && !blackCapture) {
    return {
      category,
      label,
      score: 0,
      status: 'unable',
      explanation: 'No captures found for quality assessment.',
      method: 'No image data available.',
    };
  }

  const scores: number[] = [];
  const issues: string[] = [];

  for (const cap of [whiteCapture, blackCapture].filter(Boolean) as MediaCapture[]) {
    try {
      const img = await loadImage(cap.dataUrl);
      const { ctx, width, height } = drawToCanvas(img, 512);
      const imageData = ctx.getImageData(0, 0, width, height);

      const pixelStats = computePixelStats(imageData);
      const blur = computeBlurMetrics(imageData);

      // Sharpness
      if (blur.sharpnessScore < 30) issues.push('image appears blurry');
      scores.push(blur.sharpnessScore);

      // Overexposure
      if (pixelStats.overexposedFraction > 0.4) {
        issues.push('image appears overexposed');
        scores.push(20);
      } else if (pixelStats.overexposedFraction > 0.2) {
        scores.push(60);
      } else {
        scores.push(90);
      }

      // Underexposure
      if (pixelStats.underexposedFraction > 0.5) {
        issues.push('image appears underexposed');
        scores.push(20);
      } else {
        scores.push(85);
      }

      // Image resolution check
      if (cap.width < 400 || cap.height < 400) {
        issues.push('image resolution is low');
        scores.push(40);
      } else {
        scores.push(90);
      }
    } catch {
      issues.push('could not analyze capture');
      scores.push(30);
    }
  }

  const score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const status = scoreToStatus(score);

  let explanation: string;
  if (issues.length === 0) {
    explanation = 'Captures appear to have adequate sharpness and exposure for screening.';
  } else {
    explanation = `Quality concerns detected: ${issues.join('; ')}. Results may be less reliable.`;
  }

  return {
    category,
    label,
    score,
    status,
    explanation,
    method:
      'Laplacian variance for sharpness (threshold: <50=blurry, >500=sharp). ' +
      'Overexposure: fraction of pixels >245 brightness. Underexposure: fraction <10.',
  };
}

// ----------------------------------------------------------------
// 2. CLARITY / HAZE SUSPICION
// Profile-aware: interpretation depends on selected appearance profile.
//
// clear-standard: clear/colorless baseline; detects amber oxidation tint.
// ghk-cu:         blue tint expected — separates color from turbidity.
// unknown-custom: color is not used as signal; conservative turbidity check.
//
// PRIMARY METHOD: Differential turbidity (when both white and black
// captures are available). Compares brightness of the vial body region
// across both captures — a clear solution has a high brightness delta
// (nearly transparent); a turbid/hazy solution has a low delta (light
// scatters on both backgrounds). This is a nephelometry-inspired approach.
//
// SECONDARY METHOD: Std dev of brightness on white background (used as
// a 35% secondary signal, or as the sole signal when black capture is absent).
//
// ALSO CHECKS: Sediment/precipitation patterns in the vial base region.
// Amber/yellow oxidation tinting for standard-clear peptides.
// ----------------------------------------------------------------
async function scoreClarityHaze(
  captures: MediaCapture[],
  profile: AppearanceProfile | null,
): Promise<CategoryScore> {
  const category: CategoryKey = 'clarity';
  const label = 'Clarity / Appearance';

  const whiteCapture = captures.find((c) => c.background === 'white');
  const blackCapture = captures.find((c) => c.background === 'black');

  if (!whiteCapture) {
    return {
      category,
      label,
      score: 0,
      status: 'unable',
      explanation: 'No white-background capture available for clarity assessment.',
      method: 'Requires white background capture.',
    };
  }

  try {
    const img = await loadImage(whiteCapture.dataUrl);
    const { ctx, width, height } = drawToCanvas(img, 512);
    const whiteData = ctx.getImageData(0, 0, width, height);

    const stats = computePixelStats(whiteData);
    const glare = computeGlareAnalysis(whiteData);
    const color = computeColorProfile(whiteData);

    // ── Differential turbidity (core improvement) ─────────────
    // When both backgrounds are available, compare the vial body brightness
    // across captures. High delta = clear; low delta = turbid.
    let differential: DifferentialTurbidity | null = null;
    if (blackCapture) {
      try {
        const bImg = await loadImage(blackCapture.dataUrl);
        const { ctx: bCtx, width: bW, height: bH } = drawToCanvas(bImg, 512);
        const blackData = bCtx.getImageData(0, 0, bW, bH);
        differential = computeDifferentialTurbidity(whiteData, blackData);
      } catch {
        // Black capture couldn't be loaded — fall back to single-image analysis
      }
    }

    // Blend: 65% differential (physically meaningful), 35% std dev (local texture)
    const blendScore = (stdDevScore: number): number => {
      if (!differential) return stdDevScore;
      return Math.round(0.65 * differential.differentialClarityScore + 0.35 * stdDevScore);
    };

    // ── Glare override (all profiles) ─────────────────────────
    if (glare.glareFraction > 0.25) {
      return {
        category,
        label,
        score: 50,
        status: 'review',
        explanation:
          'High glare detected in white-background capture. Clarity cannot be reliably assessed. ' +
          'Recapture with softer, more even lighting — avoid direct light or specular reflections on the vial surface.',
        method: 'Glare override: specular fraction >25%. Std dev + differential turbidity suppressed.',
      };
    }

    // ── Sediment note ─────────────────────────────────────────
    const sedimentNote = differential?.sedimentSuspected
      ? ' A brightness anomaly was detected near the bottom of the vial — ' +
        'possible precipitation, incomplete dissolution, or settled peptide. ' +
        'Swirl gently and re-inspect if reconstitution is recent.'
      : '';

    // ── Amber / oxidation check (all profiles except GHK-Cu) ──
    // Yellow-amber shift in a reconstituted peptide = oxidation signal.
    // Methionine, tryptophan, and cysteine residues oxidise to produce
    // yellow-brown discolouration over time or under poor storage.
    const oxidationSuspected = color.amberDominant && profile !== 'ghk-cu';
    const oxidationNote = oxidationSuspected
      ? ' Amber/yellow tinting detected — possible oxidation or degradation of peptide residues (e.g. methionine, tryptophan). Verify against expected colour and storage conditions.'
      : '';
    const oxidationPenalty = oxidationSuspected ? 12 : 0;

    // ─────────────────────────────────────────────────────────
    // Profile-specific scoring
    // ─────────────────────────────────────────────────────────

    // ── GHK-Cu / Blue Peptide ─────────────────────────────────
    if (profile === 'ghk-cu') {
      if (color.blueDominant) {
        const stdDevScore = Math.max(0, 100 - stats.stdDevBrightness * 1.2);
        const score = Math.round(Math.min(100, Math.max(0, blendScore(stdDevScore))));
        const status: CategoryStatus = score >= 65 ? 'pass' : score >= 40 ? 'review' : 'flag';
        const explanation =
          score >= 65
            ? `Blue coloration detected — consistent with GHK-Cu / Blue Peptide profile. ` +
              `Color is not treated as a concern.` +
              (differential
                ? ` Two-background turbidity delta of ${Math.round(differential.brightnessDelta)} supports a clear-bodied solution.`
                : ' No significant additional cloudiness detected.') +
              sedimentNote
            : `Blue coloration present (consistent with GHK-Cu / Blue Peptide profile). ` +
              `Elevated turbidity signal beyond expected tint — possible cloudiness or incomplete mixing.` +
              sedimentNote;
        return {
          category, label, score, status, explanation,
          method: `GHK-Cu profile: differential turbidity (65%) + std dev (35%). Blue dominance confirmed. Delta=${differential ? Math.round(differential.brightnessDelta) : 'n/a'}.`,
        };
      } else {
        const stdDevScore = Math.max(0, 100 - stats.stdDevBrightness * 1.5);
        const score = Math.round(Math.min(100, Math.max(0, blendScore(stdDevScore))));
        const status = scoreToStatus(score);
        const explanation =
          score >= 70
            ? `GHK-Cu profile selected, but no prominent blue coloration detected. No obvious turbidity found. Verify vial contents and profile selection.${sedimentNote}`
            : `GHK-Cu profile selected, but no prominent blue coloration detected. Possible turbidity present. Review carefully.${sedimentNote}`;
        return {
          category, label, score, status, explanation,
          method: 'GHK-Cu profile (no blue): differential turbidity + std dev. Profile discrepancy noted.',
        };
      }
    }

    // ── GLP-1 / Peptide Hormone (semaglutide, tirzepatide) ────
    // Colorless to slight yellow is physiologically normal for these compounds.
    // Reduce the oxidation penalty for a light warm/yellow tint.
    // Cloudiness, particles, and deeper amber are still flagged normally.
    if (profile === 'glp1-clear') {
      // Half the oxidation penalty: light tint is expected, heavy tint is still a concern.
      const glp1AmberPenalty = oxidationSuspected ? 5 : 0;
      const tintNote = oxidationSuspected
        ? ' Slight yellow/warm tint detected. A very light tint is common in compounded GLP-1 preparations — deeper amber or golden coloration should be verified with your supplier or prescriber.'
        : '';
      const stdDevScore = Math.max(0, 100 - stats.stdDevBrightness * 1.5);
      const score = Math.round(Math.min(100, Math.max(0, blendScore(stdDevScore) - glp1AmberPenalty)));
      const status = scoreToStatus(score);
      const explanation =
        score >= 70
          ? `No significant cloudiness or haze detected.` +
            (differential
              ? ` Two-background brightness delta of ${Math.round(differential.brightnessDelta)} is consistent with a clear solution.`
              : '') +
            sedimentNote + tintNote
          : score >= 40
          ? `Possible cloudiness or haze detected.` +
            (differential
              ? ` Two-background brightness delta of ${Math.round(differential.brightnessDelta)} suggests some light scattering.`
              : '') +
            sedimentNote + tintNote
          : `Significant turbidity detected. Compounded GLP-1 solutions should appear mostly clear.` +
            sedimentNote + tintNote;
      return {
        category, label, score, status, explanation,
        method: `GLP-1 profile: differential turbidity 65% + std dev 35%. Amber penalty=${glp1AmberPenalty} (reduced vs clear-standard). Delta=${differential ? Math.round(differential.brightnessDelta) : 'n/a'}. Sediment: ${differential?.sedimentSuspected ? 'POSITIVE' : 'clear'}.`,
      };
    }

    // ── Unknown / Custom Appearance ───────────────────────────
    if (profile === 'unknown-custom') {
      const stdDevScore = Math.max(0, 100 - stats.stdDevBrightness * 1.5);
      // Conservative bias: borderline cases should land in REVIEW
      const score = Math.round(Math.min(100, Math.max(0, blendScore(stdDevScore) - 8 - oxidationPenalty)));
      const status = scoreToStatus(score);
      const explanation =
        score >= 70
          ? `Unknown/Custom profile — colour not used as signal. No significant turbidity detected.${sedimentNote}${oxidationNote}`
          : score >= 40
          ? `Unknown/Custom profile — elevated turbidity signal detected. Conservative profile defaults to review.${sedimentNote}${oxidationNote}`
          : `Unknown/Custom profile — significant turbidity signal detected. Review strongly recommended.${sedimentNote}${oxidationNote}`;
      return {
        category, label, score, status, explanation,
        method: `Unknown/Custom profile: differential turbidity (65%) + std dev (35%) −8 conservative. Delta=${differential ? Math.round(differential.brightnessDelta) : 'n/a'}.`,
      };
    }

    // ── Standard Clear Peptide (default) ─────────────────────
    const stdDevScore = Math.max(0, 100 - stats.stdDevBrightness * 1.5);
    const blended = blendScore(stdDevScore);
    const score = Math.round(Math.min(100, Math.max(0, blended - oxidationPenalty)));
    const status = scoreToStatus(score);

    let explanation: string;
    if (color.blueDominant && score >= 70) {
      explanation =
        'Unexpected blue tint detected — if this compound is expected to appear blue (e.g. GHK-Cu), ' +
        'consider selecting the GHK-Cu / Blue Peptide profile for more accurate interpretation. ' +
        `No significant turbidity detected.${sedimentNote}`;
    } else if (score >= 70) {
      explanation =
        `No obvious cloudiness or haze detected.` +
        (differential
          ? ` Two-background brightness delta of ${Math.round(differential.brightnessDelta)} is consistent with a clear solution.`
          : '') +
        sedimentNote + oxidationNote;
    } else if (score >= 40) {
      explanation =
        `Possible haze or cloudiness detected.` +
        (differential
          ? ` Two-background brightness delta of ${Math.round(differential.brightnessDelta)} suggests light scattering in the solution.`
          : '') +
        sedimentNote + oxidationNote;
    } else {
      explanation =
        `Significant turbidity signal detected.` +
        (differential
          ? ` Two-background brightness delta of ${Math.round(differential.brightnessDelta)} is consistent with a cloudy or hazy solution.`
          : '') +
        sedimentNote + oxidationNote;
    }

    return {
      category,
      label,
      score,
      status,
      explanation,
      method: differential
        ? `Standard clear: differential turbidity 65% (delta=${Math.round(differential.brightnessDelta)}) + std dev 35%. Amber/oxidation penalty=${oxidationPenalty}. Sediment check: ${differential.sedimentSuspected ? 'POSITIVE' : 'clear'}.`
        : `Standard clear: std dev only (no black capture). Amber/oxidation penalty=${oxidationPenalty}.`,
    };
  } catch {
    return {
      category,
      label,
      score: 40,
      status: 'review',
      explanation: 'Unable to analyze white-background capture for clarity.',
      method: 'Analysis failed — defaulting to review.',
    };
  }
}

// ----------------------------------------------------------------
// 3. VISIBLE PARTICLE SUSPICION
// Best on black background. White background as secondary check.
// Particle screening applies regardless of profile — particles
// are a concern in all expected appearances.
//
// IMPROVEMENT: Particle detection is ROI-bounded, and the ROI is
// estimated PER CAPTURE (background-aware). The two captures are
// separate photos — the phone almost always moves between shots, so
// reusing the black-capture ROI on the white image would scan the
// wrong region. This eliminates false positives from label text,
// background edges, cap details, and surrounding objects.
// ----------------------------------------------------------------
async function scoreVisibleParticles(captures: MediaCapture[]): Promise<CategoryScore> {
  const category: CategoryKey = 'visibleParticles';
  const label = 'Visible Particle Suspicion';

  const blackCapture = captures.find((c) => c.background === 'black');
  const whiteCapture = captures.find((c) => c.background === 'white');

  const results: { score: number; count: number }[] = [];

  for (const [cap, bg] of [
    [blackCapture, 'black'],
    [whiteCapture, 'white'],
  ] as [MediaCapture | undefined, 'black' | 'white'][]) {
    if (!cap) continue;
    try {
      const img = await loadImage(cap.dataUrl);
      const { ctx, width, height } = drawToCanvas(img, 512);
      const imageData = ctx.getImageData(0, 0, width, height);
      // Estimate the vial ROI for THIS capture so the particle scan
      // focuses on the vial body only
      const roi = estimateVialROI(imageData, bg);
      const analysis = computeParticleAnalysis(imageData, bg, roi);
      results.push({ score: analysis.particleRiskScore, count: analysis.suspiciousSpeckCount });
    } catch {
      // skip failed
    }
  }

  if (results.length === 0) {
    return {
      category,
      label,
      score: 0,
      status: 'unable',
      explanation: 'No captures available for particle analysis. Unable to assess.',
      method: 'No captures available.',
    };
  }

  // Take the worst (highest risk) result
  const worstRisk = Math.max(...results.map((r) => r.score));
  const maxCount = Math.max(...results.map((r) => r.count));

  // Invert: high risk score → low quality score
  const qualityScore = Math.round(100 - worstRisk);
  const status = scoreToStatus(worstRisk, true);

  let explanation: string;
  if (worstRisk < 20) {
    explanation =
      'No significant speck-like regions detected in captured images. ' +
      'Note: this does not rule out submicron particles or particles outside the captured frame.';
  } else if (worstRisk < 50) {
    explanation = `${maxCount} candidate speck-like region(s) detected. Review captures carefully. ` +
      'Could be glare artifacts, label text, or actual particles. Manual inspection recommended.';
  } else {
    explanation = `${maxCount} suspicious speck-like region(s) detected across captures. ` +
      'Strong visual review recommended before any use. This does not confirm contamination.';
  }

  return {
    category,
    label,
    score: qualityScore,
    status,
    explanation,
    method:
      'Connected-component BFS on brightness-thresholded image. ' +
      'Black background: isolates bright specks (>180 brightness, 2–500px area). ' +
      'White background: isolates dark specks (<80 brightness). ' +
      'Risk score = speck count × 3.5, capped at 100.',
  };
}

// ----------------------------------------------------------------
// 4. FILL LEVEL
// ----------------------------------------------------------------
async function scoreFillLevel(captures: MediaCapture[]): Promise<CategoryScore> {
  const category: CategoryKey = 'fillLevel';
  const label = 'Fill Level Estimate';

  const whiteCapture = captures.find((c) => c.background === 'white');

  if (!whiteCapture) {
    return {
      category,
      label,
      score: 0,
      status: 'unable',
      explanation: 'Fill level could not be assessed — no white-background capture available.',
      method: 'Requires white background capture.',
    };
  }

  try {
    const img = await loadImage(whiteCapture.dataUrl);
    const { ctx, width, height } = drawToCanvas(img, 512);
    const imageData = ctx.getImageData(0, 0, width, height);
    // Constrain the meniscus search to the detected vial body so cap edges
    // and background transitions cannot masquerade as the fill line.
    const roi = estimateVialROI(imageData, 'white');
    const fill = estimateFillLevel(imageData, roi);

    if (!fill.fillFraction || fill.confidence === 'unable') {
      return {
        category,
        label,
        score: 0,
        status: 'unable',
        explanation:
          'Unable to estimate fill level from this capture. ' +
          'The meniscus line may not be visible, or the vial may be opaque.',
        method: 'Horizontal gradient edge detection within detected vial region. Unable to detect clear edge.',
      };
    }

    const pct = Math.round(fill.fillFraction * 100);

    // Flag if appears very underfilled (<30%) or overfilled (>95%)
    let score = 80;
    let explanation = `Estimated fill level: approximately ${pct}% (${fill.confidence} confidence).`;

    if (fill.fillFraction < 0.2) {
      score = 30;
      explanation += ' Vial appears significantly underfilled.';
    } else if (fill.fillFraction > 0.97) {
      score = 60;
      explanation += ' Vial appears very full — verify headspace is normal.';
    } else {
      explanation += ' Fill level appears within a normal range for a partially filled vial.';
    }

    explanation += ' Note: fill level estimation is approximate and may be inaccurate.';

    return {
      category,
      label,
      score,
      status: scoreToStatus(score),
      explanation,
      method:
        'Column-averaged brightness profile (central 40% of detected vial region, cap band excluded). ' +
        'Strongest horizontal gradient identified as meniscus candidate. ' +
        'Fill fraction measured relative to vial body height.',
    };
  } catch {
    return {
      category,
      label,
      score: 0,
      status: 'unable',
      explanation: 'Fill level analysis encountered an error.',
      method: 'Analysis failed.',
    };
  }
}

// ----------------------------------------------------------------
// 5. CAP / STOPPER INTEGRITY
// Basic: check top region for expected darker/different area
// ----------------------------------------------------------------
async function scoreCapIntegrity(captures: MediaCapture[]): Promise<CategoryScore> {
  const category: CategoryKey = 'capIntegrity';
  const label = 'Cap / Stopper Presence';

  const primary = captures.find((c) => c.background === 'white') ??
    captures.find((c) => c.background === 'black');

  if (!primary) {
    return {
      category,
      label,
      score: 0,
      status: 'unable',
      explanation: 'No capture available for cap assessment.',
      method: 'No image data.',
    };
  }

  try {
    const img = await loadImage(primary.dataUrl);
    const { ctx, width, height } = drawToCanvas(img, 256);

    // Compare the top 15% (cap region) against the vial mid-body band
    // (40–70% of height). Comparing top vs the WHOLE image diluted the
    // signal, because the whole image includes the cap itself.
    const topHeight = Math.floor(height * 0.15);
    const topData = ctx.getImageData(0, 0, width, topHeight);
    const topStats = computePixelStats(topData);

    const midY = Math.floor(height * 0.4);
    const midHeight = Math.max(1, Math.floor(height * 0.3));
    const midData = ctx.getImageData(0, midY, width, midHeight);
    const midStats = computePixelStats(midData);

    const brightnessDiff = Math.abs(topStats.meanBrightness - midStats.meanBrightness);

    // If the top region is distinctly different from the mid-body → cap likely present
    const capLikelyPresent = brightnessDiff > 20;

    return {
      category,
      label,
      score: capLikelyPresent ? 85 : 50,
      status: capLikelyPresent ? 'pass' : 'review',
      explanation: capLikelyPresent
        ? 'A distinct top region was detected, suggesting a cap or stopper may be present. ' +
          'Verify visually.'
        : 'No distinct top-region difference detected. Confirm cap is present and properly seated.',
      method:
        'Brightness difference between top 15% (cap region) and mid-body band (40–70% height). ' +
        'Difference >20 → cap candidate present.',
    };
  } catch {
    return {
      category,
      label,
      score: 0,
      status: 'unable',
      explanation: 'Cap assessment encountered an error.',
      method: 'Analysis failed.',
    };
  }
}

// ----------------------------------------------------------------
// 6. LABEL OCR CONFIDENCE
// Uses simple text extraction via the Tesseract.js worker if available,
// falls back to a conservative "unable to assess" result.
// ----------------------------------------------------------------
/**
 * Normalize a string for OCR-tolerant matching: lowercase, strip
 * non-alphanumerics, and collapse common OCR confusions (O↔0, I/L↔1, S↔5).
 * Applied identically to BOTH sides so the confusions cancel out.
 */
function normalizeForOcrMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/o/g, '0')
    .replace(/[il]/g, '1')
    .replace(/s/g, '5');
}

async function scoreLabelOcr(
  captures: MediaCapture[],
  expectedPeptideName?: string,
  onProgress?: (phase: string) => void,
): Promise<CategoryScore> {
  const category: CategoryKey = 'labelOcr';
  const label = 'Label Readability';

  // Use BOTH label captures when present — the secondary detail shot often
  // contains the batch/concentration text the primary shot missed.
  const labelCaptures = captures.filter(
    (c) => c.background === 'label' || c.background === 'label2',
  );

  if (labelCaptures.length === 0) {
    return {
      category,
      label,
      score: 50,
      status: 'unable',
      explanation: 'No label capture provided. Label text could not be assessed.',
      method: 'No label image available.',
    };
  }

  // Attempt Tesseract.js OCR (dynamically imported to avoid bloating initial bundle)
  try {
    // Dynamic import — only loaded if label capture exists
    const Tesseract = await import('tesseract.js');

    let combinedText = '';
    let confidence = 0;
    for (const cap of labelCaptures) {
      const result = await Tesseract.recognize(cap.dataUrl, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (!onProgress) return;
          if (m.status === 'loading tesseract core') {
            onProgress('Loading OCR engine — first run may take a moment…');
          } else if (m.status === 'loading language traineddata') {
            onProgress('Downloading OCR language data…');
          } else if (m.status === 'initializing tesseract') {
            onProgress('Initializing OCR…');
          } else if (m.status === 'recognizing text') {
            onProgress(`Reading label text (${Math.round(m.progress * 100)}%)…`);
          }
        },
      });
      const t = result.data.text.trim();
      if (t) combinedText += (combinedText ? '\n' : '') + t;
      confidence = Math.max(confidence, result.data.confidence); // 0–100
    }

    const text = combinedText.trim();

    let matchScore = confidence;
    let explanation = '';

    if (text.length < 3) {
      return {
        category,
        label,
        score: 30,
        status: 'review',
        explanation: 'Label capture was taken but text could not be extracted. ' +
          'Verify the label is clearly visible and well-lit.',
        method: 'Tesseract.js OCR — insufficient text extracted.',
      };
    }

    explanation = `Label text extracted (OCR confidence: ${Math.round(confidence)}%). Extracted: "${text.slice(0, 80)}${text.length > 80 ? '…' : ''}"`;

    if (expectedPeptideName && expectedPeptideName.trim().length > 0) {
      const foundNorm = normalizeForOcrMatch(text);
      const expectedWords = expectedPeptideName
        .trim()
        .split(/\s+/)
        .map(normalizeForOcrMatch)
        .filter((w) => w.length > 0);
      const wordMatches = expectedWords.filter((w) => foundNorm.includes(w)).length;
      const wordTotal = Math.max(1, expectedWords.length);
      const matchRatio = wordMatches / wordTotal;

      if (matchRatio >= 0.8) {
        explanation += ` Expected name "${expectedPeptideName}" appears to match label text.`;
        matchScore = Math.min(100, matchScore + 10);
      } else if (matchRatio >= 0.4) {
        explanation += ` Partial match with expected name "${expectedPeptideName}". Review carefully.`;
        matchScore = Math.min(matchScore, 60);
      } else {
        explanation += ` Expected name "${expectedPeptideName}" was NOT clearly found in label text. Manual verification strongly recommended.`;
        matchScore = Math.min(matchScore, 30);
      }
    }

    return {
      category,
      label,
      score: Math.round(matchScore),
      status: scoreToStatus(Math.round(matchScore)),
      explanation,
      method: 'Tesseract.js OCR over all label captures, English language pack. ' +
        'Match scored by word-level overlap after OCR-tolerant normalization ' +
        '(case/punctuation stripped; O↔0, I/L↔1, S↔5 collapsed on both sides).',
    };
  } catch {
    // OCR failed or Tesseract unavailable. First run needs network access to
    // fetch the OCR engine + language data — call that out when offline.
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return {
      category,
      label,
      score: 50,
      status: 'unable',
      explanation: offline
        ? 'Label text reading needs an internet connection the first time it runs ' +
          '(the OCR engine downloads on demand). Reconnect and rescan, or verify the label manually.'
        : 'Label capture was taken but OCR could not be performed. ' +
          'Verify the label manually.',
      method: 'Tesseract.js OCR failed or unavailable. Fallback: unable.',
    };
  }
}

// ----------------------------------------------------------------
// 7. CRACK / DAMAGE SUSPICION
//
// IMPORTANT LIMITATION FOR ROUNDED GLASS VIALS:
// Cylindrical glass vials inherently produce high-contrast images due
// to glass-wall refraction and specular highlights from the curved surface.
// A normal undamaged round vial viewed on a white background will routinely
// produce brightness std dev >90. The previous threshold of >90 was therefore
// misfiring on essentially every normal rounded vial.
//
// The threshold has been raised substantially. This scorer is acknowledged
// to be unreliable for visual crack detection and is now used only as a
// very strong anomaly signal (extremely high contrast that exceeds what
// normal glass-wall reflections produce).
//
// For reliable container integrity assessment, physical inspection is required.
// ----------------------------------------------------------------
async function scoreCrackDamage(captures: MediaCapture[]): Promise<CategoryScore> {
  const category: CategoryKey = 'crackDamage';
  const label = 'Glass / Container Damage';

  const primary = captures.find((c) => c.background === 'white') ??
    captures.find((c) => c.background === 'black');

  if (!primary) {
    return {
      category,
      label,
      score: 60,
      status: 'review',
      explanation: 'No capture available for container assessment. Inspect physically.',
      method: 'No image data.',
    };
  }

  try {
    const img = await loadImage(primary.dataUrl);
    const { ctx, width, height } = drawToCanvas(img, 256);
    const imageData = ctx.getImageData(0, 0, width, height);
    const stats = computePixelStats(imageData);

    // Rounded glass vials always have std dev >70 due to glass-wall refraction.
    // Only flag at a substantially higher threshold (>115) to avoid constant
    // false positives — and even then, note this is not a reliable crack signal.
    const extremeAnomaly = stats.stdDevBrightness > 115;

    return {
      category,
      label,
      score: extremeAnomaly ? 45 : 78,
      status: extremeAnomaly ? 'review' : 'pass',
      explanation: extremeAnomaly
        ? 'Unusually high brightness contrast detected — could indicate physical damage, but rounded glass vials inherently produce strong reflections. ' +
          'Physically inspect the container before use.'
        : 'No extreme contrast anomalies detected. ' +
          'Note: hairline cracks and micro-damage cannot be reliably detected from phone captures. ' +
          'Always physically inspect the vial before use.',
      method:
        'Brightness std dev as rough edge-irregularity proxy. ' +
        'Threshold raised to >115 to account for normal rounded-glass-wall refraction artifacts. ' +
        'This heuristic cannot confirm or rule out crack/chip damage.',
    };
  } catch {
    return {
      category,
      label,
      score: 60,
      status: 'review',
      explanation: 'Container assessment encountered an error. Inspect physically.',
      method: 'Analysis failed.',
    };
  }
}

// ----------------------------------------------------------------
// 8. GLARE / REFLECTION INTERFERENCE
// ----------------------------------------------------------------
async function scoreGlareInterference(captures: MediaCapture[]): Promise<CategoryScore> {
  const category: CategoryKey = 'glareInterference';
  const label = 'Glare / Reflection Interference';

  const relevant = captures.filter((c) => c.background === 'white' || c.background === 'black');

  if (relevant.length === 0) {
    return {
      category,
      label,
      score: 0,
      status: 'unable',
      explanation: 'No captures available for glare assessment.',
      method: 'No image data.',
    };
  }

  const scores: number[] = [];

  for (const cap of relevant) {
    try {
      const img = await loadImage(cap.dataUrl);
      const { ctx, width, height } = drawToCanvas(img, 512);
      const imageData = ctx.getImageData(0, 0, width, height);
      const glare = computeGlareAnalysis(imageData);
      scores.push(glare.glareScore);
    } catch {
      scores.push(50);
    }
  }

  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const status = scoreToStatus(avgScore);

  return {
    category,
    label,
    score: avgScore,
    status,
    explanation:
      avgScore >= 70
        ? 'Minimal glare detected. Capture conditions appear adequate for visual screening.'
        : avgScore >= 40
          ? 'Moderate glare or specular highlights detected. Results from other categories may be less reliable. ' +
            'Consider recapturing with diffused or repositioned lighting.'
          : 'Significant glare detected. Visual analysis results are unreliable for this capture. ' +
            'Retake captures with softer, more even lighting and a matte background.',
    method:
      'Specular highlight detection: pixels with brightness >0.92 and saturation <0.08 flagged as glare. ' +
      'Glare score = 100 − (glareFraction × 500). Score <40 → flag.',
  };
}

// ----------------------------------------------------------------
// POWDER APPEARANCE (powder/pre-mix mode only)
// Analyzes white-background capture for lyophilized powder color.
// White/off-white: pass. Yellow/amber tint: oxidation flag.
// ----------------------------------------------------------------
async function scorePowderAppearance(captures: MediaCapture[]): Promise<CategoryScore> {
  const category: CategoryKey = 'clarity'; // reuses clarity slot in results display
  const label = 'Powder Appearance';

  const whiteCapture = captures.find((c) => c.background === 'white');

  if (!whiteCapture) {
    return {
      category, label, score: 0, status: 'unable',
      explanation: 'No capture available for powder appearance assessment.',
      method: 'Requires white background capture.',
    };
  }

  try {
    const img = await loadImage(whiteCapture.dataUrl);
    const { ctx, width, height } = drawToCanvas(img, 512);
    const imageData = ctx.getImageData(0, 0, width, height);

    const color = computeColorProfile(imageData);
    const stats = computePixelStats(imageData);

    // Yellow/amber tinting in lyophilized powder → possible degradation or oxidation.
    const amberPenalty = color.amberDominant ? 22 : 0;

    // Abnormally dark overall image (mean brightness < 170) may indicate
    // discoloured or contaminated powder. Shadows can also cause this — flag conservatively.
    const darkPowderPenalty = stats.meanBrightness < 170 ? 12 : 0;

    const score = Math.max(0, Math.min(100, 82 - amberPenalty - darkPowderPenalty));
    const status = scoreToStatus(score);

    const amberNote = color.amberDominant
      ? ' Yellow or amber tinting detected. Freshly lyophilized peptides are typically white to off-white; yellow/amber coloration may indicate degradation, oxidation, or impurity. Verify against supplier certificate of analysis.'
      : '';
    const darkNote = darkPowderPenalty > 0
      ? ' Image is darker than expected — check for shadows across the vial body and review the powder color carefully.'
      : '';

    return {
      category, label, score, status,
      explanation:
        score >= 70
          ? `Powder appears consistent with expected white to off-white lyophilized appearance.${amberNote}${darkNote}`
          : score >= 40
          ? `Powder appearance may be abnormal. Visual review recommended.${amberNote}${darkNote}`
          : `Significant powder color anomaly detected. Verify before reconstitution.${amberNote}${darkNote}`,
      method: `Powder mode: color profile + brightness (mean=${Math.round(stats.meanBrightness)}). Amber penalty=${amberPenalty}, dark penalty=${darkPowderPenalty}.`,
    };
  } catch {
    return {
      category, label, score: 40, status: 'review',
      explanation: 'Powder appearance analysis encountered an error.',
      method: 'Analysis failed.',
    };
  }
}

// ----------------------------------------------------------------
// POWDER MODE ANALYSIS ENGINE
// Runs only the scorers relevant to lyophilized/pre-mix vials.
// Skips: turbidity/clarity, visible particles, fill level.
// ----------------------------------------------------------------
async function runPowderAnalysis(
  captures: MediaCapture[],
  expectedPeptideName?: string,
  onProgress?: (phase: string) => void,
): Promise<AnalysisResult> {
  onProgress?.('Analyzing powder appearance…');

  const [
    captureQualityScore,
    powderScore,
    capScore,
    ocrScore,
    crackScore,
    glareScore,
  ] = await Promise.all([
    scoreCaptureQuality(captures),
    scorePowderAppearance(captures),
    scoreCapIntegrity(captures),
    scoreLabelOcr(captures, expectedPeptideName, onProgress),
    scoreCrackDamage(captures),
    scoreGlareInterference(captures),
  ]);

  const categories: CategoryScore[] = [
    captureQualityScore,
    powderScore,
    capScore,
    ocrScore,
    crackScore,
    glareScore,
  ];

  const qualityMultiplier = captureQualityScore.score < 40 ? 0.6
    : captureQualityScore.score < 60 ? 0.8 : 1.0;
  const glareMultiplier = glareScore.score < 40 ? 0.7
    : glareScore.score < 60 ? 0.85 : 1.0;

  const scoreable = categories.filter((c) => c.status !== 'unable');
  const avgScore = scoreable.length > 0
    ? scoreable.reduce((sum, c) => sum + c.score, 0) / scoreable.length
    : 50;

  const overallConfidence = Math.round(avgScore * qualityMultiplier * glareMultiplier);
  const qualityDegraded = captureQualityScore.score < 50 || glareScore.score < 40;

  const flaggedCategories = categories.filter((c) => c.status === 'flag');
  const reviewCategories = categories.filter((c) => c.status === 'review');

  let ocrText: string | null = null;
  if (ocrScore.status !== 'unable') {
    const match = ocrScore.explanation.match(/Extracted: "([^"]+)"/);
    if (match) ocrText = match[1];
  }

  let triageResult: TriageResult;
  const primaryReasons: string[] = [];

  if (flaggedCategories.length >= 2) {
    triageResult = 'do-not-use';
    primaryReasons.push(
      `${flaggedCategories.length} category(ies) flagged: ` +
      flaggedCategories.map((c) => c.label).join(', '),
    );
  } else if (flaggedCategories.length === 1) {
    triageResult = 'review';
    primaryReasons.push(`Flagged: ${flaggedCategories[0].label} — ${flaggedCategories[0].explanation}`);
  } else if (reviewCategories.length >= 3 || qualityDegraded) {
    triageResult = 'review';
    primaryReasons.push(
      reviewCategories.length >= 3
        ? `${reviewCategories.length} categories require review: ` +
          reviewCategories.map((c) => c.label).join(', ')
        : 'Capture quality is insufficient for reliable screening. Retake with better lighting and focus.',
    );
  } else if (reviewCategories.length > 0) {
    triageResult = 'review';
    primaryReasons.push(
      `${reviewCategories.length} category(ies) uncertain: ` +
      reviewCategories.map((c) => c.label).join(', '),
    );
  } else {
    triageResult = 'pass';
    primaryReasons.push(
      'No obvious visual anomalies detected in the lyophilized powder. ' +
      'Verify appearance matches your supplier certificate of analysis. ' +
      'A pass does not confirm purity, identity, or potency.',
    );
  }

  if (overallConfidence < 50) {
    primaryReasons.push(
      'Overall screening confidence is low due to capture quality. Consider retaking.',
    );
  }

  return {
    triageResult,
    overallConfidence,
    categories,
    primaryReasons,
    qualityDegraded,
    ocrText,
    profileUsed: null,
  };
}

// ----------------------------------------------------------------
// MAIN ENGINE: Run all scorers and derive overall result
// ----------------------------------------------------------------
export async function runAnalysis(
  captures: MediaCapture[],
  expectedPeptideName?: string,
  onProgress?: (phase: string) => void,
  profile?: AppearanceProfile | null,
  scanMode?: ScanMode | null,
): Promise<AnalysisResult> {
  // Route to powder-specific analysis for lyophilized pre-mix vials
  if (scanMode === 'powder') {
    return runPowderAnalysis(captures, expectedPeptideName, onProgress);
  }

  onProgress?.('Analyzing capture quality…');

  const resolvedProfile = profile ?? null;

  // Run all category scorers in parallel for speed.
  // OCR may take significantly longer than the others on first run.
  const [
    captureQualityScore,
    clarityScore,
    particleScore,
    fillScore,
    capScore,
    ocrScore,
    crackScore,
    glareScore,
  ] = await Promise.all([
    scoreCaptureQuality(captures),
    scoreClarityHaze(captures, resolvedProfile),   // profile-aware
    scoreVisibleParticles(captures),
    scoreFillLevel(captures),
    scoreCapIntegrity(captures),
    scoreLabelOcr(captures, expectedPeptideName, onProgress),
    scoreCrackDamage(captures),
    scoreGlareInterference(captures),
  ]);

  const categories: CategoryScore[] = [
    captureQualityScore,
    clarityScore,
    particleScore,
    fillScore,
    capScore,
    ocrScore,
    crackScore,
    glareScore,
  ];

  // ---- Derive overall confidence ----
  // Quality degradation lowers confidence globally
  const qualityMultiplier = captureQualityScore.score < 40 ? 0.6 :
    captureQualityScore.score < 60 ? 0.8 : 1.0;

  const glareMultiplier = glareScore.score < 40 ? 0.7 :
    glareScore.score < 60 ? 0.85 : 1.0;

  // Scoreable categories (exclude 'unable')
  const scoreable = categories.filter((c) => c.status !== 'unable');
  const avgScore = scoreable.length > 0
    ? scoreable.reduce((sum, c) => sum + c.score, 0) / scoreable.length
    : 50;

  const overallConfidence = Math.round(avgScore * qualityMultiplier * glareMultiplier);

  // ---- Derive triage result ----
  const flaggedCategories = categories.filter((c) => c.status === 'flag');
  const reviewCategories = categories.filter((c) => c.status === 'review');

  // OCR extracted text (from category method log)
  let ocrText: string | null = null;
  if (ocrScore.status !== 'unable') {
    const match = ocrScore.explanation.match(/Extracted: "([^"]+)"/);
    if (match) ocrText = match[1];
  }

  let triageResult: TriageResult;
  const primaryReasons: string[] = [];
  const qualityDegraded = captureQualityScore.score < 50 || glareScore.score < 40;

  if (flaggedCategories.length >= 2) {
    triageResult = 'do-not-use';
    primaryReasons.push(
      `${flaggedCategories.length} category(ies) flagged: ` +
      flaggedCategories.map((c) => c.label).join(', '),
    );
  } else if (flaggedCategories.length === 1) {
    // Single flag → review (bias toward caution)
    triageResult = 'review';
    primaryReasons.push(`Flagged: ${flaggedCategories[0].label} — ${flaggedCategories[0].explanation}`);
  } else if (reviewCategories.length >= 3) {
    triageResult = 'review';
    primaryReasons.push(
      `${reviewCategories.length} categories require review: ` +
      reviewCategories.map((c) => c.label).join(', '),
    );
  } else if (qualityDegraded) {
    // Poor capture → never pass; force review
    triageResult = 'review';
    primaryReasons.push(
      'Capture quality is insufficient for reliable screening. ' +
      'Results may be unreliable — retake with better lighting and focus.',
    );
  } else if (reviewCategories.length > 0) {
    triageResult = 'review';
    primaryReasons.push(
      `${reviewCategories.length} category(ies) uncertain: ` +
      reviewCategories.map((c) => c.label).join(', '),
    );
  } else {
    triageResult = 'pass';
    primaryReasons.push(
      'No obvious visual issues detected under these capture conditions. ' +
      'A pass does not confirm safety, identity, purity, or potency.',
    );
  }

  // ---- Profile-specific adjustments to triage and primary reasons ----

  if (resolvedProfile === 'ghk-cu' && clarityScore.status === 'pass') {
    // Confirm that blue coloration was treated as expected — adds useful context
    if (clarityScore.explanation.includes('consistent with') && clarityScore.explanation.includes('Blue')) {
      primaryReasons.push(
        'Blue coloration detected and treated as expected based on GHK-Cu / Blue Peptide profile selection. ' +
        'Turbidity and particle screening completed.',
      );
    }
  }

  if (resolvedProfile === 'unknown-custom' && triageResult === 'pass' && overallConfidence < 78) {
    // Conservative downgrade: uncertain pass with unknown profile → review
    triageResult = 'review';
    primaryReasons.push(
      'Unknown/Custom Appearance profile selected — result is conservative. ' +
      'Uncertain findings default to Review when the appearance profile is not specified.',
    );
  }

  // Additional safety note for low confidence
  if (overallConfidence < 50) {
    primaryReasons.push(
      'Overall screening confidence is low due to capture quality. ' +
      'Consider retaking for a more reliable assessment.',
    );
  }

  return {
    triageResult,
    overallConfidence,
    categories,
    primaryReasons,
    qualityDegraded,
    ocrText,
    profileUsed: resolvedProfile,
  };
}
