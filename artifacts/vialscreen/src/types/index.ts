// ============================================================
// VialScreen — Core Data Model
// ============================================================

// ---- Triage Result ----------------------------------------

export type TriageResult = 'pass' | 'review' | 'do-not-use';
export type CategoryStatus = 'pass' | 'review' | 'flag' | 'unable';

// ---- Per-Category Score -----------------------------------

export interface CategoryScore {
  /**
   * The scoring category identifier.
   */
  category: CategoryKey;

  /**
   * Human-readable category name.
   */
  label: string;

  /**
   * Numeric score 0–100. Higher = better / safer.
   */
  score: number;

  /**
   * Derived status from the score.
   */
  status: CategoryStatus;

  /**
   * Plain-English explanation shown to the user.
   */
  explanation: string;

  /**
   * Brief developer note on how the score was computed.
   * Useful for transparency and debugging.
   */
  method: string;
}

export type CategoryKey =
  | 'captureQuality'
  | 'clarity'
  | 'visibleParticles'
  | 'fillLevel'
  | 'capIntegrity'
  | 'labelOcr'
  | 'crackDamage'
  | 'glareInterference';

// ---- Media Capture ----------------------------------------

export type CaptureBackground = 'white' | 'black' | 'label' | 'label2';

export interface MediaCapture {
  id: string;
  background: CaptureBackground;

  /**
   * Base64 data URL of the captured image.
   */
  dataUrl: string;

  /**
   * Width in pixels.
   */
  width: number;

  /**
   * Height in pixels.
   */
  height: number;

  capturedAt: string; // ISO 8601
}

// ---- User-Entered Metadata --------------------------------

export interface ScanMetadata {
  /**
   * Free-text peptide/compound name — for organization only.
   */
  peptideName: string;

  /**
   * Source vendor name — for organization only.
   */
  vendor: string;

  /**
   * Batch or lot number — for organization only.
   */
  batchLot: string;

  /**
   * Concentration text (e.g. "5mg/mL") — for display only.
   */
  concentration: string;

  /**
   * Optional purchase date.
   */
  purchaseDate: string;

  /**
   * Freeform notes.
   */
  notes: string;
}

// ---- Analysis Result --------------------------------------

export interface AnalysisResult {
  /**
   * Overall triage verdict.
   */
  triageResult: TriageResult;

  /**
   * Overall confidence 0–100.
   * Low confidence reduces certainty; uncertain cases bias toward REVIEW.
   */
  overallConfidence: number;

  /**
   * Per-category breakdowns.
   */
  categories: CategoryScore[];

  /**
   * Primary reason(s) for the triage result — shown prominently.
   */
  primaryReasons: string[];

  /**
   * Whether the analysis was affected by poor capture quality.
   */
  qualityDegraded: boolean;

  /**
   * OCR-extracted text from the label capture, if available.
   */
  ocrText: string | null;
}

// ---- Full Scan Session ------------------------------------

export interface ScanSession {
  id: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601

  /**
   * Current step index the session is on (for resume support).
   */
  currentStep: number;

  /**
   * Whether the disclaimer was acknowledged before starting.
   */
  disclaimerAcknowledged: boolean;

  /**
   * User-entered metadata.
   */
  metadata: ScanMetadata;

  /**
   * Captured images (white background, black background, labels).
   */
  captures: MediaCapture[];

  /**
   * Heuristic analysis result — populated after review step.
   */
  analysisResult: AnalysisResult | null;

  /**
   * Whether the session has been finalized.
   */
  finalized: boolean;
}

// ---- History Item (lightweight summary for list view) ----

export interface HistoryItem {
  id: string;
  createdAt: string;
  triageResult: TriageResult;
  peptideName: string;
  vendor: string;
  overallConfidence: number;
  thumbnailDataUrl: string | null;
}

// ---- App State Shapes ------------------------------------

export interface OnboardingState {
  completed: boolean;
  disclaimerAcknowledgedAt: string | null;
}

// ---- Scan Step Definitions --------------------------------

export type ScanStep =
  | 'prepare'
  | 'white-capture'
  | 'black-capture'
  | 'label-capture'
  | 'review'
  | 'analysis'
  | 'results';

export const SCAN_STEPS: ScanStep[] = [
  'prepare',
  'white-capture',
  'black-capture',
  'label-capture',
  'review',
  'analysis',
  'results',
];

export const SCAN_STEP_LABELS: Record<ScanStep, string> = {
  prepare: 'Prepare Vial',
  'white-capture': 'White Background',
  'black-capture': 'Black Background',
  'label-capture': 'Label Capture',
  review: 'Review Captures',
  analysis: 'Analysis',
  results: 'Results',
};
