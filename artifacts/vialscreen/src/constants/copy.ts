/**
 * PepScan — App Copy & Disclaimers
 *
 * All user-facing text is centralized here for consistency.
 * Regulatory-sensitive language is clearly marked.
 */

import type { AppearanceProfile } from '../types';

// ----------------------------------------------------------------
// App Identity
// ----------------------------------------------------------------

export const APP_NAME = 'PepScan';
export const APP_TAGLINE = 'A phone-based vial screening assistant for obvious visual red flags.';
export const APP_VERSION = '1.0.0-mvp';

// ----------------------------------------------------------------
// Primary Disclaimer (shown on onboarding + limitations screen)
// ----------------------------------------------------------------

export const PRIMARY_DISCLAIMER = `PepScan is a consumer visual screening assistant only.

It screens for obvious visible presentation issues using photographs taken under controlled background conditions. It does not:

• Confirm identity, purity, potency, or concentration
• Test for sterility, endotoxins, or other biological contaminants
• Detect submicron particles or chemical degradation
• Provide medical or safety advice
• Replace laboratory or pharmacopeial testing

A "Pass" result means no obvious visual issue was detected under these capture conditions. It does not guarantee the vial is safe, authentic, uncontaminated, or fit for any use.

Use this tool as one part of a broader visual inspection routine. Never rely solely on this app before making any decision about a research compound.`;

export const SHORT_DISCLAIMER =
  'Visual screening only. Does not confirm identity, purity, potency, or safety.';

// ----------------------------------------------------------------
// Appearance Profile Copy
// ----------------------------------------------------------------

export const APPEARANCE_PROFILE_COPY: Record<
  AppearanceProfile,
  { label: string; description: string; analysisNote: string }
> = {
  'clear-standard': {
    label: 'Standard Clear Peptide',
    description: 'Expected mostly clear and colorless. Use if your peptide is not listed.',
    analysisNote: 'Color and clarity evaluated against a clear/colorless baseline.',
  },
  'bpc157': {
    label: 'BPC-157',
    description: 'Body Protective Compound. Clear, colourless solution after reconstitution.',
    analysisNote: 'Expects crystal clear appearance. Any turbidity or discolouration is flagged.',
  },
  'tb500': {
    label: 'TB-500 / Thymosin β-4',
    description: 'Clear solution. Slight cloudiness immediately after reconstitution is normal — should clear within minutes.',
    analysisNote: 'Slight transient cloudiness noted if visible. Persistent haze is flagged.',
  },
  'ipamorelin': {
    label: 'Ipamorelin / CJC-1295 / GHRP',
    description: 'Clear, colourless solution. Covers Ipamorelin, CJC-1295, GHRP-2, GHRP-6, and similar GH secretagogues.',
    analysisNote: 'Expects clear, colourless appearance. Colour deviation flagged.',
  },
  'sermorelin': {
    label: 'Sermorelin / Tesamorelin',
    description: 'Clear solution. Slight transient opalescence after reconstitution can be normal — persistent cloudiness is not.',
    analysisNote: 'Mild opalescence noted with lower severity. Persistent cloudiness still flagged.',
  },
  'melanotan': {
    label: 'Melanotan II / PT-141',
    description: 'Generally clear. Some batches may have a very slight amber tint — significant discolouration is a concern.',
    analysisNote: 'Slight amber tint acknowledged as possible. Significant discolouration still flagged.',
  },
  'igf1': {
    label: 'IGF-1 LR3 / IGF-1 DES',
    description: 'Clear, colourless solution. Sensitive to degradation — any cloudiness warrants caution.',
    analysisNote: 'Strict clarity threshold — IGF-1 is sensitive to degradation.',
  },
  'aod9604': {
    label: 'AOD-9604 / HGH Fragment',
    description: 'Clear, colourless solution after reconstitution with bacteriostatic water.',
    analysisNote: 'Expects clear appearance. Standard clear-peptide thresholds applied.',
  },
  'epithalon': {
    label: 'Epithalon / Selank / Semax',
    description: 'Short peptides — clear and colourless. Selank/Semax nasal preparations may appear very slightly opalescent.',
    analysisNote: 'Slight opalescence noted with lower severity for nasal prep variants.',
  },
  'hcg': {
    label: 'HCG',
    description: 'Should be crystal clear. Any turbidity or particulates are significant concerns for this compound.',
    analysisNote: 'Strict thresholds — HCG should be crystal clear. Any deviation is significant.',
  },
  'ghk-cu': {
    label: 'GHK-Cu / Blue Peptide',
    description: 'Blue coloration is expected. Screens for haze, particles, or poor mixing.',
    analysisNote: 'Blue coloration is not treated as a flag. Focuses on turbidity and particles.',
  },
  'glp1-clear': {
    label: 'GLP-1 / Semaglutide / Tirzepatide',
    description: 'Colourless to slight yellow is normal. Deeper yellow, cloudiness, or particles are concerns.',
    analysisNote: 'Slight yellow/warm tint not penalized. Focuses on turbidity, particles, fill level.',
  },
  'unknown-custom': {
    label: 'Unknown / Custom Appearance',
    description: 'Use when colour alone should not drive interpretation. More conservative screening.',
    analysisNote: 'Color not used as primary signal. Deliberately conservative.',
  },
};

