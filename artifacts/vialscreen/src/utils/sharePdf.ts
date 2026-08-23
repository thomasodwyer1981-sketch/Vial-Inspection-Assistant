/**
 * PepScan — PDF Report Generator
 *
 * Produces a professional A4 PDF with branded header, vial photos,
 * verdict, and findings. Shares via native share sheet or downloads.
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { APPEARANCE_PROFILES, type AppearanceProfile, type ScanMode } from '@/types';

/** Blob → bare base64 string (no data:… prefix). */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export interface PdfReportInput {
  triageResult: 'pass' | 'review' | 'do-not-use';
  assessmentOutcome?: 'assessed' | 'unable-to-assess';
  overallConfidence: number;
  peptideName?: string | null;
  vendor?: string | null;
  batchLot?: string | null;
  concentration?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
  scanMode?: ScanMode;
  appearanceProfile?: AppearanceProfile | null;
  reconstitutedAt?: 'just-now' | '1-8h' | '1-2d' | '2d-plus' | null;
  primaryReasons: string[];
  qualityBlockers?: Array<{ title: string; instruction: string }>;
  categories?: Array<{
    label: string;
    status: 'pass' | 'review' | 'flag' | 'unable';
    explanation: string;
  }>;
  ocrText?: string | null;
  captures?: Array<{ background: string; dataUrl: string; isThumbnail?: boolean }>;
  scannedAt?: string | Date | null;
  comparison?: {
    baselineScannedAt: string | Date;
    baselineOutcome: string;
    baselineConfidence: number;
    observedChanges: string[];
  };
}

// ── Colour palette ────────────────────────────────────────────────────────────
const BRAND_TEAL  = '#0C9A7A';
const DARK_BG     = [13, 17, 23]   as [number, number, number];   // #0d1117
const WHITE       = [255, 255, 255] as [number, number, number];

const VERDICT_COLOURS: Record<string, [number, number, number]> = {
  pass:        [34,  197, 94],   // green
  review:      [245, 158, 11],   // amber
  'do-not-use':[239, 68,  68],   // red
  'unable-to-assess': [245, 158, 11],
};

const VERDICT_LABELS: Record<string, string> = {
  pass:        '✓  NO VISIBLE ANOMALY DETECTED',
  review:      '!  MANUAL INSPECTION RECOMMENDED',
  'do-not-use':'✕  VISIBLE ISSUE FLAGGED',
  'unable-to-assess': '!  UNABLE TO ASSESS — RETAKE SCAN',
};

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pepscan.app';
const APP_SITE_URL   = 'pepscan.app';

const FULL_DISCLAIMER =
  'PepScan is a visual screening tool only. It does not confirm the identity, ' +
  'purity, potency, safety, or sterility of any substance. Results are based on ' +
  'image-based visual analysis and are not a substitute for laboratory testing. ' +
  'Never rely solely on visual inspection to determine whether a substance is safe ' +
  'to use. Always obtain peptides from reputable, verified sources and consult a ' +
  'qualified healthcare professional before use.';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth) as string[];
}

