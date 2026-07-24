/**
 * PepScan — history export (CSV summary, JSON backup) and backup import.
 */

import { getScanHistory, buildExportPayload, importExportPayload } from './storage';
import { APPEARANCE_PROFILES } from '../types';

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Spreadsheet-friendly summary of all scans. */
export function exportHistoryCsv(): void {
  const history = getScanHistory();
  const header = ['Date', 'Peptide', 'Vendor', 'Result', 'Confidence %', 'Profile'];
  const rows = history.map((h) => [
    new Date(h.createdAt).toISOString(),
    h.peptideName || '',
    h.vendor || '',
    h.triageResult,
    String(h.overallConfidence),
    h.appearanceProfile ? APPEARANCE_PROFILES[h.appearanceProfile].label : '',
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map(csvEscape).join(','))
    .join('\n');
  downloadBlob(`pepscan-history-${stamp()}.csv`, new Blob([csv], { type: 'text/csv' }));
}

/** Full-fidelity JSON backup (restorable via importHistoryFile). */
export function exportHistoryJson(): void {
  const payload = buildExportPayload();
  downloadBlob(
    `pepscan-backup-${stamp()}.json`,
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
}

/** Read a backup file and merge it into local history. */
export async function importHistoryFile(file: File): Promise<{ imported: number; skipped: number }> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Not a PepScan backup file.');
  }
  return importExportPayload(parsed);
}
