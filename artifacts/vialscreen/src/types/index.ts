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

// ---- Scan Mode --------------------------------------------

/**
 * Scan mode determines what kind of vial is being inspected.
 * 'reconstituted' — liquid vial after adding BAC water (standard, free).
 * 'powder'        — lyophilized / freeze-dried vial pre-mix (Pro feature).
 */
export type ScanMode = 'reconstituted' | 'powder';

// ---- Appearance Profile -----------------------------------

/**
 * The user-selected appearance profile describes what the vial
 * is expected to look like visually. This changes how the analysis
 * engine interprets color, tint, and clarity findings.
 */
export type AppearanceProfile =
  | 'clear-standard'   // Standard clear/colorless peptide after mixing
  | 'ghk-cu'           // GHK-Cu or similar blue-tinted compound
  | 'glp1-clear'       // GLP-1 peptide hormones (semaglutide, tirzepatide) — slight yellow normal
  | 'unknown-custom';  // Unknown or non-standard appearance — conservative mode

export const APPEARANCE_PROFILES: Record<
  AppearanceProfile,
  { label: string; description: string }
> = {
  'clear-standard': {
    label: 'Standard Clear Peptide',
    description: 'Expected to appear mostly clear and colorless after mixing.',
  },
  'ghk-cu': {
    label: 'GHK-Cu / Blue Peptide',
    description:
      'Blue coloration may be expected. Screens for haze, particles, or poor mixing.',
  },
  'glp1-clear': {
    label: 'GLP-1 / Peptide Hormone',
    description:
      'Semaglutide, tirzepatide, and similar. Colorless to slight yellow is normal — deeper yellow, cloudiness, or particles are concerns.',
  },
  'unknown-custom': {
    label: 'Unknown / Custom Appearance',
    description:
      'Use when colour alone should not drive interpretation. More conservative screening.',
  },
};

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

  /**
   * Selected appearance profile — affects how color/clarity is interpreted.
   * Null means not selected (should be required before analysis starts).
   */
  appearanceProfile: AppearanceProfile | null;

  /**
   * Scan mode. 'reconstituted' for liquid vials after BAC water.
   * 'powder' for lyophilized vials before reconstitution (Pro feature).
   * Optional for backward compatibility with pre-existing sessions.
   */
  scanMode?: ScanMode;
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

  /**
   * The appearance profile that was active when analysis ran.
   * Stored with the result so history detail can show it accurately.
   * Null for sessions created before profile support was added.
   */
  profileUsed: AppearanceProfile | null;
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

  /**
   * True if the session was finalized but could not be saved to history
   * due to storage quota being exceeded. The session is preserved as the
   * active session so the user can retry after freeing storage.
   */
  pendingSave?: boolean;
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
  /**
   * Appearance profile selected for this scan.
   * Optional for backward compatibility with older history entries.
   */
  appearanceProfile?: AppearanceProfile | null;
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
