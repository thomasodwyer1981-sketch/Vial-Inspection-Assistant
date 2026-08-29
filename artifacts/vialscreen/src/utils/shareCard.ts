/**
 * PepScan — Share Card Generator
 *
 * Draws a 1080×1080 PNG on an offscreen canvas and returns it as a Blob.
 * Designed to look great on Instagram, Twitter/X, WhatsApp, and other
 * image-sharing platforms.
 *
 * Sharing strategy:
 *  1. Capacitor native (Android/iOS) — write to cache dir + native share sheet
 *  2. Web Share API with files (Android Chrome, iOS Safari 15.1+)
 *  3. Fallback → download the PNG to device
 */

import QRCode from 'qrcode';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface PepScanPhotosPlugin {
  saveImageToPhotos(options: { data: string; filename: string }): Promise<void>;
}

const PepScanPhotos = registerPlugin<PepScanPhotosPlugin>('PepScanPhotos');

export interface ShareCardInput {
  triageResult: 'pass' | 'review' | 'do-not-use';
  assessmentOutcome?: 'assessed' | 'unable-to-assess';
  overallConfidence: number;
  peptideName?: string | null;
  vendor?: string | null;
  primaryReasons: string[];
}

const VERDICT = {
  pass: {
    label: 'NO VISIBLE ANOMALY DETECTED',
    icon: '✓',
    color: '#22c55e',
    summary: 'No visible anomaly detected in these photos',
  },
  review: {
    label: 'MANUAL INSPECTION RECOMMENDED',
    icon: '!',
    color: '#f59e0b',
    summary: 'One or more visual factors need a closer check',
  },
  'do-not-use': {
    label: 'VISIBLE ISSUE FLAGGED',
    icon: '✕',
    color: '#ef4444',
    summary: 'A visible finding needs documenting and resolving',
  },
  'unable-to-assess': {
    label: 'UNABLE TO ASSESS — RETAKE SCAN',
    icon: '!',
    color: '#f59e0b',
    summary: 'Required photos were not reliable enough to screen',
  },
} as const;

