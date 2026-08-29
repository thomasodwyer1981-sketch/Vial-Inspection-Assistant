/**
 * VialScreen — Canvas-Based Image Analysis Utilities
 *
 * All analysis runs entirely in the browser using the Canvas 2D API.
 * No server-side processing. No AI inference.
 * Results are heuristic estimates only.
 */

export interface PixelStats {
  meanR: number;
  meanG: number;
  meanB: number;
  meanBrightness: number;
  stdDevBrightness: number;
  minBrightness: number;
  maxBrightness: number;
  /** Fraction of pixels considered "overexposed" (brightness > 245) */
  overexposedFraction: number;
  /** Fraction of pixels considered "underexposed" (brightness < 10) */
  underexposedFraction: number;
}

export interface BlurMetrics {
  /**
   * Laplacian variance — proxy for focus/sharpness.
   * Higher = sharper. Values below ~100 suggest blur.
   */
  laplacianVariance: number;
  /** 0–100 sharpness score derived from laplacianVariance */
  sharpnessScore: number;
}

export interface ParticleAnalysis {
  /**
   * Count of candidate bright/dark specks relative to local background.
   */
  suspiciousSpeckCount: number;
  /**
   * 0–100 risk score. Higher = more suspicious.
   */
  particleRiskScore: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface GlareAnalysis {
  /**
   * Fraction of pixels that are likely specular highlights.
   */
  glareFraction: number;
  /** 0–100. Higher = less glare interference. */
  glareScore: number;
}

export interface FramingAnalysis {
  /** True when the vial-like foreground is centered, complete, and large enough to inspect. */
  usable: boolean;
  /** Plain-language reason for a failed framing check. */
  reason: string | null;
}

/**
 * Color profile of the image — used for profile-aware clarity scoring.
 * Helps distinguish expected tints (e.g. GHK-Cu blue) from haze or discoloration.
 */
export interface ColorProfile {
  /** Whether blue channel significantly dominates over red (GHK-Cu type blue) */
  blueDominant: boolean;
  /** Whether amber/yellow dominates (R+G >> B) */
  amberDominant: boolean;
  /** Mean red channel value 0–255 */
  meanR: number;
  /** Mean green channel value 0–255 */
  meanG: number;
  /** Mean blue channel value 0–255 */
  meanB: number;
  /**
   * Blue excess: meanB - meanR.
   * Positive = blue-tinted; negative = warmer toned.
   */
  blueExcess: number;
}

// ----------------------------------------------------------------
// Helper: load an image from a data URL into an HTMLImageElement
// ----------------------------------------------------------------
export async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ----------------------------------------------------------------
// Helper: draw an image to an offscreen canvas and return context
// ----------------------------------------------------------------
export function drawToCanvas(
  img: HTMLImageElement,
  maxDim = 512,
): { ctx: CanvasRenderingContext2D; width: number; height: number } {
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable — cannot analyze image.');
  ctx.drawImage(img, 0, 0, width, height);
  return { ctx, width, height };
}

// ----------------------------------------------------------------
// Pixel Statistics
// ----------------------------------------------------------------
export function computePixelStats(imageData: ImageData): PixelStats {
  const { data, width, height } = imageData;
  const n = width * height;

  let sumR = 0,
    sumG = 0,
    sumB = 0,
    sumBright = 0;
  let minBright = 255,
    maxBright = 0;
  let overexposed = 0,
    underexposed = 0;

  const brightnesses: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    // Perceived brightness (ITU-R BT.601)
    const bright = 0.299 * r + 0.587 * g + 0.114 * b;
    sumR += r;
    sumG += g;
    sumB += b;
    sumBright += bright;
    brightnesses[i] = bright;
    if (bright < minBright) minBright = bright;
    if (bright > maxBright) maxBright = bright;
    if (bright > 245) overexposed++;
    if (bright < 10) underexposed++;
  }

  const meanBrightness = sumBright / n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = brightnesses[i] - meanBrightness;
    variance += d * d;
  }

  return {
    meanR: sumR / n,
    meanG: sumG / n,
    meanB: sumB / n,
    meanBrightness,
    stdDevBrightness: Math.sqrt(variance / n),
    minBrightness: minBright,
    maxBrightness: maxBright,
    overexposedFraction: overexposed / n,
    underexposedFraction: underexposed / n,
  };
}