/** Load a dataUrl image and return its natural width/height via HTMLImageElement. */
async function loadImage(dataUrl: string): Promise<{ img: HTMLImageElement; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** Add an image into the PDF, scaled to fit within the given box while preserving aspect ratio. */
function addImageFit(
  doc: jsPDF,
  dataUrl: string,
  format: string,
  x: number, y: number,
  maxW: number, maxH: number,
  naturalW: number, naturalH: number,
): { renderedW: number; renderedH: number } {
  const ratio = naturalW / naturalH;
  let rw = maxW;
  let rh = maxW / ratio;
  if (rh > maxH) { rh = maxH; rw = maxH * ratio; }
  const cx = x + (maxW - rw) / 2;
  doc.addImage(dataUrl, format, cx, y, rw, rh);
  return { renderedW: rw, renderedH: rh };
}

/** Generate a QR code as a PNG data URL using an offscreen canvas. */
async function makeQrDataUrl(text: string, sizePx: number): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width  = sizePx;
  canvas.height = sizePx;
  await QRCode.toCanvas(canvas, text, {
    width: sizePx,
    margin: 1,
    color: { dark: '#0d1117', light: '#ffffff' },
  });
  return canvas.toDataURL('image/png');
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generatePdfReport(input: PdfReportInput): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PW = 210; // page width mm
  const PH = 297; // page height mm
  const ML = 15;  // left margin
  const MR = 15;  // right margin
  const CW = PW - ML - MR; // content width

  let y = 0;

  // ── Header bar ─────────────────────────────────────────────────────────────
  doc.setFillColor(...DARK_BG);
  doc.rect(0, 0, PW, 28, 'F');

  // Teal accent line at bottom of header
  doc.setFillColor(...hexToRgb(BRAND_TEAL));
  doc.rect(0, 26, PW, 2, 'F');

  // Brand name
  doc.setTextColor(...WHITE);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PepScan', ML, 13);

  // Tagline
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 190, 200);
  doc.text('Vial Screening Report  ·  Visual analysis only', ML, 19);

  // Date (top-right)
  const dateStr = input.scannedAt
    ? new Date(input.scannedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  doc.setFontSize(8);
  doc.setTextColor(180, 190, 200);
  doc.text(dateStr, PW - MR, 13, { align: 'right' });

  y = 35;

  // ── Session metadata ────────────────────────────────────────────────────────
  const vialName = input.peptideName?.trim() || 'Unnamed Vial';
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text(vialName, ML, y);
  y += 6;

  if (input.vendor?.trim()) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 110, 120);
    doc.text(input.vendor.trim(), ML, y);
    y += 5;
  }

  const recordDetails = [
    input.batchLot?.trim() ? `Batch / lot: ${input.batchLot.trim()}` : null,
    input.concentration?.trim() ? `Concentration: ${input.concentration.trim()}` : null,
    input.purchaseDate?.trim() ? `Purchase date: ${input.purchaseDate.trim()}` : null,
    input.scanMode ? `Screening mode: ${input.scanMode === 'powder' ? 'Pre-mix powder' : 'Reconstituted liquid'}` : null,
    input.appearanceProfile ? `Appearance profile: ${APPEARANCE_PROFILES[input.appearanceProfile].label}` : null,
    input.reconstitutedAt ? `Reconstitution timing: ${input.reconstitutedAt}` : null,
  ].filter((detail): detail is string => Boolean(detail));
  if (recordDetails.length) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 110, 120);
    for (const detail of recordDetails) {
      doc.text(detail, ML, y);
      y += 4.5;
    }
  }

  doc.setFontSize(8);
  doc.setTextColor(140, 150, 160);
  doc.text(
    input.assessmentOutcome === 'unable-to-assess'
      ? 'Assessment: unavailable — retake required photos'
      : `Confidence: ${input.overallConfidence}%`,
    ML,
    y,
  );
  y += 8;

  // ── Vial photos ─────────────────────────────────────────────────────────────
  const whiteCapture = input.captures?.find((c) => c.background === 'white');
  const blackCapture = input.captures?.find((c) => c.background === 'black');
  const labelCapture = input.captures?.find((c) => c.background === 'label');
  const hasPhotos    = whiteCapture || blackCapture || labelCapture;

  if (hasPhotos) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 90, 100);
    doc.text('CAPTURE EVIDENCE', ML, y);
    y += 4;

    const slots = [whiteCapture, blackCapture, labelCapture].filter(
      (c): c is NonNullable<typeof c> => Boolean(c),
    );
    const labels: Record<string, string> = { white: 'White Background', black: 'Black Background', label: 'Label' };
    const cols = slots.length;
    const imgW = (CW - (cols - 1) * 4) / cols;
    const imgH = imgW * 0.75; // 4:3 box

    // Draw photo boxes
    for (let i = 0; i < slots.length; i++) {
      const cap = slots[i];
      const bx = ML + i * (imgW + 4);

      // Rounded box background
      doc.setFillColor(235, 238, 242);
      doc.roundedRect(bx, y, imgW, imgH, 2, 2, 'F');

      try {
        const { w: nw, h: nh } = await loadImage(cap.dataUrl);
        const fmt = cap.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        addImageFit(doc, cap.dataUrl, fmt, bx, y, imgW, imgH, nw, nh);
      } catch {
        doc.setFontSize(7);
        doc.setTextColor(160, 170, 180);
        doc.text('Photo unavailable', bx + imgW / 2, y + imgH / 2 + 1, { align: 'center' });
      }

      // Caption
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 110, 120);
      doc.text(`${labels[cap.background] ?? cap.background}${cap.isThumbnail ? ' · archived thumbnail' : ''}`, bx + imgW / 2, y + imgH + 3.5, { align: 'center' });
    }

    y += imgH + 8;
  }

  // ── Verdict badge ───────────────────────────────────────────────────────────
  const verdictKey = input.assessmentOutcome === 'unable-to-assess'
    ? 'unable-to-assess'
    : input.triageResult;
  const vc = VERDICT_COLOURS[verdictKey] ?? [100, 100, 100];
  const verdictLabel = VERDICT_LABELS[verdictKey] ?? verdictKey.toUpperCase();

  type GState = Parameters<jsPDF['setGState']>[0];
  const GStateCtor = doc.GState as unknown as new (opts: { opacity: number }) => GState;
  doc.setFillColor(vc[0], vc[1], vc[2]);
  doc.setGState(new GStateCtor({ opacity: 0.12 }));
  doc.roundedRect(ML, y, CW, 18, 3, 3, 'F');
  doc.setGState(new GStateCtor({ opacity: 1 }));

  doc.setDrawColor(vc[0], vc[1], vc[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, CW, 18, 3, 3, 'S');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(vc[0], vc[1], vc[2]);
  doc.text(verdictLabel, PW / 2, y + 11, { align: 'center' });

  y += 24;

  // ── Capture limitations ─────────────────────────────────────────────────────
  if (input.assessmentOutcome === 'unable-to-assess' && input.qualityBlockers?.length) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 90, 100);
    doc.text('CAPTURE LIMITATIONS — RETAKE REQUIRED', ML, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    for (const blocker of input.qualityBlockers) {
      const lines = wrapText(doc, `${blocker.title}: ${blocker.instruction}`, CW - 8);
      const blockH = Math.max(11, lines.length * 4 + 6);
      if (y + blockH > PH - 25) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(255, 249, 235);
      doc.setDrawColor(245, 158, 11);
      doc.roundedRect(ML, y, CW, blockH, 1.5, 1.5, 'FD');
      doc.setTextColor(90, 70, 20);
      for (let line = 0; line < lines.length; line++) {
        doc.text(lines[line], ML + 4, y + 4.5 + line * 4);
      }
      y += blockH + 2.5;
    }
  }

  // ── Key Findings ────────────────────────────────────────────────────────────
  if (input.primaryReasons.length > 0) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 90, 100);
    doc.text('KEY FINDINGS', ML, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    for (const reason of input.primaryReasons) {
      const lines = wrapText(doc, reason, CW - 6);
      const blockH = lines.length * 4.5 + 3;

      if (y + blockH > PH - 25) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(245, 247, 250);
      doc.roundedRect(ML, y, CW, blockH, 1.5, 1.5, 'F');

      doc.setFillColor(...vc);
      doc.circle(ML + 3.5, y + blockH / 2, 1.2, 'F');

      doc.setTextColor(30, 35, 40);
      for (let l = 0; l < lines.length; l++) {
        doc.text(lines[l], ML + 7, y + 4.5 + l * 4.5);
      }

      y += blockH + 2.5;
    }
  }

  // ── Visual factors assessed ─────────────────────────────────────────────────
  if (input.categories?.length) {
    y += 3;
    if (y + 15 > PH - 25) { doc.addPage(); y = 20; }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 90, 100);
    doc.text('VISUAL FACTORS ASSESSED', ML, y);
    y += 5;

    const statusLabels: Record<string, string> = {
      pass: 'No visual issue detected',
      review: 'Manual inspection recommended',
      flag: 'Visible issue flagged',
      unable: 'Unable to assess',
    };

    for (const category of input.categories) {
      const title = `${category.label} — ${statusLabels[category.status] ?? 'Assessment unavailable'}`;
      const lines = wrapText(doc, category.explanation, CW - 10);
      const blockH = Math.max(12, lines.length * 3.8 + 8);

      if (y + blockH > PH - 25) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(245, 247, 250);
      doc.roundedRect(ML, y, CW, blockH, 1.5, 1.5, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 35, 40);
      doc.text(title, ML + 4, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 80, 90);
      for (let l = 0; l < lines.length; l++) {
        doc.text(lines[l], ML + 4, y + 8.5 + l * 3.8);
      }
      y += blockH + 2.5;
    }
  }

  // ── Repeat-inspection context ───────────────────────────────────────────────
  if (input.comparison) {
    if (y + 28 > PH - 25) { doc.addPage(); y = 20; }
    y += 3;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 90, 100);
    doc.text('REPEAT-INSPECTION CONTEXT', ML, y);
    y += 5;
    const baselineDate = new Date(input.comparison.baselineScannedAt).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
    const comparisonText = [
      `Earlier saved inspection: ${baselineDate} · ${input.comparison.baselineOutcome} · ${input.comparison.baselineConfidence}% confidence.`,
      ...input.comparison.observedChanges.map((change) => `• ${change}`),
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 70, 80);
    const lines = comparisonText.flatMap((line) => wrapText(doc, line, CW - 8));
    const boxH = Math.max(14, lines.length * 4 + 7);
    doc.setFillColor(240, 248, 246);
    doc.roundedRect(ML, y, CW, boxH, 1.5, 1.5, 'F');
    lines.forEach((line, index) => doc.text(line, ML + 4, y + 4.5 + index * 4));
    y += boxH + 4;
  }

  // ── OCR label text ──────────────────────────────────────────────────────────
  if (input.ocrText?.trim()) {
    y += 3;
    if (y + 20 > PH - 25) { doc.addPage(); y = 20; }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 90, 100);
    doc.text('EXTRACTED LABEL TEXT', ML, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 70, 80);
    const ocrLines = wrapText(doc, input.ocrText.trim(), CW - 4);
    doc.setFillColor(240, 242, 246);
    const ocrH = ocrLines.length * 4.2 + 5;
    doc.roundedRect(ML, y, CW, ocrH, 1.5, 1.5, 'F');
    for (let l = 0; l < ocrLines.length; l++) {
      doc.text(ocrLines[l], ML + 3, y + 4 + l * 4.2);
    }
    y += ocrH + 4;
  }

  // ── Inspector notes ─────────────────────────────────────────────────────────
  if (input.notes?.trim()) {
    if (y + 22 > PH - 25) { doc.addPage(); y = 20; }
    y += 3;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 90, 100);
    doc.text('INSPECTOR NOTES', ML, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 70, 80);
    const noteLines = wrapText(doc, input.notes.trim(), CW - 8);
    const noteH = noteLines.length * 4.2 + 7;
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(ML, y, CW, noteH, 1.5, 1.5, 'F');
    noteLines.forEach((line, index) => doc.text(line, ML + 4, y + 4.5 + index * 4.2));
    y += noteH + 4;
  }

  // ── Full disclaimer box ─────────────────────────────────────────────────────
  // Prominent, readable disclaimer — not hidden in the footer.
  {
    const footerStart = PH - 14;
    const promoMinH   = 62; // height we need for the promo panel below
    const disclaimerNeeded = 46;
    const totalNeeded = disclaimerNeeded + promoMinH + 12;

    if (y + totalNeeded > footerStart) {
      doc.addPage();
      y = 20;
    } else {
      y += 10;
    }

    // Separator before disclaimer
    doc.setDrawColor(220, 225, 232);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PW - MR, y);
    y += 6;

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(130, 140, 150);
    doc.text('IMPORTANT DISCLAIMER', ML, y);
    y += 4;

    // Disclaimer box
    const dLines  = wrapText(doc, FULL_DISCLAIMER, CW - 8);
    const dBoxH   = dLines.length * 4.0 + 8;
    doc.setFillColor(255, 249, 235);
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.4);
    doc.roundedRect(ML, y, CW, dBoxH, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 70, 20);
    for (let l = 0; l < dLines.length; l++) {
      doc.text(dLines[l], ML + 4, y + 5.5 + l * 4.0);
    }
    y += dBoxH + 10;
  }

  // ── Promotional panel — "Get PepScan" ───────────────────────────────────────
  // Uses the remaining whitespace above the footer to promote the app.
  {
    const footerStart = PH - 14;
    const spaceLeft   = footerStart - y - 4;
    const QR_MM       = Math.min(38, spaceLeft - 20); // QR code size in mm

    if (spaceLeft >= 30) {
      // Background panel
      doc.setFillColor(...DARK_BG);
      doc.roundedRect(ML, y, CW, spaceLeft, 3, 3, 'F');

      // Teal accent stripe on left
      doc.setFillColor(...hexToRgb(BRAND_TEAL));
      doc.roundedRect(ML, y, 3, spaceLeft, 1.5, 1.5, 'F');

      const px = ML + 8; // text x inside panel
      const qx = ML + CW - QR_MM - 4; // QR x position (right side)
      const textMaxW = qx - px - 4;

      let py = y + 7;

      // "Get PepScan" heading
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text('Get PepScan — Free on Android', px, py);
      py += 6;

      // Tagline
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 200, 190);
      const tagLines = wrapText(doc, 'Two-background visual screening for peptide vials. Record the visible factors in your photos and keep a history of your checks — all on your phone.', textMaxW);
      for (let l = 0; l < tagLines.length; l++) {
        doc.text(tagLines[l], px, py + l * 4.2);
      }
      py += tagLines.length * 4.2 + 4;

      // Play Store URL
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...hexToRgb(BRAND_TEAL));
      doc.text(APP_SITE_URL, px, py);

      // QR code
      if (QR_MM >= 20) {
        try {
          const qrDataUrl = await makeQrDataUrl(PLAY_STORE_URL, 256);
          const qy = y + (spaceLeft - QR_MM) / 2;
          // White background behind QR
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(qx - 1, qy - 1, QR_MM + 2, QR_MM + 2, 2, 2, 'F');
          doc.addImage(qrDataUrl, 'PNG', qx, qy, QR_MM, QR_MM);
          // "Scan to download" caption
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(160, 170, 180);
          doc.text('Scan to download', qx + QR_MM / 2, qy + QR_MM + 4, { align: 'center' });
        } catch {
          // QR generation failed — show URL text fallback
          doc.setFontSize(7);
          doc.setTextColor(...hexToRgb(BRAND_TEAL));
          doc.text(APP_SITE_URL, qx, y + spaceLeft / 2, { align: 'left' });
        }
      }
    }
  }

  // ── Footer — on every page ──────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const fy = PH - 9;

    doc.setDrawColor(220, 225, 232);
    doc.setLineWidth(0.3);
    doc.line(ML, fy - 4, PW - MR, fy - 4);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 170, 180);
    doc.text(
      'Visual screening only. Does not confirm identity, safety, purity, or potency. Not a substitute for laboratory testing.',
      ML, fy,
    );
    doc.setTextColor(...hexToRgb(BRAND_TEAL));
    doc.setFont('helvetica', 'bold');
    doc.text(APP_SITE_URL, PW - MR, fy, { align: 'right' });
  }

  return doc.output('blob');
}

// ── Share / download ──────────────────────────────────────────────────────────

export async function shareOrDownloadPdf(input: PdfReportInput): Promise<void> {
  const blob = await generatePdfReport(input);
  const name  = (input.peptideName?.trim().replace(/\s+/g, '-') || 'vial') + '-pepscan.pdf';

  // ── Native Capacitor (Android / iOS) ────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    const base64 = await blobToBase64(blob);
    const saved = await Filesystem.writeFile({
      path: name,
      data: base64,
      directory: Directory.Cache,
    });
    await Share.share({ title: 'PepScan Report', url: saved.uri });
    return;
  }

  // ── Web fallback ─────────────────────────────────────────────────────────────
  const file = new File([blob], name, { type: 'application/pdf' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'PepScan Report' });
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
