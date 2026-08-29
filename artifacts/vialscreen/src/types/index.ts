// ============================================================
// VialScreen — Core Data Model
// ============================================================

// ---- Triage Result ----------------------------------------

export type TriageResult = 'pass' | 'review' | 'do-not-use';
export type CategoryStatus = 'pass' | 'review' | 'flag' | 'unable';

/**
 * Whether PepScan could make any visual assessment from the required captures.
 * This is intentionally separate from triage: an unavailable assessment is not
 * a visual finding and must never be presented as a reassuring screen.
 */
export type AssessmentOutcome = 'assessed' | 'unable-to-assess';

export type CaptureQualityBlockerCode =
  | 'missing-capture'
  | 'unreadable-capture'
  | 'low-resolution'
  | 'blurred'
  | 'poor-exposure'
  | 'excessive-glare'
  | 'poor-framing';

export interface CaptureQualityBlocker {
  code: CaptureQualityBlockerCode;
  background: 'white' | 'black';
  title: string;
  instruction: string;
}

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
  | 'clear-standard'   // Generic clear/colorless — catch-all for unlisted clear peptides
  | 'bpc157'           // BPC-157 (clear)
  | 'tb500'            // TB-500 / Thymosin Beta-4 (clear)
  | 'ipamorelin'       // Ipamorelin, CJC-1295, GHRP-2, GHRP-6 (clear)
  | 'sermorelin'       // Sermorelin, Tesamorelin, MOD-GRF (clear, slight opalescence possible)
  | 'melanotan'        // Melanotan II, PT-141 / Bremelanotide (clear to slight amber)
  | 'igf1'             // IGF-1 LR3, IGF-1 DES (clear)
  | 'aod9604'          // AOD-9604, HGH Fragment 176-191 (clear)
  | 'epithalon'        // Epithalon, Selank, Semax, short neuropeptides (clear)
  | 'hcg'              // HCG (clear, sterile water reconstituted — strict clarity)
  | 'ghk-cu'           // GHK-Cu or similar blue-tinted compound
  | 'glp1-clear'       // GLP-1 peptide hormones (semaglutide, tirzepatide) — slight yellow normal
  | 'unknown-custom';  // Unknown or non-standard appearance — conservative mode

export const APPEARANCE_PROFILES: Record<
  AppearanceProfile,
  { label: string; description: string }
> = {
  'clear-standard': {
    label: 'Standard Clear Peptide',
    description: 'Expected mostly clear and colorless. Use if your peptide is not listed.',
  },
  'bpc157': {
    label: 'BPC-157',
    description: 'Body Protective Compound. Clear, colourless solution after reconstitution.',
  },
  'tb500': {
    label: 'TB-500 / Thymosin β-4',
    description: 'Clear solution. Slight cloudiness immediately after reconstitution is normal — should clear within minutes.',
  },
  'ipamorelin': {
    label: 'Ipamorelin / CJC-1295 / GHRP',
    description: 'Clear, colourless solution. Covers Ipamorelin, CJC-1295, GHRP-2, GHRP-6, and similar GH secretagogues.',
  },
  'sermorelin': {
    label: 'Sermorelin / Tesamorelin',
    description: 'Clear solution. Slight transient opalescence after reconstitution can be normal — persistent cloudiness is not.',
  },
  'melanotan': {
    label: 'Melanotan II / PT-141',
    description: 'Generally clear. Some batches may have a very slight amber tint — significant discolouration is a concern.',
  },
  'igf1': {
    label: 'IGF-1 LR3 / IGF-1 DES',
    description: 'Clear, colourless solution. Sensitive to degradation — any cloudiness warrants caution.',
  },
  'aod9604': {
    label: 'AOD-9604 / HGH Fragment',
    description: 'Clear, colourless solution after reconstitution with bacteriostatic water.',
  },
  'epithalon': {
    label: 'Epithalon / Selank / Semax',
    description: 'Short peptides — clear and colourless. Selank and Semax nasal preparations may appear very slightly opalescent.',
  },
  'hcg': {
    label: 'HCG',
    description: 'Should be crystal clear. Any turbidity or particulates are significant concerns for this compound.',
  },
  'ghk-cu': {
    label: 'GHK-Cu / Blue Peptide',
    description: 'Blue coloration is expected. Screens for haze, particles, or poor mixing.',
  },
  'glp1-clear': {
    label: 'GLP-1 / Semaglutide / Tirzepatide',
    description: 'Colourless to slight yellow is normal. Deeper yellow, cloudiness, or particles are concerns.',
  },
  'unknown-custom': {
    label: 'Unknown / Custom Appearance',
    description: 'Use when colour alone should not drive interpretation. More conservative screening.',
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
   * Small thumbnail (~144px) generated at capture time. Persisted with the
   * session and used for history lists — full dataUrls are stripped before
   * persistence to protect the localStorage quota.
   */
  thumbDataUrl?: string;

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

  /**
   * How long ago the vial was reconstituted with BAC water.
   * Used to give the AI temporal context — freshly reconstituted vials may
   * look different to those stored for days, and some degradation is time-dependent.
   * Optional — not all users will fill this in.
   */
  reconstitutedAt?: 'just-now' | '1-8h' | '1-2d' | '2d-plus' | null;
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
   * 'unable-to-assess' means required photos were not reliable enough for
   * visual screening. Optional for backward compatibility with saved scans.
   */
  assessmentOutcome?: AssessmentOutcome;

  /**
   * Structured quality blockers used to explain and route a required retake.
   * Optional for backwards compatibility with saved scans.
   */
  qualityBlockers?: CaptureQualityBlocker[];

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

  /**
   * Whether AI Vision (GPT) enhanced this result.
   * When true, the verdict and confidence reflect a blend of heuristic + AI.
   */
  aiEnhanced?: boolean;

  /**
   * Findings contributed by the AI Vision model.
   * Prepended to primaryReasons when present.
   */
  aiFindings?: string[];

  /**
   * Set when analysis was run with baseline context from previous scans
   * of the same sample name (Pro — Baseline Comparison feature).
   */
  baselineUsed?: {
    sampleName: string;
    previousScanCount: number;
  };
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

  /**
   * Non-sensitive classification of the last persistence failure. Stored only
   * for finalized pending sessions so recovery guidance remains accurate after
   * an app restart.
   */
  pendingSaveFailure?: {
    stage: 'detail' | 'history';
    kind: 'quota' | 'serialization' | 'write';
    errorName: string;
  };
}

// ---- History Item (lightweight summary for list view) ----

export interface HistoryItem {
  id: string;
  createdAt: string;
  triageResult: TriageResult;
  peptideName: string;
  vendor: string;
  overallConfidence: number;
  assessmentOutcome?: AssessmentOutcome;
  thumbnailDataUrl: string | null;
  /**
   * Appearance profile selected for this scan.
   * Optional for backward compatibility with older history entries.
   */
  appearanceProfile?: AppearanceProfile | null;

  /**
   * Scan mode — liquid reconstituted or pre-mix powder.
   * Optional for backward compatibility with older history entries.
   */
  scanMode?: ScanMode;
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