// ----------------------------------------------------------------
// Onboarding Copy
// ----------------------------------------------------------------

export const ONBOARDING = {
  title: 'Before You Begin',
  subtitle: 'Read carefully before your first scan.',

  whatItDoes: {
    heading: 'What PepScan Does',
    points: [
      'Guides you through a standardized two-background visual inspection',
      'Screens for obvious presentation red flags: visible particulates, haze, fill anomalies, label readability',
      'Produces a structured triage result: Pass, Review, or Do Not Use',
      'Documents your inspection with timestamps and notes',
    ],
  },

  whatItDoesNot: {
    heading: 'What PepScan Does Not Do',
    points: [
      'Confirm the identity or authenticity of a compound',
      'Verify purity, potency, or concentration',
      'Test for sterility, endotoxins, or microbial contamination',
      'Detect submicron particles, degradants, or chemical changes',
      'Replace laboratory analysis or professional testing',
      'Provide medical advice of any kind',
    ],
  },

  hardCases: {
    heading: 'Difficult Cases — Lower Confidence',
    points: [
      'Dark or amber glass vials',
      'Colored or opaque liquids',
      'Suspensions or emulsions',
      'Lyophilized (powder/cake) products',
      'Heavily printed or foil labels',
      'Poor lighting or glare-heavy captures',
    ],
  },

  acknowledge: 'I understand this is a visual screening tool only and does not confirm safety or authenticity.',
};

// ----------------------------------------------------------------
// Preparation Guide
// ----------------------------------------------------------------

export const PREPARATION = {
  materials: {
    heading: 'Required Materials',
    items: [
      { label: 'Matte black background', detail: 'Dark card or paper — no sheen or texture' },
      { label: 'Matte white background', detail: 'White card or paper — no sheen or texture' },
      { label: 'Bright, even lighting', detail: 'Natural daylight or a balanced light source; avoid harsh direct flash' },
      { label: 'Clean, flat surface', detail: 'Stable surface to hold vial upright' },
    ],
  },
  steps: {
    heading: 'Preparation Steps',
    items: [
      'Clean the exterior of the vial with a lint-free cloth or wipe',
      'Ensure the vial is at room temperature',
      'Gently swirl or slowly invert the vial 2–3 times — do not shake',
      'Allow 10–15 seconds for any bubbles to clear before capturing',
      'Place the vial upright and centered on the background card',
      'Ensure the label is fully visible for the label capture step',
    ],
  },
  lightingTips: {
    heading: 'Lighting Tips',
    items: [
      'Avoid direct flash or single-point overhead lighting',
      'Use diffused light from multiple angles if possible',
      'Minimize shadows across the vial body',
      'Avoid reflective surfaces near the vial',
    ],
  },
};

// ----------------------------------------------------------------
// Scan Step Copy
// ----------------------------------------------------------------

export const SCAN_COPY = {
  prepare: {
    title: 'Prepare Your Vial',
    instruction: 'Select your scan type and complete the preparation checklist below.',
    profileHeading: 'Appearance Profile',
    profileSubheading: 'Select the profile that best describes what this vial is expected to look like. This affects how the analysis interprets color and clarity.',
    checklistHeading: 'Preparation Checklist',
    checklist: [
      'Exterior of vial is clean and dry',
      'Matte black and white background materials are ready',
      'Lighting is bright and even',
      'Vial has been gently swirled or inverted and allowed to settle',
      'Any air bubbles have cleared (wait 10–15 seconds)',
    ],
    powderChecklist: [
      'Vial is sealed and has NOT yet been reconstituted',
      'White or neutral background is placed behind the vial',
      'Lighting is bright and even — no shadows across the vial body',
      'Full vial body and powder puck (visible at bottom) are in frame',
    ],
  },

  whiteCapture: {
    title: 'White Background Capture',
    instruction: 'Place the vial upright and centered in front of the white background.',
    tips: [
      'Fill most of the frame with the vial',
      'Ensure the full vial body is visible',
      'White background should be clearly visible behind and around the vial',
      'Avoid glare on the vial face',
    ],
    countdownNote: 'Hold steady — capturing in',
  },

  powderCapture: {
    title: 'Powder Capture',
    instruction: 'Hold the vial upright on a white or neutral background. The powder puck at the bottom should be clearly visible.',
    tips: [
      'Vial should be upright — powder settled at bottom',
      'Use even, diffused light — no shadows across vial body',
      'Full vial body including the powder puck must be in frame',
      'Avoid glare on the glass surface',
    ],
    countdownNote: 'Hold steady — capturing in',
  },

  blackCapture: {
    title: 'Black Background Capture',
    instruction: 'Now switch to the black background — same position, same framing.',
    tips: [
      'Keep the same lighting and distance as the white background shot',
      'The black background reveals particles that may be invisible on white',
      'Ensure the full vial body is visible',
      'Avoid reflections on the vial face',
    ],
    countdownNote: 'Hold steady — capturing in',
  },

  labelCapture: {
    title: 'Label Capture',
    instruction: 'Rotate the vial to face the label directly toward the camera.',
    tips: [
      'Hold the vial against a neutral background',
      'Ensure the full label text is in frame and in focus',
      'Avoid glare covering the label',
      'Capture from straight-on, not at an angle',
    ],
    optional: 'Optional: take a second shot of the back label or detail area.',
  },

  review: {
    title: 'Review Captures',
    instruction: 'Check all captures before analysis. Retake any that are blurry, dark, or poorly framed.',
  },

  analysis: {
    title: 'Analyzing Captures',
    instruction: 'Running heuristic analysis on your captures…',
    note: 'Analysis runs locally on your device. No data is sent to a server.',
  },

  results: {
    title: 'Screening Result',
  },
};

