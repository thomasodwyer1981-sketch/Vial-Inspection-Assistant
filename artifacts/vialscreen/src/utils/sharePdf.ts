/**
 * PepScan — PDF Report Generator
 *
 * Produces a professional A4 PDF with branded header, vial photos,
 * verdict, and findings. Shares via native share sheet or downloads.
 */

import jsPDF from 'jspdf';

export interface PdfReportInput {
  triageResult: 'pass' | 'review' | 'do-not-use';
  overallConfidence: number;
  peptideName?: string | null;
  vendor?: string | null;
  primaryReasons: string[];
  ocrText?: string | null;
  captures?: Array<{ background: string; dataUrl: string }>;
  scannedAt?: string | Date | null;
}

// ── Colour palette ────────────────────────────────────────────────────────────
const BRAND_TEAL = '#0C9A7A';
const DARK_BG    = [13, 17, 23] as [number, number, number];   // #0d1117
const WHITE      = [255, 255, 255] as [number, number, number];

const VERDICT_COLOURS: Record<string, [number, number, number]> = {
  pass:        [34, 197, 94],   // green
  review:      [245, 158, 11],  // amber
  'do-not-use':[239, 68, 68],   // red
};

const VERDICT_LABELS: Record<string, string> = {
  pass:        '✓  PASS',
  review:      '!  REVIEW',
  'do-not-use':'✕  DO NOT USE',
};

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
    ? new Date(input.scannedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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

  doc.setFontSize(8);
  doc.setTextColor(140, 150, 160);
  doc.text(`Confidence: ${input.overallConfidence}%`, ML, y);
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
    doc.text('CAPTURES', ML, y);
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
        // Detect format from dataUrl
        const fmt = cap.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        addImageFit(doc, cap.dataUrl, fmt, bx, y, imgW, imgH, nw, nh);
      } catch {
        // If image fails to load, show placeholder text
        doc.setFontSize(7);
        doc.setTextColor(160, 170, 180);
        doc.text('Photo unavailable', bx + imgW / 2, y + imgH / 2 + 1, { align: 'center' });
      }

      // Caption
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 110, 120);
      doc.text(labels[cap.background] ?? cap.background, bx + imgW / 2, y + imgH + 3.5, { align: 'center' });
    }

    y += imgH + 8;
  }

  // ── Verdict badge ───────────────────────────────────────────────────────────
  const vc = VERDICT_COLOURS[input.triageResult] ?? [100, 100, 100];
  const verdictLabel = VERDICT_LABELS[input.triageResult] ?? input.triageResult.toUpperCase();

  // Coloured badge background (GState lacks a construct signature in the
  // bundled jsPDF types, so cast the constructor once)
  type GState = Parameters<jsPDF['setGState']>[0];
  const GStateCtor = doc.GState as unknown as new (opts: { opacity: number }) => GState;
  doc.setFillColor(vc[0], vc[1], vc[2]);
  doc.setGState(new GStateCtor({ opacity: 0.12 }));
  doc.roundedRect(ML, y, CW, 18, 3, 3, 'F');
  doc.setGState(new GStateCtor({ opacity: 1 }));

  // Badge border
  doc.setDrawColor(vc[0], vc[1], vc[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(ML, y, CW, 18, 3, 3, 'S');

  // Verdict text
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(vc[0], vc[1], vc[2]);
  doc.text(verdictLabel, PW / 2, y + 11, { align: 'center' });

  y += 24;

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

      // Check page overflow
      if (y + blockH > PH - 25) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(245, 247, 250);
      doc.roundedRect(ML, y, CW, blockH, 1.5, 1.5, 'F');

      // Bullet dot
      doc.setFillColor(...vc);
      doc.circle(ML + 3.5, y + blockH / 2, 1.2, 'F');

      doc.setTextColor(30, 35, 40);
      for (let l = 0; l < lines.length; l++) {
        doc.text(lines[l], ML + 7, y + 4.5 + l * 4.5);
      }

      y += blockH + 2.5;
    }
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

  // ── Footer ──────────────────────────────────────────────────────────────────
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
    doc.text('pepscan.app', PW - MR, fy, { align: 'right' });
  }

  return doc.output('blob');
}

// ── Share / download ──────────────────────────────────────────────────────────

export async function shareOrDownloadPdf(input: PdfReportInput): Promise<void> {
  const blob = await generatePdfReport(input);
  const name  = (input.peptideName?.trim().replace(/\s+/g, '-') || 'vial') + '-pepscan.pdf';
  const file  = new File([blob], name, { type: 'application/pdf' });

  // Native share sheet (Android Chrome, iOS 15+)
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'PepScan Report' });
      return;
    } catch (err) {
      if ((err as DOMException).name === 'AbortError') return;
      // Fall through to download
    }
  }

  // Fallback — trigger browser download
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
