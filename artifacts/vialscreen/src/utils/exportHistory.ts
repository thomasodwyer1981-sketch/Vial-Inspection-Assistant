/**
 * PepScan — history export (CSV summary, JSON backup) and backup import.
 */

import { getScanHistory, buildExportPayload, importExportPayload, type ExportPayload } from './storage';
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

function buildClosureCsv(payload: ExportPayload): string {
  const sessionsById = new Map(payload.sessions.map((session) => [session.id, session]));
  const header = [
    'Scan Date',
    'Purchase Date',
    'Peptide',
    'Vendor',
    'Batch / Lot',
    'Concentration',
    'Notes',
    'Scan Mode',
    'Historical Result — Do Not Rely On',
    'Confidence %',
    'Profile',
  ];
  const rows = payload.history.map((historyItem) => {
    const session = sessionsById.get(historyItem.id);
    const metadata = session?.metadata;
    return [
      new Date(historyItem.createdAt).toISOString(),
      metadata?.purchaseDate || '',
      metadata?.peptideName || historyItem.peptideName || '',
      metadata?.vendor || historyItem.vendor || '',
      metadata?.batchLot || '',
      metadata?.concentration || '',
      metadata?.notes || '',
      metadata?.scanMode || '',
      historyItem.triageResult,
      String(historyItem.overallConfidence),
      historyItem.appearanceProfile
        ? APPEARANCE_PROFILES[historyItem.appearanceProfile].label
        : '',
    ];
  });
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function write16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function write32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

function dosTimestamp(date: Date): { time: number; day: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    day: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** Create a standards-compliant, uncompressed ZIP without introducing a new SDK. */
function createZip(entries: Array<{ name: string; bytes: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  const { time, day } = dosTimestamp(new Date());
  let localOffset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const checksum = crc32(entry.bytes);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    write32(localView, 0, 0x04034b50);
    write16(localView, 4, 20);
    write16(localView, 6, 0x0800);
    write16(localView, 8, 0);
    write16(localView, 10, time);
    write16(localView, 12, day);
    write32(localView, 14, checksum);
    write32(localView, 18, entry.bytes.length);
    write32(localView, 22, entry.bytes.length);
    write16(localView, 26, name.length);
    write16(localView, 28, 0);
    local.set(name, 30);
    localParts.push(local, entry.bytes);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    write32(centralView, 0, 0x02014b50);
    write16(centralView, 4, 20);
    write16(centralView, 6, 20);
    write16(centralView, 8, 0x0800);
    write16(centralView, 10, 0);
    write16(centralView, 12, time);
    write16(centralView, 14, day);
    write32(centralView, 16, checksum);
    write32(centralView, 20, entry.bytes.length);
    write32(centralView, 24, entry.bytes.length);
    write16(centralView, 28, name.length);
    write16(centralView, 30, 0);
    write16(centralView, 32, 0);
    write16(centralView, 34, 0);
    write16(centralView, 36, 0);
    write32(centralView, 38, 0);
    write32(centralView, 42, localOffset);
    central.set(name, 46);
    centralParts.push(central);
    localOffset += local.length + entry.bytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  write32(endView, 0, 0x06054b50);
  write16(endView, 4, 0);
  write16(endView, 6, 0);
  write16(endView, 8, entries.length);
  write16(endView, 10, entries.length);
  write32(endView, 12, centralDirectory.length);
  write32(endView, 16, localOffset);
  write16(endView, 20, 0);
  return concatBytes([...localParts, centralDirectory, end]);
}

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; extension: string } | null {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) return null;
  const mime = match[1] || 'application/octet-stream';
  const extension =
    mime === 'image/png' ? 'png'
      : mime === 'image/webp' ? 'webp'
        : mime === 'image/gif' ? 'gif'
          : 'jpg';
  try {
    if (match[2]) {
      const binary = atob(match[3]);
      return { bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)), extension };
    }
    return { bytes: new TextEncoder().encode(decodeURIComponent(match[3])), extension };
  } catch {
    return null;
  }
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'scan';
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function saveClosureArchive(filename: string, bytes: Uint8Array): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) {
    downloadBlob(filename, new Blob([bytes as BlobPart], { type: 'application/zip' }));
    return;
  }

  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const written = await Filesystem.writeFile({
    path: filename,
    data: bytesToBase64(bytes),
    directory: Directory.Cache,
  });
  await Share.share({
    title: 'PepScan complete data export',
    text: 'Save this archive before PepScan closes on 15 October 2026.',
    url: written.uri,
    dialogTitle: 'Export all PepScan data',
  });
}

/**
 * Download one closure archive containing CSV, restorable JSON, and every
 * capture image still stored on this device. Older saved scans retain compact
 * thumbnails only; the app deliberately never persisted their originals.
 */
export async function exportClosureArchive(): Promise<void> {
  const payload = buildExportPayload();
  const encoder = new TextEncoder();
  const entries: Array<{ name: string; bytes: Uint8Array }> = [
    {
      name: 'README.txt',
      bytes: encoder.encode(
        'PepScan closure export\n\n' +
        'Created before PepScan closes on 15 October 2026.\n' +
        'Past scan results were visual screening outputs, not medical or safety advice. Do not rely on them.\n' +
        'The images folder contains every image still stored on this device. Older scans may contain thumbnails only because full-resolution originals were never retained after saving.\n',
      ),
    },
    { name: 'pepscan-history.csv', bytes: encoder.encode(buildClosureCsv(payload)) },
    { name: 'pepscan-backup.json', bytes: encoder.encode(JSON.stringify(payload, null, 2)) },
  ];

  for (const session of payload.sessions) {
    for (const capture of session.captures) {
      const source = capture.dataUrl || capture.thumbDataUrl;
      if (!source) continue;
      const image = decodeDataUrl(source);
      if (!image) continue;
      const sessionName = safeName(session.metadata.peptideName || session.id);
      const captureName = safeName(`${capture.background}-${capture.capturedAt || capture.id}`);
      entries.push({
        name: `images/${sessionName}-${safeName(session.id)}/${captureName}.${image.extension}`,
        bytes: image.bytes,
      });
    }
  }

  const zip = createZip(entries);
  await saveClosureArchive(`pepscan-complete-export-${stamp()}.zip`, zip);
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
