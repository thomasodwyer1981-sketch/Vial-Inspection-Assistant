import type { ScanSession } from '@/types';
import { getHistoryForSampleName, loadSession } from '@/utils/storage';
import { RESULT_COPY } from '@/constants/copy';

function normalize(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase() ?? '';
}

/**
 * A repeat inspection needs the same named sample and scan type. When either
 * record has a batch/lot, both must have the same value; this prevents an
 * unrelated vial with the same sample name from being treated as a baseline.
 * Without a lot, comparison is explicitly name-and-mode based.
 */
export function matchesVialIdentity(current: ScanSession, candidate: ScanSession) {
  if (
    !normalize(current.metadata.peptideName) ||
    normalize(current.metadata.peptideName) !== normalize(candidate.metadata.peptideName) ||
    (current.metadata.scanMode ?? 'reconstituted') !== (candidate.metadata.scanMode ?? 'reconstituted')
  ) {
    return false;
  }

  const currentLot = normalize(current.metadata.batchLot);
  const candidateLot = normalize(candidate.metadata.batchLot);
  return currentLot || candidateLot ? currentLot !== '' && currentLot === candidateLot : true;
}

/** Returns assessed saved records that occurred before the selected inspection. */
export function getEarlierComparableSessions(current: ScanSession): ScanSession[] {
  const currentTime = new Date(current.createdAt).getTime();
  if (!Number.isFinite(currentTime) || !normalize(current.metadata.peptideName)) return [];

  return getHistoryForSampleName(current.metadata.peptideName, current.metadata.scanMode)
    .filter((item) => item.id !== current.id && item.assessmentOutcome !== 'unable-to-assess')
    .map((item) => loadSession(item.id))
    .filter((candidate): candidate is ScanSession =>
      Boolean(
        candidate?.analysisResult &&
        new Date(candidate.createdAt).getTime() < currentTime &&
        matchesVialIdentity(current, candidate),
      ),
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getObservedFindingChanges(baseline: ScanSession, current: ScanSession) {
  const normalizeFinding = (finding: string) => finding.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const previous = new Map(
    (baseline.analysisResult?.primaryReasons ?? []).map((finding) => [normalizeFinding(finding), finding]),
  );
  const now = new Map(
    (current.analysisResult?.primaryReasons ?? []).map((finding) => [normalizeFinding(finding), finding]),
  );
  return {
    added: [...now.entries()].filter(([key]) => !previous.has(key)).map(([, finding]) => finding),
    resolved: [...previous.entries()].filter(([key]) => !now.has(key)).map(([, finding]) => finding),
    unchanged: [...now.entries()].filter(([key]) => previous.has(key)).map(([, finding]) => finding),
  };
}

/** Short, evidence-led comparison context suitable for a PDF report. */
export function buildReportComparison(current: ScanSession, baseline: ScanSession) {
  const currentResult = current.analysisResult;
  const baselineResult = baseline.analysisResult;
  if (!currentResult || !baselineResult) return undefined;

  const findings = getObservedFindingChanges(baseline, current);
  const factorChanges = currentResult.categories
    .map((category) => {
      const previous = baselineResult.categories.find((candidate) => candidate.category === category.category);
      const delta = previous ? category.score - previous.score : 0;
      return previous && Math.abs(delta) > 5
        ? `${category.label}: ${delta > 0 ? '+' : ''}${delta} visual-score points.`
        : null;
    })
    .filter((change): change is string => Boolean(change));
  const observedChanges = [
    ...findings.added.slice(0, 2).map((finding) => `Newly recorded: ${finding}`),
    ...findings.resolved.slice(0, 2).map((finding) => `No longer recorded: ${finding}`),
    ...factorChanges.slice(0, 3),
  ];

  if (!observedChanges.length) observedChanges.push('No material saved finding or visual-score change was recorded.');
  return {
    baselineScannedAt: baseline.createdAt,
    baselineOutcome: baselineResult.assessmentOutcome === 'unable-to-assess'
      ? RESULT_COPY.unableToAssess.label
      : RESULT_COPY[baselineResult.triageResult].label,
    baselineConfidence: baselineResult.overallConfidence,
    observedChanges,
  };
}