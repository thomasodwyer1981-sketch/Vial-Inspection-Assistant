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

import { Capacitor } from '@capacitor/core';
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

export interface ShareCardInput {
  triageResult: 'pass' | 'review' | 'do-not-use';
  overallConfidence: number;
  peptideName?: string | null;
  vendor?: string | null;
  primaryReasons: string[];
}

const VERDICT = {
  pass: {
    label: 'PASS',
    icon: '✓',
    color: '#22c55e',
    summary: 'No obvious visual issues detected',
  },
  review: {
    label: 'REVIEW',
    icon: '!',
    color: '#f59e0b',
    summary: 'Review recommended before use',
  },
  'do-not-use': {
    label: 'DO NOT USE',
    icon: '✕',
    color: '#ef4444',
    summary: 'Visible concerns flagged — investigate',
  },
} as const;

const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

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

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateShareCard(input: ShareCardInput): Promise<Blob> {
  const S = 1080;
  const P = 80; // padding
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  const v = VERDICT[input.triageResult];

  // Background
  ctx.fillStyle = '#0E1E35';
  ctx.fillRect(0, 0, S, S);

  // Very subtle grid lines for texture
  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let y = 80; y < S; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
  }

  // Top accent stripe
  ctx.fillStyle = v.color;
  ctx.fillRect(0, 0, S, 10);

  // ── Branding ──────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `bold 58px ${FONT}`;
  ctx.fillText('PepScan', P, 92);

  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.font = `30px ${FONT}`;
  ctx.fillText('Vial Screening Result', P, 136);

  // ── Verdict badge ─────────────────────────────────────────────
  const bX = P, bY = 168, bW = S - P * 2, bH = 200;

  ctx.fillStyle = hexAlpha(v.color, 0.13);
  roundedRect(ctx, bX, bY, bW, bH, 24);
  ctx.fill();

  ctx.strokeStyle = hexAlpha(v.color, 0.42);
  ctx.lineWidth = 2;
  roundedRect(ctx, bX, bY, bW, bH, 24);
  ctx.stroke();

  ctx.fillStyle = v.color;
  ctx.font = `bold 82px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${v.icon}  ${v.label}`, S / 2, bY + 113);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = `34px ${FONT}`;
  ctx.fillText(v.summary, S / 2, bY + 163);
  ctx.textAlign = 'left';

  // ── Vial info ──────────────────────────────────────────────────
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

  // ── Divider ───────────────────────────────────────────────────
  y += 36;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(S - P, y); ctx.stroke();
  y += 38;

  // ── Findings ──────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(255,255,255,0.36)';
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('KEY FINDINGS', P, y);
  y += 46;

  const maxFindings = Math.min(input.primaryReasons.length, 3);
  ctx.font = `30px ${FONT}`;
  const maxFindW = S - P * 2 - 44;

  for (let i = 0; i < maxFindings; i++) {
    const lines = wrapText(ctx, input.primaryReasons[i], maxFindW).slice(0, 2);

    ctx.fillStyle = hexAlpha(v.color, 0.8);
    ctx.fillText('•', P, y);

    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    for (let l = 0; l < lines.length; l++) {
      ctx.fillText(lines[l], P + 40, y + l * 38);
    }
    y += lines.length * 38 + 20;
  }

  // ── Bottom bar ────────────────────────────────────────────────
  const botY = S - 60;

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(P, botY - 32); ctx.lineTo(S - P, botY - 32); ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.font = `22px ${FONT}`;
  ctx.fillText('Visual screening only. Does not confirm safety, purity, identity or potency.', P, botY);

  ctx.fillStyle = hexAlpha(v.color, 0.72);
  ctx.font = `bold 28px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('pepscan.app', S - P, botY);
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
  const name = `pepscan-${input.triageResult}.png`;

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