const FONT        = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';
const PLAY_URL    = 'https://play.google.com/store/apps/details?id=com.pepscan.app';
const APP_SITE    = 'pepscan.app';
const DISCLAIMER  = 'Visual screening only. Does not confirm safety, purity, identity or potency.';

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexAlpha(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

/** Draw a QR code onto an existing canvas context at (qx, qy) with size px. */
async function drawQr(
  ctx: CanvasRenderingContext2D,
  text: string,
  qx: number, qy: number, size: number,
): Promise<void> {
  const qCanvas = document.createElement('canvas');
  qCanvas.width  = size;
  qCanvas.height = size;
  await QRCode.toCanvas(qCanvas, text, {
    width: size,
    margin: 1,
    color: { dark: '#0E1E35', light: '#ffffff' },
  });
  ctx.drawImage(qCanvas, qx, qy, size, size);
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateShareCard(input: ShareCardInput): Promise<Blob> {
  const S = 1080;
  const P = 80; // padding
  const canvas = document.createElement('canvas');
  canvas.width  = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  const verdictKey = input.assessmentOutcome === 'unable-to-assess'
    ? 'unable-to-assess'
    : input.triageResult;
  const v = VERDICT[verdictKey];

  // Background
  ctx.fillStyle = '#0E1E35';
  ctx.fillRect(0, 0, S, S);

  // Subtle grid texture
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let gridY = 80; gridY < S; gridY += 80) {
    ctx.beginPath(); ctx.moveTo(0, gridY); ctx.lineTo(S, gridY); ctx.stroke();
  }

  // Top accent stripe
  ctx.fillStyle = v.color;
  ctx.fillRect(0, 0, S, 10);

  // ── Branding ──────────────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `bold 58px ${FONT}`;
  ctx.fillText('PepScan', P, 92);

  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.font = `30px ${FONT}`;
  ctx.fillText('Vial Screening Result', P, 136);

  // ── Verdict badge ──────────────────────────────────────────────────────────
  const bX = P, bY = 168, bW = S - P * 2, bH = 200;

  ctx.fillStyle = hexAlpha(v.color, 0.13);
  roundedRect(ctx, bX, bY, bW, bH, 24);
  ctx.fill();

  ctx.strokeStyle = hexAlpha(v.color, 0.42);
  ctx.lineWidth = 2;
  roundedRect(ctx, bX, bY, bW, bH, 24);
  ctx.stroke();

  ctx.fillStyle = v.color;
  const verdictFontSize = v.label.length > 24 ? 40 : 52;
  ctx.font = `bold ${verdictFontSize}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${v.icon}  ${v.label}`, S / 2, bY + 113);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = `34px ${FONT}`;
  ctx.fillText(v.summary, S / 2, bY + 163);
  ctx.textAlign = 'left';

  // ── Vial info ──────────────────────────────────────────────────────────────
  let y = bY + bH + 58;

  const vialName = clip(input.peptideName?.trim() || 'Unnamed Vial', 28);
  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = `bold 54px ${FONT}`;
  ctx.fillText(vialName, P, y);
  y += 52;

  if (input.vendor?.trim()) {
    y += 10;
    ctx.fillStyle = 'rgba(255,255,255,0.46)';
    ctx.font = `32px ${FONT}`;
    ctx.fillText(clip(input.vendor.trim(), 42), P, y);
    y += 38;
  }

  y += 16;
  ctx.fillStyle = 'rgba(255,255,255,0.30)';
  ctx.font = `28px ${FONT}`;
  ctx.fillText(`Confidence: ${input.overallConfidence}%`, P, y);
  y += 18;

  // ── Divider ────────────────────────────────────────────────────────────────
  y += 36;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(S - P, y); ctx.stroke();
  y += 38;

  // ── Findings ───────────────────────────────────────────────────────────────
  // Reserve space at bottom for CTA panel (160px) + disclaimer (48px) + gaps
  const BOTTOM_RESERVED = 230;
  const findingsBottom  = S - BOTTOM_RESERVED;

  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('KEY FINDINGS', P, y);
  y += 46;

  const maxFindW  = S - P * 2 - 44;
  ctx.font = `30px ${FONT}`;

  for (let i = 0; i < input.primaryReasons.length; i++) {
    const lines    = wrapText(ctx, input.primaryReasons[i], maxFindW).slice(0, 2);
    const blockH   = lines.length * 38 + 20;
    if (y + blockH > findingsBottom) break;     // no more room

    ctx.fillStyle = hexAlpha(v.color, 0.8);
    ctx.fillText('•', P, y);

    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    for (let l = 0; l < lines.length; l++) {
      ctx.fillText(lines[l], P + 40, y + l * 38);
    }
    y += blockH;
  }

  // ── Get the app — CTA panel ────────────────────────────────────────────────
  // Dark teal panel sitting above the disclaimer strip.
  const QR_SIZE = 130;         // px on the 1080px canvas
  const panelY  = S - BOTTOM_RESERVED + 10;
  const panelH  = 148;
  const panelW  = S - P * 2;

  ctx.fillStyle = 'rgba(12, 154, 122, 0.15)';
  roundedRect(ctx, P, panelY, panelW, panelH, 16);
  ctx.fill();

  ctx.strokeStyle = 'rgba(12, 154, 122, 0.4)';
  ctx.lineWidth = 1.5;
  roundedRect(ctx, P, panelY, panelW, panelH, 16);
  ctx.stroke();

  // QR code (right side of panel)
  const qrX = P + panelW - QR_SIZE - 16;
  const qrY = panelY + (panelH - QR_SIZE) / 2;
  try {
    // White backing for QR
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(qrX - 6, qrY - 6, QR_SIZE + 12, QR_SIZE + 12, 8);
    ctx.fill();
    await drawQr(ctx, PLAY_URL, qrX, qrY, QR_SIZE);
  } catch {
    // QR failed — just show URL text
  }

  // Text (left side of panel)
  const textX = P + 20;
  const textW = qrX - textX - 20;

  ctx.fillStyle = '#0C9A7A';
  ctx.font = `bold 28px ${FONT}`;
  ctx.fillText('FREE ON ANDROID', textX, panelY + 34);

  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.font = `bold 36px ${FONT}`;
  ctx.fillText('Get PepScan', textX, panelY + 72);

  const ctaLines = wrapText(ctx, 'Visual vial screening on your phone', textW);
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  ctx.font = `26px ${FONT}`;
  for (let l = 0; l < Math.min(ctaLines.length, 2); l++) {
    ctx.fillText(ctaLines[l], textX, panelY + 106 + l * 32);
  }

  // ── Disclaimer + site strip ────────────────────────────────────────────────
  const discY = S - 68;

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(P, discY - 10); ctx.lineTo(S - P, discY - 10); ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.font = `22px ${FONT}`;
  ctx.fillText(DISCLAIMER, P, discY + 6);

  ctx.fillStyle = hexAlpha(v.color, 0.8);
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(APP_SITE, S - P, discY + 6);
  ctx.textAlign = 'left';

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob failed'))),
      'image/png',
    );
  });
}

/** Share the card via native share sheet if available, otherwise download it. */
export async function shareOrDownloadCard(input: ShareCardInput): Promise<void> {
  const blob = await generateShareCard(input);
  const name = `pepscan-${input.assessmentOutcome === 'unable-to-assess' ? 'retake-required' : input.triageResult}.png`;

  // ── Native Capacitor (Android / iOS) ────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: name,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({ title: 'PepScan Screening Result', url: saved.uri });
    return;
  }

  // ── Web fallback ─────────────────────────────────────────────────────────────
  const file = new File([blob], name, { type: 'image/png' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'PepScan Screening Result' });
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Save the generated card directly to the iOS Photos library. */
export async function saveCardToPhotos(input: ShareCardInput): Promise<void> {
  if (Capacitor.getPlatform() !== 'ios') {
    throw new Error('Saving result cards to Photos is only available on iOS.');
  }

  const blob = await generateShareCard(input);
  const name = `pepscan-${input.assessmentOutcome === 'unable-to-assess' ? 'retake-required' : input.triageResult}.png`;
  await PepScanPhotos.saveImageToPhotos({
    data: await blobToBase64(blob),
    filename: name,
  });
}