// ----------------------------------------------------------------
// Result Copy
// ----------------------------------------------------------------

export const RESULT_COPY = {
  pass: {
    label: 'No Obvious Issues Detected',
    summary: 'No significant visual red flags were detected under these capture conditions.',
    caveat: 'A pass does not confirm safety, identity, purity, potency, or freedom from contamination.',
    action:
      'Physically inspect the vial directly before any use — examine under good lighting for particles, cloudiness, or damage. This result is a negative screen only and does not replace direct examination.',
  },
  review: {
    label: 'Review Recommended',
    summary: 'One or more findings require closer manual inspection before any use.',
    caveat: 'Suspicious findings or poor capture quality were detected. Do not rely on this result alone.',
    action:
      'Inspect the vial directly under good lighting. Consider retaking with improved lighting and focus. If in doubt, do not use.',
  },
  'do-not-use': {
    label: 'Visible Issues Flagged',
    summary: 'Multiple concerning visual findings were detected in these captures.',
    caveat: 'Multiple red flags detected. Do not proceed without thorough investigation.',
    action:
      'Do not use this vial until the concerns are resolved. Contact your supplier, review your documentation, or discard according to your protocols.',
  },
};

// ----------------------------------------------------------------
// Limitations Screen Copy
// ----------------------------------------------------------------

export const LIMITATIONS_COPY = {
  title: 'Screening Limitations',
  intro: 'Understanding what this tool can and cannot detect is essential to using it appropriately.',

  cannotTest: {
    heading: 'This Tool Cannot Test:',
    items: [
      { label: 'Identity', detail: 'Whether the compound is what the label states' },
      { label: 'Purity', detail: 'Chemical purity or absence of impurities' },
      { label: 'Potency', detail: 'Concentration, activity, or dosage accuracy' },
      { label: 'Sterility', detail: 'Freedom from microorganisms or bioburden' },
      { label: 'Endotoxins', detail: 'Bacterial endotoxin or pyrogen levels' },
      { label: 'Submicron particles', detail: 'Particles too small to see with a smartphone camera' },
      { label: 'Chemical degradation', detail: 'Oxidation, hydrolysis, or other invisible changes' },
    ],
  },

  difficultCases: {
    heading: 'Cases Where Accuracy Is Lower:',
    items: [
      'Dark-tinted or amber glass vials — particles may not be visible through the glass',
      'Colored or naturally turbid liquids — cloudiness may be expected, not a defect',
      'Suspensions and emulsions — intended to appear cloudy or particulate',
      'Lyophilized powders or cake products — appearance varies and is not a liquid clarity screen',
      'Very small vials (< 1mL) — difficult to frame and assess accurately',
      'Poor lighting, blur, glare, or motion in captures — reduces all analysis accuracy',
      'Labels printed over the glass body — interferes with clarity assessment',
    ],
  },

  appearanceProfiles: {
    heading: 'About Appearance Profiles:',
    items: [
      'Appearance profiles improve interpretation by adjusting what the analysis treats as expected vs. suspicious.',
      'A profile selection does not confirm the identity of the compound — a blue liquid is not confirmed to be GHK-Cu.',
      'Expected color can vary by product, preparation, concentration, and storage history.',
      'The Unknown/Custom profile is deliberately conservative — it reduces reliance on color and accepts a higher rate of Review results.',
      'Visual screening cannot replace laboratory testing regardless of the profile selected.',
    ],
  },

  passNote: {
    heading: 'What a "Pass" Result Means:',
    detail:
      'No obvious visual issue was detected in the captured images under these specific conditions. ' +
      'This does not mean the product is safe, authentic, uncontaminated, or fit for any intended use. ' +
      'A pass is a negative screening result only.',
  },

  recommendation: {
    heading: 'Recommended Approach:',
    detail:
      'Use PepScan as part of a multi-step visual inspection process. ' +
      'Always combine app-based screening with direct physical examination under good lighting, ' +
      'cross-reference with your supplier documentation, and follow your own research protocols.',
  },
};

// ----------------------------------------------------------------
// Navigation Labels
// ----------------------------------------------------------------

export const NAV = {
  home: 'Home',
  newScan: 'Start New Scan',
  history: 'Scan History',
  setupGuide: 'Setup Guide',
  limitations: 'Limitations',
  settings: 'Settings',
};