// ----------------------------------------------------------------
// Color Profile Analysis
//
// Detects dominant tint to support profile-aware clarity scoring.
// Uses mean RGB channel ratios to identify blue-dominant liquids
// (GHK-Cu type) vs clear vs amber-tinted. Heuristic only.
// ----------------------------------------------------------------
export function computeColorProfile(imageData: ImageData): ColorProfile {
  const stats = computePixelStats(imageData);
  const { meanR, meanG, meanB } = stats;

  // Blue dominant: B channel significantly exceeds R, and is substantial in absolute terms.
  // GHK-Cu peptides typically appear visibly blue — this requires meanB > meanR by at least 20 points.
  const blueExcess = meanB - meanR;
  const blueDominant = blueExcess > 20 && meanB > 80;

  // Amber/yellow dominant: R and G together substantially exceed B.
  // Typical of amber glass reflection, yellowed compounds, or serum-like content.
  const amberDominant = (meanR + meanG) / 2 > meanB + 35 && meanR > 90;

  return {
    blueDominant,
    amberDominant,
    meanR,
    meanG,
    meanB,
    blueExcess,
  };
}

// ----------------------------------------------------------------
// Blur Detection via Laplacian Variance
//
// Method: apply a discrete 3×3 Laplacian kernel to the grayscale
// image and compute the variance of the response. Sharp images
// produce high variance; blurry images produce low variance.
// This is a standard no-reference blur metric.
// ----------------------------------------------------------------
export function computeBlurMetrics(imageData: ImageData): BlurMetrics {
  const { data, width, height } = imageData;

  // Convert to grayscale
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // Laplacian kernel: [0,1,0 / 1,-4,1 / 0,1,0]
  const laplacian = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      laplacian[idx] =
        gray[(y - 1) * width + x] +
        gray[(y + 1) * width + x] +
        gray[y * width + (x - 1)] +
        gray[y * width + (x + 1)] -
        4 * gray[idx];
    }
  }

  // Variance of Laplacian response
  const n = (width - 2) * (height - 2);
  let sum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      sum += laplacian[y * width + x];
    }
  }
  const mean = sum / n;
  let varSum = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const d = laplacian[y * width + x] - mean;
      varSum += d * d;
    }
  }
  const laplacianVariance = varSum / n;

  // Empirically calibrated: variance < 50 → very blurry, > 500 → sharp
  const sharpnessScore = Math.min(100, Math.max(0, (laplacianVariance / 500) * 100));

  return { laplacianVariance, sharpnessScore };
}

// ----------------------------------------------------------------
// Glare Detection
// Specular highlights are identified by very high brightness AND
// low saturation (nearly white). This differs from a bright but
// colorful region.
// ----------------------------------------------------------------
export function computeGlareAnalysis(imageData: ImageData): GlareAnalysis {
  const { data, width, height } = imageData;
  const n = width * height;
  let glarePixels = 0;

  for (let i = 0; i < n; i++) {
    const r = data[i * 4] / 255;
    const g = data[i * 4 + 1] / 255;
    const b = data[i * 4 + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const brightness = max;
    // Specular: very bright + very low saturation
    if (brightness > 0.92 && saturation < 0.08) glarePixels++;
  }

  const glareFraction = glarePixels / n;
  // Score: 0% glare → 100, 20%+ glare → 0
  const glareScore = Math.max(0, 100 - glareFraction * 500);

  return { glareFraction, glareScore };
}

// ----------------------------------------------------------------
// Framing / background check
//
// Uses the same background-aware foreground assumptions as ROI estimation:
// a vial should contrast with the outer background ring, be near the center,
// occupy a meaningful part of the frame, and not be clipped by its edges.
// This is deliberately conservative; it catches unusable compositions rather
// than attempting to identify the vial with a trained model.
// ----------------------------------------------------------------
export function computeFramingAnalysis(
  imageData: ImageData,
  background: 'black' | 'white',
): FramingAnalysis {
  const { data, width, height } = imageData;
  const ring = Math.max(4, Math.floor(Math.min(width, height) * 0.1));
  let ringSum = 0;
  let ringCount = 0;

  const brightnessAt = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x < ring || x >= width - ring || y < ring || y >= height - ring) {
        ringSum += brightnessAt(x, y);
        ringCount++;
      }
    }
  }

  const backdrop = ringCount > 0 ? ringSum / ringCount : background === 'black' ? 0 : 255;
  const isForeground = background === 'black'
    ? (value: number) => value > Math.max(28, backdrop + 24)
    : (value: number) => value < Math.min(205, backdrop - 35);

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let count = 0;
  for (let y = ring; y < height - ring; y++) {
    for (let x = ring; x < width - ring; x++) {
      if (!isForeground(brightnessAt(x, y))) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      count++;
    }
  }

  if (count < width * height * 0.003 || maxX < minX || maxY < minY) {
    return {
      usable: false,
      reason: 'The vial body could not be separated from the background.',
    };
  }

  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const centerX = (minX + maxX) / 2 / width;
  const centerY = (minY + maxY) / 2 / height;
  const edgeMargin = Math.min(minX, minY, width - 1 - maxX, height - 1 - maxY);

  if (boxWidth > width * 0.9 || boxHeight > height * 0.9) {
    return {
      usable: false,
      reason: 'The background is not distinct enough around the vial.',
    };
  }
  if (edgeMargin < Math.min(width, height) * 0.025) {
    return {
      usable: false,
      reason: 'The vial appears cut off at the edge of the frame.',
    };
  }
  if (boxHeight < height * 0.28 || boxWidth < width * 0.08) {
    return {
      usable: false,
      reason: 'The vial is too small in the frame to inspect reliably.',
    };
  }
  if (Math.abs(centerX - 0.5) > 0.24 || Math.abs(centerY - 0.5) > 0.27) {
    return {
      usable: false,
      reason: 'The vial is too far from the center of the frame.',
    };
  }

  return { usable: true, reason: null };
}

