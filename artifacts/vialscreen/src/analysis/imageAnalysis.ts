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

  // Simple connected-components approach: scan for candidate pixels,
  // ignore pixels adjacent to borders (frame artifacts).
  const margin = Math.floor(Math.min(width, height) * 0.05);
  const visited = new Uint8Array(width * height);

  for (let y = margin; y < height - margin; y++) {
    for (let x = margin; x < width - margin; x++) {
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
// Fill Level Estimation
//
// Method: on a clear vial, there's often a visible meniscus line
// that creates a horizontal contrast edge. We look for a strong
// horizontal edge in the central column band.
// This is extremely approximate and will fail on opaque vials.
// ----------------------------------------------------------------
export function estimateFillLevel(
  imageData: ImageData,
): { fillFraction: number | null; confidence: 'high' | 'medium' | 'low' | 'unable' } {
  const { data, width, height } = imageData;

  // Focus on central 40% of width
  const xStart = Math.floor(width * 0.3);
  const xEnd = Math.floor(width * 0.7);
  const colWidth = xEnd - xStart;

  if (colWidth < 10) return { fillFraction: null, confidence: 'unable' };

  // Build column-averaged brightness profile (top to bottom)
  const profile = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = xStart; x < xEnd; x++) {
      const idx = (y * width + x) * 4;
      sum += 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    }
    profile[y] = sum / colWidth;
  }

  // Find strongest vertical gradient (meniscus line candidate)
  let maxGrad = 0;
  let meniscusY = -1;
  for (let y = 2; y < height - 2; y++) {
    const grad = Math.abs(profile[y + 1] - profile[y - 1]);
    if (grad > maxGrad) {
      maxGrad = grad;
      meniscusY = y;
    }
  }

  if (maxGrad < 15 || meniscusY < 0) {
    return { fillFraction: null, confidence: 'unable' };
  }

  const fillFraction = 1 - meniscusY / height;
  const confidence = maxGrad > 40 ? 'medium' : 'low';

  return { fillFraction, confidence };
}
