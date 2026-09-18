import type { LabelIntelligence, LabelMismatch } from '../types';

const EMPTY_LABEL_INTELLIGENCE: LabelIntelligence = {
  lotBatch: null,
  expiry: null,
  manufacturerBrand: null,
  volumeConcentration: null,
  printedName: null,
  mismatch: null,
};

function cleanValue(value: string): string {
  return value
    .replace(/[|•]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:#\-–—]+|[\s;,.]+$/g, '')
    .trim()
    .slice(0, 120);
}

function normalized(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .replace(/o/g, '0')
    .replace(/[il]/g, '1')
    .replace(/s/g, '5');
}

function findValue(
  lines: string[],
  pattern: RegExp,
): string | null {
  for (const line of lines) {
    const match = line.match(pattern);
    const value = match?.[1] ? cleanValue(match[1]) : '';
    if (value) return value;
  }
  return null;
}

function findPrintedName(lines: string[]): string | null {
  const explicit = findValue(
    lines,
    /^(?:name|compound|product|peptide)\s*[:#\-–—]?\s*(.+)$/i,
  );
  if (explicit) return explicit;

  const candidate = lines.find((line) => {
    const value = cleanValue(line);
    if (value.length < 3 || value.length > 80) return false;
    if (/^(?:lot|batch|exp|expiry|best|use by|mfg|manufacturer|brand)\b/i.test(value)) return false;
    if (/\d+\s*(?:mg|mcg|µg|g|ml|iu|units?)\b/i.test(value)) return false;
    return /[a-z]{3,}/i.test(value) && !/^[\d\s./_-]+$/.test(value);
  });
  return candidate ? cleanValue(candidate) : null;
}

function findMismatch(
  text: string,
  expectedName: string | undefined,
  printedName: string | null,
): LabelMismatch | null {
  const expected = expectedName?.trim();
  if (!expected || text.trim().length < 3) return null;

  const expectedWords = expected
    .split(/\s+/)
    .map(normalized)
    .filter((word) => word.length >= 2);
  const textNorm = normalized(text);
  const matchingWords = expectedWords.filter((word) => textNorm.includes(word)).length;

  // A partial match is not enough evidence for a warning, especially for
  // labels that print only a short compound abbreviation.
  if (matchingWords > 0) return null;

  if (!printedName) return null;
  return {
    expectedName: expected,
    printedName,
  };
}

/**
 * Extracts only explicit label-like values from OCR. User-entered metadata is
 * intentionally not used as a fallback, so missing OCR stays "Not found".
 */
export function extractLabelIntelligence(
  ocrText: string | null | undefined,
  expectedName?: string | null,
): LabelIntelligence {
  if (!ocrText?.trim()) return { ...EMPTY_LABEL_INTELLIGENCE };

  const lines = ocrText
    .split(/\r?\n/)
    .map((line) => cleanValue(line))
    .filter(Boolean);
  if (lines.length === 0) return { ...EMPTY_LABEL_INTELLIGENCE };

  const lotBatch = findValue(
    lines,
    /^(?:lot|lot\s*(?:no|number)|batch|batch\s*(?:no|number)|l\/n|bn)\s*[:#\-–—]?\s*([a-z0-9][a-z0-9./_-]{1,})/i,
  );
  const expiry = findValue(
    lines,
    /^(?:exp|expiry|expires|best\s*[- ]?\s*before|use\s*by)\s*[:#\-–—]?\s*([a-z0-9][a-z0-9./-]{2,})/i,
  );
  const manufacturerBrand = findValue(
    lines,
    /^(?:manufacturer|manufactured\s*by|mfg|brand|maker)\s*[:#\-–—]?\s*(.+)$/i,
  );
  const volumeMatches = [...ocrText.matchAll(
    /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|ug|g|ml|mL|l|iu|units?)\b(?:\s*\/\s*(?:mL|ml|L|vial))?/gi,
  )].map((match) => cleanValue(match[0]));
  const volumeConcentration = [...new Set(volumeMatches)].join(' · ') || null;
  const printedName = findPrintedName(lines);

  return {
    lotBatch,
    expiry,
    manufacturerBrand,
    volumeConcentration,
    printedName,
    mismatch: findMismatch(ocrText, expectedName ?? undefined, printedName),
  };
}