// ----------------------------------------------------------------
// Visible Particle Suspicion (black background best)
//
// Method: on a black background, particles appear as bright specks.
// We look for small, isolated bright regions that exceed a local
// background threshold. On a white background, dark specks are
// candidates but harder to distinguish from vial contents.
//
// This is a heuristic approximation only. Results should always
// be treated as "suspicion" not confirmation.
// ----------------------------------------------------------------
export function computeParticleAnalysis(
  imageData: ImageData,
  background: 'black' | 'white',
  roi?: VialROI,
): ParticleAnalysis {
  const { data, width, height } = imageData;

  // Downsample to grayscale 8-bit
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = Math.round(
      0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2],
    );
  }

  // On black background: look for bright specks (particles/flakes often
  // appear bright against black).
  // On white background: look for dark specks.
  let suspiciousSpeckCount = 0;
  const threshold = background === 'black' ? 180 : 80;
  const comparator = background === 'black' ? (v: number) => v > threshold : (v: number) => v < threshold;

  // Simple connected-components approach: scan for candidate pixels.
  // When an ROI is provided, focus on that region only (vial body) to
  // eliminate false positives from background edges, label text, and
  // objects outside the vial frame.
  const margin = Math.floor(Math.min(width, height) * 0.05);
  const scanX0 = roi ? Math.max(margin, roi.x) : margin;
  const scanY0 = roi ? Math.max(margin, roi.y) : margin;
  const scanX1 = roi ? Math.min(width - margin, roi.x + roi.width) : width - margin;
  const scanY1 = roi ? Math.min(height - margin, roi.y + roi.height) : height - margin;

  const visited = new Uint8Array(width * height);

  for (let y = scanY0; y < scanY1; y++) {
    for (let x = scanX0; x < scanX1; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;
      if (!comparator(gray[idx])) continue;

      // BFS flood fill to measure region size
      const queue: number[] = [idx];
      visited[idx] = 1;
      let size = 0;

      while (queue.length > 0) {
        const cur = queue.pop()!;
        size++;
        const cy = Math.floor(cur / width);
        const cx = cur % width;
        for (const [dy, dx] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const ny = cy + dy;
          const nx = cx + dx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
          const nidx = ny * width + nx;
          if (visited[nidx]) continue;
          if (!comparator(gray[nidx])) continue;
          visited[nidx] = 1;
          queue.push(nidx);
        }
      }

      // Suspicious: small isolated region (particle-like), not huge blob (vial body)
      const minSpeckSize = 2;
      const maxSpeckSize = Math.max(10, width * height * 0.0005); // < 0.05% of image
      if (size >= minSpeckSize && size <= maxSpeckSize) {
        suspiciousSpeckCount++;
      }
    }
  }

  // Scoring: 0 specks → 0 risk; ≥10 specks → 80 risk; ≥30 → 100 risk
  const particleRiskScore = Math.min(100, suspiciousSpeckCount * 3.5);
  const confidence: ParticleAnalysis['confidence'] =
    suspiciousSpeckCount > 20 ? 'high' : suspiciousSpeckCount > 5 ? 'medium' : 'low';

  return { suspiciousSpeckCount, particleRiskScore, confidence };
}

