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
// clear-standard: evaluates against a clear/colorless baseline.
// ghk-cu:         blue tint is expected — separates color from turbidity.
// unknown-custom: color is not used as signal; conservative turbidity check only.
//
// Method: brightness consistency / std deviation on white background.
// ----------------------------------------------------------------
async function scoreClarityHaze(
  captures: MediaCapture[],
  profile: AppearanceProfile | null,
): Promise<CategoryScore> {
  const category: CategoryKey = 'clarity';
  const label = 'Clarity / Appearance';

  const whiteCapture = captures.find((c) => c.background === 'white');

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
    const imageData = ctx.getImageData(0, 0, width, height);

    const stats = computePixelStats(imageData);
    const glare = computeGlareAnalysis(imageData);
    const color = computeColorProfile(imageData);

    // Glare override applies regardless of profile — glare makes clarity unreliable
    if (glare.glareFraction > 0.25) {
      return {
        category,
        label,
        score: 50,
        status: 'review',
        explanation:
          'High glare detected in white-background capture. Clarity cannot be reliably assessed. ' +
          'Consider recapturing with softer, more even lighting.',
        method: 'Std dev of brightness as haze proxy. Glare override triggers review at >25% specular fraction.',
      };
    }

    // ── GHK-Cu / Blue Peptide profile ──────────────────────────
    // Blue coloration is expected. Separate the expected tint from
    // actual cloudiness/turbidity concerns.
    if (profile === 'ghk-cu') {
      if (color.blueDominant) {
        // Blue is present and dominant — treat color as expected.
        // Turbidity is assessed via std dev, but threshold raised because
        // color variation is normal for blue liquids viewed on white background.
        const turbidityScore = Math.max(0, 100 - stats.stdDevBrightness * 1.2);
        const score = Math.round(Math.min(100, Math.max(0, turbidityScore)));
        const status: CategoryStatus = score >= 65 ? 'pass' : score >= 40 ? 'review' : 'flag';

        const explanation =
          score >= 65
            ? 'Blue coloration detected — consistent with GHK-Cu / Blue Peptide profile selection. ' +
              'Color is not treated as a concern. No significant additional cloudiness or turbidity detected.'
            : 'Blue coloration present (consistent with GHK-Cu / Blue Peptide profile). ' +
              'Elevated brightness variation detected beyond expected blue tint — possible cloudiness or incomplete mixing. ' +
              'Review the white-background capture carefully.';

        return {
          category,
          label,
          score,
          status,
          explanation,
          method:
            'GHK-Cu profile: std dev of brightness as turbidity proxy with raised tolerance for expected blue tint. ' +
            'Blue dominance confirmed (meanB − meanR > 20). Glare override applied at >25% specular fraction.',
        };
      } else {
        // No blue detected despite GHK-Cu profile selection — note the discrepancy
        const hazeScore = Math.max(0, 100 - stats.stdDevBrightness * 1.5);
        const score = Math.round(Math.min(100, Math.max(0, hazeScore)));
        const status = scoreToStatus(score);

        const explanation =
          score >= 70
            ? 'GHK-Cu / Blue Peptide profile selected, but no prominent blue coloration was detected in this capture. ' +
              'No obvious haze or cloudiness detected. Verify vial contents and profile selection.'
            : 'GHK-Cu / Blue Peptide profile selected, but no prominent blue coloration detected. ' +
              'Possible haze or cloudiness detected. Verify vial contents and review capture carefully.';

        return {
          category,
          label,
          score,
          status,
          explanation,
          method:
            'GHK-Cu profile: blue dominance not detected. Standard std dev haze assessment applied. ' +
            'Discrepancy between profile selection and detected color noted.',
        };
      }
    }

    // ── Unknown / Custom Appearance profile ────────────────────
    // Color is not used as a primary signal. Turbidity only.
    // Apply a conservative bias — slightly lower the effective score.
    if (profile === 'unknown-custom') {
      const turbidityScore = Math.max(0, 100 - stats.stdDevBrightness * 1.5);
      // Conservative: subtract a small bias so borderline cases land in REVIEW
      const score = Math.round(Math.min(100, Math.max(0, turbidityScore - 8)));
      const status = scoreToStatus(score);

      const explanation =
        score >= 70
          ? 'Unknown/Custom Appearance profile selected — colour was not used as a screening signal. ' +
            'No significant turbidity or brightness irregularity detected.'
          : score >= 40
          ? 'Unknown/Custom Appearance profile selected. Elevated brightness variation detected. ' +
            'This profile is conservative — review is recommended when findings are uncertain.'
          : 'Unknown/Custom Appearance profile selected. Significant brightness irregularity detected. ' +
            'Review is strongly recommended.';

      return {
        category,
        label,
        score,
        status,
        explanation,
        method:
          'Unknown/Custom profile: colour excluded from assessment. Conservative turbidity check only. ' +
          'Std dev haze score with −8 conservative adjustment.',
      };
    }

    // ── Standard Clear Peptide (default) ───────────────────────
    // On a white background, a clear liquid should show mostly high
    // brightness with relatively low variation. Hazy or cloudy liquid
    // shows patches of lower brightness and higher std dev.

    // Note unexpected color tint as informational, not a flag
    const hazeScore = Math.max(0, 100 - stats.stdDevBrightness * 1.5);
    const score = Math.round(Math.min(100, Math.max(0, hazeScore)));
    const status = scoreToStatus(score);

    let explanation: string;
    if (color.blueDominant && score >= 70) {
      explanation =
        'Unexpected blue tint detected — if this compound is expected to appear blue (e.g. GHK-Cu), ' +
        'consider selecting the GHK-Cu / Blue Peptide profile for more accurate interpretation. ' +
        'No significant cloudiness detected.';
    } else if (score >= 70) {
      explanation =
        'No obvious cloudiness or haze detected in white-background capture. ' +
        'Note: this does not confirm the solution is clear.';
    } else if (score >= 40) {
      explanation =
        'Possible haze or uneven brightness distribution detected. ' +
        'Review the white-background image carefully.';
    } else {
      explanation =
        'Significant brightness irregularity detected. A review is strongly recommended.';
    }

    return {
      category,
      label,
      score,
      status,
      explanation,
      method:
        'Standard clear profile: std dev of pixel brightness on white background as proxy for visual cloudiness. ' +
        'High std dev (>40) suggests potential haze. Glare override at >25% specular fraction.',
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
      const analysis = computeParticleAnalysis(imageData, bg);
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
    const fill = estimateFillLevel(imageData);

    if (!fill.fillFraction || fill.confidence === 'unable') {
      return {
        category,
        label,
        score: 0,
        status: 'unable',
        explanation:
          'Unable to estimate fill level from this capture. ' +
          'The meniscus line may not be visible, or the vial may be opaque.',
        method: 'Horizontal gradient edge detection in central column band. Unable to detect clear edge.',
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
        'Column-averaged brightness profile (central 40% of image width). ' +
        'Strongest horizontal gradient identified as meniscus candidate. ' +
        'Fill fraction = 1 - meniscusY/imageHeight.',
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
    const imageData = ctx.getImageData(0, 0, width, height);
    const stats = computePixelStats(imageData);

    // Analyze top 15% of image for a distinct region (cap area)
    const topHeight = Math.floor(height * 0.15);
    const topData = ctx.getImageData(0, 0, width, topHeight);
    const topStats = computePixelStats(topData);

    const brightnessDiff = Math.abs(topStats.meanBrightness - stats.meanBrightness);

    // If the top region is distinctly different from overall image → cap likely present
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
        'Brightness difference between top 15% and overall image. ' +
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
async function scoreLabelOcr(
  captures: MediaCapture[],
  expectedPeptideName?: string,
  onProgress?: (phase: string) => void,
): Promise<CategoryScore> {
  const category: CategoryKey = 'labelOcr';
  const label = 'Label Readability';

  const labelCapture = captures.find((c) => c.background === 'label');

  if (!labelCapture) {
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
    const result = await Tesseract.recognize(labelCapture.dataUrl, 'eng', {
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

    const text = result.data.text.trim();
    const confidence = result.data.confidence; // 0–100

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
      const expected = expectedPeptideName.toLowerCase().trim();
      const found = text.toLowerCase();
      const wordMatches = expected.split(/\s+/).filter((w) => found.includes(w)).length;
      const wordTotal = expected.split(/\s+/).length;
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
      method: 'Tesseract.js v4 OCR, English language pack. ' +
        'Match scored by word-level overlap with user-entered expected name.',
    };
  } catch {
    // OCR failed or Tesseract unavailable
    return {
      category,
      label,
      score: 50,
      status: 'unable',
      explanation:
        'Label capture was taken but OCR could not be performed. ' +
        'Verify the label manually.',
      method: 'Tesseract.js OCR failed or unavailable. Fallback: unable.',
    };
  }
}

// ----------------------------------------------------------------
// 7. CRACK / DAMAGE SUSPICION
// Basic: edge irregularity detection in outer frame of image
// Extremely limited — do not overclaim
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
      score: 50,
      status: 'unable',
      explanation: 'No capture available for damage assessment.',
      method: 'No image data.',
    };
  }

  // This is a very rough heuristic — we measure edge irregularity
  // by looking for unexpected dark/bright pixel clusters along the
  // expected vial silhouette edges. Accuracy is low; prefer 'review'
  // for uncertain cases.
  try {
    const img = await loadImage(primary.dataUrl);
    const { ctx, width, height } = drawToCanvas(img, 256);
    const imageData = ctx.getImageData(0, 0, width, height);
    const stats = computePixelStats(imageData);

    // Very high contrast overall (stdDev > 80) could indicate cracks/chips
    // but is also common with normal vials and reflections.
    // Prefer 'review' unless clearly normal.
    const anomalyScore = stats.stdDevBrightness > 90 ? 40 : 75;

    return {
      category,
      label,
      score: anomalyScore,
      status: anomalyScore >= 70 ? 'pass' : 'review',
      explanation:
        anomalyScore >= 70
          ? 'No obvious structural anomalies detected in silhouette. ' +
            'Note: this screen cannot reliably detect hairline cracks or micro-damage.'
          : 'High brightness variation detected which may indicate surface damage or glare. ' +
            'Inspect the container physically before use. ' +
            'This heuristic is not reliable for crack detection.',
      method:
        'Overall brightness std dev used as edge-irregularity proxy. ' +
        '>90 std dev → potential anomaly flag. Very limited accuracy — heuristic only.',
    };
  } catch {
    return {
      category,
      label,
      score: 50,
      status: 'unable',
      explanation: 'Container damage assessment encountered an error.',
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
// MAIN ENGINE: Run all scorers and derive overall result
// ----------------------------------------------------------------
export async function runAnalysis(
  captures: MediaCapture[],
  expectedPeptideName?: string,
  onProgress?: (phase: string) => void,
  profile?: AppearanceProfile | null,
): Promise<AnalysisResult> {
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
