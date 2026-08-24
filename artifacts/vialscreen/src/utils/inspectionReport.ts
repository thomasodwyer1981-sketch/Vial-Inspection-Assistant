import type { ScanSession } from '@/types';
import type { PdfReportInput } from '@/utils/sharePdf';

/**
 * Converts a saved or in-progress inspection into the evidence-led PDF input.
 * Saved sessions intentionally retain compact thumbnails rather than original
 * captures, so reports disclose that distinction instead of implying originals
 * are still available.
 */
export function buildInspectionReportInput(
  session: ScanSession,
  comparison?: PdfReportInput['comparison'],
): PdfReportInput {
  const result = session.analysisResult;
  if (!result) throw new Error('This inspection has no result to report.');

  return {
    triageResult: result.triageResult,
    assessmentOutcome: result.assessmentOutcome,
    overallConfidence: result.overallConfidence,
    peptideName: session.metadata.peptideName,
    vendor: session.metadata.vendor,
    batchLot: session.metadata.batchLot,
    concentration: session.metadata.concentration,
    purchaseDate: session.metadata.purchaseDate,
    notes: session.metadata.notes,
    scanMode: session.metadata.scanMode,
    appearanceProfile: result.profileUsed ?? session.metadata.appearanceProfile,
    reconstitutedAt: session.metadata.reconstitutedAt,
    primaryReasons: result.primaryReasons,
    qualityBlockers: result.qualityBlockers,
    categories: result.categories,
    ocrText: result.ocrText,
    captures: session.captures
      .map((capture) => ({
        background: capture.background,
        dataUrl: capture.dataUrl || capture.thumbDataUrl || '',
        isThumbnail: !capture.dataUrl && Boolean(capture.thumbDataUrl),
      }))
      .filter((capture) => Boolean(capture.dataUrl)),
    scannedAt: session.createdAt,
    comparison,
  };
}