// ----------------------------------------------------------------
// Vial Region-of-Interest Estimation
//
// On a black background, the vial appears as a brighter vertical column
// (glass refraction, cap, meniscus) surrounded by near-black. We use
// this to find the actual vial body bounds so downstream analysis can
// focus there rather than polluting stats with background pixels.
//
// Without ROI isolation, a clear vial surrounded by pure white background
// will score as "very clear" even if the liquid is turbid, because the
// background pixels dominate the brightness average.
// ----------------------------------------------------------------

export interface VialROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Estimate the bounding box of the vial body in a capture.
 *
 * `background` selects the detection mode:
 * - 'black': the vial appears BRIGHTER (glass refraction, cap, liquid
 *   scatter) than the near-black backdrop → bound bright pixels.
 * - 'white': the vial appears DARKER (dark cap, glass-wall edges, tinted
 *   liquid) than the near-white backdrop → bound dark pixels.
 *
 * The threshold adapts to the actual backdrop brightness, sampled from the
 * outer frame ring where the backdrop should dominate.
 *
 * Falls back to a central 55%×65% region if detection fails.
 */
export function estimateVialROI(
  imageData: ImageData,
  background: 'black' | 'white' = 'black',
): VialROI {
  const { data, width, height } = imageData;
  const edgeMargin = Math.floor(Math.min(width, height) * 0.05);

  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }

  // Sample backdrop brightness from the outer 10% frame ring (the vial is
  // centered by the framing guide, so the ring is mostly backdrop).
  const ring = Math.max(4, Math.floor(Math.min(width, height) * 0.1));
  let ringSum = 0;
  let ringCount = 0;
  for (let y = 0; y < height; y++) {
    if (y < ring || y >= height - ring) {
      for (let x = 0; x < width; x++) { ringSum += gray[y * width + x]; ringCount++; }
    } else {
      for (let x = 0; x < ring; x++) { ringSum += gray[y * width + x]; ringCount++; }
      for (let x = width - ring; x < width; x++) { ringSum += gray[y * width + x]; ringCount++; }
    }
  }
  const backdrop = ringCount > 0 ? ringSum / ringCount : background === 'black' ? 0 : 255;

  const fallbackROI = (): VialROI => {
    const fbW = Math.round(width * 0.55);
    const fbH = Math.round(height * 0.65);
    return {
      x: Math.round((width - fbW) / 2),
      y: Math.round(height * 0.1),
      width: fbW,
      height: fbH,
    };
  };

  // A "white" backdrop that is actually dim makes dark-pixel detection
  // unreliable — use the central-region fallback rather than guessing.
  if (background === 'white' && backdrop < 120) return fallbackROI();

  const isVialPixel =
    background === 'black'
      ? (v: number) => v > Math.max(28, backdrop + 24)
      : (v: number) => v < Math.min(205, backdrop - 35);

  let minX = width, maxX = 0, minY = height, maxY = 0;
  let foundPixels = 0;

  for (let y = edgeMargin; y < height - edgeMargin; y++) {
    for (let x = edgeMargin; x < width - edgeMargin; x++) {
      if (isVialPixel(gray[y * width + x])) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        foundPixels++;
      }
    }
  }

  const roiW = maxX - minX;
  const roiH = maxY - minY;

  // Detection failed (too few pixels / degenerate box) or failed to
  // discriminate (box covers nearly the whole frame) → fallback.
  const frameArea = (width - 2 * edgeMargin) * (height - 2 * edgeMargin);
  if (
    foundPixels < 200 ||
    roiW < 20 ||
    roiH < 40 ||
    maxX <= minX ||
    maxY <= minY ||
    roiW * roiH > frameArea * 0.92
  ) {
    return fallbackROI();
  }

  // Inset from detected edges to avoid the bright curved-glass-wall refraction bands
  const insetX = Math.max(2, Math.round(roiW * 0.1));
  const insetY = Math.max(2, Math.round(roiH * 0.04));

  return {
    x: Math.min(width - 1, minX + insetX),
    y: Math.min(height - 1, minY + insetY),
    width: Math.max(10, roiW - insetX * 2),
    height: Math.max(10, roiH - insetY * 2),
  };
}

/** Extract mean perceived brightness of pixels within the given ROI. */
function roiMeanBrightness(imageData: ImageData, roi: VialROI): number {
  const { data, width, height } = imageData;
  let sum = 0;
  let count = 0;
  const x2 = Math.min(roi.x + roi.width, width);
  const y2 = Math.min(roi.y + roi.height, height);
  for (let y = roi.y; y < y2; y++) {
    for (let x = roi.x; x < x2; x++) {
      const idx = (y * width + x) * 4;
      sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      count++;
    }
  }
  return count > 0 ? sum / count : 128;
}

// ----------------------------------------------------------------
// Differential Turbidity Analysis
//
// The core principle: a CLEAR solution is nearly transparent.
// Against a white background it appears very bright (high transmittance);
// against a black background it appears very dark (little scattering).
// The DIFFERENCE between the two is therefore high for clear solutions.
//
// A TURBID/HAZY solution scatters light in all directions.
// It appears moderately bright on BOTH backgrounds.
// The difference between the two is therefore LOW.
//
// This mirrors the principle of nephelometry / transmittance measurement,
// adapted for phone-camera captures.
//
// Expected brightness delta (whiteMean − blackMean) in vial body ROI:
//   Very clear:   ~180–210  → score 90–100
//   Clear:        ~140–180  → score 70–90
//   Slight haze:  ~90–140   → score 45–70
//   Hazy:         ~50–90    → score 15–45
//   Opaque/turbid: <50      → score 0–15
// ----------------------------------------------------------------

export interface DifferentialTurbidity {
  /** Mean brightness in vial ROI on white-background capture. Clear ≈ 220+, turbid ≈ 150-180. */
  whiteMeanBrightness: number;
  /** Mean brightness in vial ROI on black-background capture. Clear ≈ 5-25, turbid ≈ 60-110. */
  blackMeanBrightness: number;
  /**
   * whiteMean − blackMean. The primary turbidity signal.
   * High delta (≥160) = optically clear. Low delta (≤60) = turbid.
   */
  brightnessDelta: number;
  /** 0–100 clarity score derived from the brightness delta. */
  differentialClarityScore: number;
  /**
   * Whether sediment-like brightness patterns were found in the bottom
   * portion of the vial body — suggesting incomplete dissolution or precipitation.
   */
  sedimentSuspected: boolean;
  /** The ROI used for this analysis (from estimateVialROI on the black-bg image). */
  roi: VialROI;
}

/**
 * Compute differential turbidity by comparing vial body brightness across
 * the white-background and black-background captures.
 *
 * This is the most physically meaningful turbidity signal available from
 * two-background phone captures. Always prefer this over single-image
 * brightness std dev when both captures are available.
 */
export function computeDifferentialTurbidity(
  whiteImageData: ImageData,
  blackImageData: ImageData,
): DifferentialTurbidity {
  const roi = estimateVialROI(blackImageData, 'black');
  // The two captures are separate photos — the phone almost always moves
  // between shots, so estimate the white-capture ROI independently instead
  // of assuming the vial sits at the same pixel coordinates.
  const whiteRoi = estimateVialROI(whiteImageData, 'white');

  const whiteMean = roiMeanBrightness(whiteImageData, whiteRoi);
  const blackMean = roiMeanBrightness(blackImageData, roi);
  const delta = whiteMean - blackMean;

  // Linear score: delta=25 → 0, delta=180 → 100
  const differentialClarityScore = Math.round(
    Math.min(100, Math.max(0, (delta - 25) * (100 / 155))),
  );

  // ── Sediment / precipitation check ──────────────────────────
  // Compare body zone vs bottom zone within the ROI.
  // On black bg: clear body ≈ near-black. Precipitate = BRIGHTER than body.
  // On white bg: clear body ≈ near-white. Precipitate = DARKER than body.
  let sedimentSuspected = false;

  if (roi.height > 40 && whiteRoi.height > 40) {
    const zoneVal = (imageData: ImageData, zroi: VialROI, yFrac0: number, yFrac1: number): number => {
      const { data, width } = imageData;
      const y1 = zroi.y + Math.round(zroi.height * yFrac0);
      const y2 = Math.min(zroi.y + Math.round(zroi.height * yFrac1), imageData.height);
      const x2 = Math.min(zroi.x + zroi.width, width);
      let sum = 0;
      let count = 0;
      for (let y = y1; y < y2; y++) {
        for (let x = zroi.x; x < x2; x++) {
          const idx = (y * width + x) * 4;
          sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          count++;
        }
      }
      return count > 0 ? sum / count : -1;
    };

    const bkBody = zoneVal(blackImageData, roi, 0.1, 0.7);
    const bkBottom = zoneVal(blackImageData, roi, 0.76, 0.97);
    const whBody = zoneVal(whiteImageData, whiteRoi, 0.1, 0.7);
    const whBottom = zoneVal(whiteImageData, whiteRoi, 0.76, 0.97);

    // Precipitate on black bg appears as bright spots at bottom
    const sedimentOnBlack = bkBody >= 0 && bkBottom >= 0 && (bkBottom - bkBody) > 22;
    // Opaque sediment on white bg blocks light → bottom darker than body
    const sedimentOnWhite = whBody >= 0 && whBottom >= 0 && (whBody - whBottom) > 20;

    sedimentSuspected = sedimentOnBlack || sedimentOnWhite;
  }

  return {
    whiteMeanBrightness: whiteMean,
    blackMeanBrightness: blackMean,
    brightnessDelta: delta,
    differentialClarityScore,
    sedimentSuspected,
    roi,
  };
}

// ----------------------------------------------------------------
// Fill Level Estimation
//
// Method: on a clear vial, there's often a visible meniscus line
// that creates a horizontal contrast edge. We look for a strong
// horizontal edge in the central column band.
// This is extremely approximate and will fail on opaque vials.
// ----------------------------------------------------------------
export function estimateFillLevel(
  imageData: ImageData,
  roi?: VialROI,
): { fillFraction: number | null; confidence: 'high' | 'medium' | 'low' | 'unable' } {
  const { data, width, height } = imageData;

  // Constrain the search to the vial body when an ROI is available.
  // The top ~18% of the ROI is skipped — the cap/crimp edge produces a
  // strong horizontal gradient that would otherwise win over the meniscus.
  const rx0 = roi ? Math.max(0, roi.x) : 0;
  const rx1 = roi ? Math.min(roi.x + roi.width, width) : width;
  const ry0 = roi ? Math.min(height, roi.y + Math.round(roi.height * 0.18)) : 0;
  const ry1 = roi ? Math.min(roi.y + roi.height, height) : height;

  const spanW = rx1 - rx0;
  const spanH = ry1 - ry0;

  // Focus on central 40% of the search band width
  const xStart = Math.floor(rx0 + spanW * 0.3);
  const xEnd = Math.floor(rx0 + spanW * 0.7);
  const colWidth = xEnd - xStart;

  if (colWidth < 10 || spanH < 20) return { fillFraction: null, confidence: 'unable' };

  // Build column-averaged brightness profile (top to bottom of search band)
  const profile = new Float32Array(spanH);
  for (let y = 0; y < spanH; y++) {
    let sum = 0;
    for (let x = xStart; x < xEnd; x++) {
      const idx = ((ry0 + y) * width + x) * 4;
      sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
    profile[y] = sum / colWidth;
  }

  // Find strongest vertical gradient (meniscus line candidate)
  let maxGrad = 0;
  let meniscusY = -1;
  for (let y = 2; y < spanH - 2; y++) {
    const grad = Math.abs(profile[y + 1] - profile[y - 1]);
    if (grad > maxGrad) {
      maxGrad = grad;
      meniscusY = y;
    }
  }

  if (maxGrad < 15 || meniscusY < 0) {
    return { fillFraction: null, confidence: 'unable' };
  }

  // Fill fraction relative to the searched vial-body band
  const fillFraction = Math.max(0, Math.min(1, 1 - meniscusY / spanH));
  const confidence = maxGrad > 40 ? 'medium' : 'low';

  return { fillFraction, confidence };
}
