import { expect, test, type Page } from 'playwright/test';

const THUMBNAIL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl0m9EAAAAASUVORK5CYII=';

type SeedRecordOptions = {
  id: string;
  createdAt: string;
  peptideName?: string;
  batchLot?: string;
  scanMode?: 'reconstituted' | 'powder';
  assessmentOutcome?: 'assessed' | 'unable-to-assess';
  confidence?: number;
  primaryReasons?: string[];
  categoryScore?: number;
  notes?: string;
};

function record(options: SeedRecordOptions) {
  const assessmentOutcome = options.assessmentOutcome ?? 'assessed';
  const peptideName = options.peptideName ?? 'Semaglutide Regression Fixture';
  const batchLot = options.batchLot ?? 'LOT-MATCH';
  const categoryScore = options.categoryScore ?? 72;

  return {
    id: options.id,
    createdAt: options.createdAt,
    updatedAt: options.createdAt,
    currentStep: 5,
    disclaimerAcknowledged: true,
    metadata: {
      peptideName,
      vendor: 'Fixture Pharmacy',
      batchLot,
      concentration: '10 mg/mL',
      purchaseDate: '2026-03-01',
      notes: options.notes ?? 'Fixture note: inspect vial label before use.',
      appearanceProfile: 'glp1-clear',
      scanMode: options.scanMode ?? 'reconstituted',
      reconstitutedAt: '1-8h',
    },
    captures: [
      {
        id: `${options.id}-white`,
        background: 'white',
        dataUrl: '',
        thumbDataUrl: THUMBNAIL,
        width: 1,
        height: 1,
        capturedAt: options.createdAt,
      },
      {
        id: `${options.id}-black`,
        background: 'black',
        dataUrl: '',
        thumbDataUrl: THUMBNAIL,
        width: 1,
        height: 1,
        capturedAt: options.createdAt,
      },
    ],
    analysisResult: {
      triageResult: 'review',
      overallConfidence: options.confidence ?? 72,
      assessmentOutcome,
      qualityDegraded: assessmentOutcome === 'unable-to-assess',
      qualityBlockers: assessmentOutcome === 'unable-to-assess'
        ? [{
            code: 'excessive-glare',
            background: 'white',
            title: 'White-background photo has excessive glare',
            instruction: 'Retake the white-background photo with the light moved off-axis.',
          }]
        : [],
      primaryReasons: options.primaryReasons ?? ['Fixture finding: visible haze should be reviewed.'],
      categories: [{
        category: 'clarity',
        label: 'Clarity and haze',
        score: categoryScore,
        status: 'review',
        explanation: 'Fixture factor explanation: mild haze is visible in the saved image.',
        method: 'fixture',
      }],
      ocrText: 'SEMAGLUTIDE 10 mg/mL · LOT-MATCH',
      profileUsed: 'glp1-clear',
    },
    finalized: true,
  };
}

function historyItem(session: ReturnType<typeof record>) {
  return {
    id: session.id,
    createdAt: session.createdAt,
    triageResult: session.analysisResult.triageResult,
    peptideName: session.metadata.peptideName,
    vendor: session.metadata.vendor,
    overallConfidence: session.analysisResult.overallConfidence,
    assessmentOutcome: session.analysisResult.assessmentOutcome,
    thumbnailDataUrl: THUMBNAIL,
    appearanceProfile: session.metadata.appearanceProfile,
    scanMode: session.metadata.scanMode,
  };
}

async function seedRecords(page: Page, sessions: ReturnType<typeof record>[], pro = false) {
  await page.addInitScript(({ sessions, pro }) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('vialscreen:onboarding', JSON.stringify({
      completed: true,
      disclaimerAcknowledgedAt: '2026-01-01T00:00:00.000Z',
    }));
    localStorage.setItem('vialscreen:history', JSON.stringify(
      sessions
        .map((session) => ({
          id: session.id,
          createdAt: session.createdAt,
          triageResult: session.analysisResult.triageResult,
          peptideName: session.metadata.peptideName,
          vendor: session.metadata.vendor,
          overallConfidence: session.analysisResult.overallConfidence,
          assessmentOutcome: session.analysisResult.assessmentOutcome,
          thumbnailDataUrl: session.captures[0].thumbDataUrl,
          appearanceProfile: session.metadata.appearanceProfile,
          scanMode: session.metadata.scanMode,
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    ));
    for (const session of sessions) {
      localStorage.setItem(`vialscreen:session:${session.id}`, JSON.stringify(session));
    }
    if (pro) {
      localStorage.setItem('vialscreen:pro:membershipId', 'e2e-pro-membership');
      localStorage.setItem('vialscreen:pro:verifiedAt', Date.now().toString());
    }
  }, { sessions, pro });
}

function extractPdfText(pdf: string) {
  const literalText = [...pdf.matchAll(/\((?:\\.|[^\\()])*\)\s*Tj/g)]
    .map(([match]) => match.slice(1, match.lastIndexOf(')')))
    .join('\n')
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t');

  return `${pdf}\n${literalText}`;
}

test('free saved detail keeps visual-factor evidence and PDF reporting behind Pro', async ({ page }) => {
  const current = record({
    id: 'detail-free',
    createdAt: '2026-04-03T10:00:00.000Z',
  });
  const earlierMatch = record({
    id: 'detail-free-earlier-match',
    createdAt: '2026-04-02T10:00:00.000Z',
  });
  await seedRecords(page, [current, earlierMatch]);

  await page.goto(`/history/${current.id}`);

  await expect(page.getByRole('button', { name: 'PDF Report · Pro' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compare · Pro' })).toBeVisible();
  await expect(page.getByText('Detailed visual-factor record is a Pro feature')).toBeVisible();
  await expect(page.getByText('Fixture factor explanation: mild haze is visible in the saved image.')).not.toBeVisible();

  await page.getByRole('button', { name: 'PDF Report · Pro' }).click();
  await expect(page).toHaveURL(/\/upgrade$/);
});

test('Pro saved detail exposes the saved factor explanation and PDF action', async ({ page }) => {
  const current = record({
    id: 'detail-pro',
    createdAt: '2026-04-03T10:00:00.000Z',
  });
  await seedRecords(page, [current], true);

  await page.goto(`/history/${current.id}`);

  await expect(page.getByRole('button', { name: 'PDF Report' })).toBeVisible();
  await expect(page.getByText('Fixture factor explanation: mild haze is visible in the saved image.')).toBeVisible();
  await expect(page.getByText('Detailed visual-factor record is a Pro feature')).not.toBeVisible();
});

test('comparison offers only earlier records with the same name, mode, and batch/lot', async ({ page }) => {
  const current = record({
    id: 'comparison-current',
    createdAt: '2026-04-03T10:00:00.000Z',
    assessmentOutcome: 'unable-to-assess',
    primaryReasons: ['Current-only comparison marker'],
    categoryScore: 62,
  });
  const matchingNewest = record({
    id: 'matching-newest',
    createdAt: '2026-04-02T10:00:00.000Z',
    primaryReasons: ['Newest matching baseline marker'],
    categoryScore: 80,
  });
  const matchingOlder = record({
    id: 'matching-older',
    createdAt: '2026-04-01T10:00:00.000Z',
    primaryReasons: ['Older matching baseline marker'],
    categoryScore: 85,
  });
  const wrongLot = record({
    id: 'wrong-lot',
    createdAt: '2026-03-30T10:00:00.000Z',
    batchLot: 'LOT-OTHER',
    primaryReasons: ['Wrong lot baseline marker'],
  });
  const wrongMode = record({
    id: 'wrong-mode',
    createdAt: '2026-03-29T10:00:00.000Z',
    scanMode: 'powder',
    primaryReasons: ['Wrong mode baseline marker'],
  });
  const laterRecord = record({
    id: 'later-record',
    createdAt: '2026-04-04T10:00:00.000Z',
    primaryReasons: ['Later baseline marker'],
  });
  await seedRecords(page, [current, matchingNewest, matchingOlder, wrongLot, wrongMode, laterRecord], true);

  await page.goto(`/history/${current.id}/compare`);

  const options = page.locator('select option');
  await expect(options).toHaveCount(2);
  await expect(options).toHaveText([
    /Apr 2, 2026/,
    /Apr 1, 2026/,
  ]);
  await expect(page.getByText('Newest matching baseline marker')).toBeVisible();
  await expect(page.getByText('Wrong lot baseline marker')).not.toBeVisible();
  await expect(page.getByText('Wrong mode baseline marker')).not.toBeVisible();
  await expect(page.getByText('Later baseline marker')).not.toBeVisible();

  await page.locator('select').selectOption(matchingOlder.id);
  await expect(page.getByText('Older matching baseline marker')).toBeVisible();
  await expect(page.getByText('Newest matching baseline marker')).not.toBeVisible();
});

test('PDF report retains record metadata, evidence limitations, notes, disclaimer, and comparison changes', async ({ page }) => {
  const current = record({
    id: 'report-current',
    createdAt: '2026-04-03T10:00:00.000Z',
    assessmentOutcome: 'unable-to-assess',
    primaryReasons: ['Current-only report marker'],
    categoryScore: 62,
    notes: 'Fixture report note: use the archived capture only as visual evidence.',
  });
  const baseline = record({
    id: 'report-baseline',
    createdAt: '2026-04-02T10:00:00.000Z',
    primaryReasons: ['Baseline-only report marker'],
    categoryScore: 80,
  });
  await seedRecords(page, [current, baseline], true);
  await page.addInitScript(() => {
    const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      (window as Window & { __inspectionReportBlob?: Blob }).__inspectionReportBlob = blob;
      return originalCreateObjectUrl(blob);
    };
  });

  await page.goto(`/history/${current.id}`);
  await page.getByRole('button', { name: 'PDF Report' }).click();
  await expect.poll(() => page.evaluate(() => Boolean(
    (window as Window & { __inspectionReportBlob?: Blob }).__inspectionReportBlob,
  ))).toBe(true);

  const pdf = await page.evaluate(async () => {
    const blob = (window as Window & { __inspectionReportBlob?: Blob }).__inspectionReportBlob;
    if (!blob) throw new Error('Expected PDF report download was not created.');
    return await blob.text();
  });
  const text = extractPdfText(pdf);

  expect(text).toContain('Semaglutide Regression Fixture');
  expect(text).toContain('Fixture Pharmacy');
  expect(text).toContain('Batch / lot: LOT-MATCH');
  expect(text).toContain('Concentration: 10 mg/mL');
  expect(text).toContain('CAPTURE LIMITATIONS');
  expect(text).toContain('White-background photo has excessive glare');
  expect(text).toContain('KEY FINDINGS');
  expect(text).toContain('VISUAL FACTORS ASSESSED');
  expect(text).toContain('Clarity and haze');
  expect(text).toContain('Fixture factor explanation');
  expect(text).toContain('REPEAT-INSPECTION CONTEXT');
  expect(text).toContain('Current-only report marker');
  expect(text).toContain('Baseline-only report marker');
  expect(text).toContain('INSPECTOR NOTES');
  expect(text).toContain('Fixture report note');
  expect(text).toContain('IMPORTANT DISCLAIMER');
});

test('legacy oversized images are compacted without losing the saved record', async ({ page }) => {
  const legacy = record({
    id: 'legacy-storage-repair',
    createdAt: '2026-04-03T10:00:00.000Z',
    peptideName: 'Legacy Storage Fixture',
  });
  const orphan = record({
    id: 'orphan-storage-record',
    createdAt: '2026-04-02T10:00:00.000Z',
  });
  const oversizedImage = `data:image/jpeg;base64,${'A'.repeat(210_000)}`;

  await page.goto('/');
  await page.evaluate(({ legacy, legacyHistory, orphan, oversizedImage }) => {
    localStorage.clear();
    localStorage.setItem('vialscreen:onboarding', JSON.stringify({
      completed: true,
      disclaimerAcknowledgedAt: '2026-01-01T00:00:00.000Z',
    }));
    localStorage.setItem('vialscreen:history', JSON.stringify([
      { ...legacyHistory, thumbnailDataUrl: oversizedImage },
    ]));
    localStorage.setItem(`vialscreen:session:${legacy.id}`, JSON.stringify({
      ...legacy,
      captures: legacy.captures.map((capture) => ({ ...capture, dataUrl: oversizedImage })),
    }));
    localStorage.setItem(`vialscreen:session:${orphan.id}`, JSON.stringify({
      ...orphan,
      captures: orphan.captures.map((capture) => ({ ...capture, dataUrl: oversizedImage })),
    }));
  }, { legacy, legacyHistory: historyItem(legacy), orphan, oversizedImage });

  await page.evaluate(async () => {
    const { repairLegacyStorage } = await import('/src/utils/storage.ts');
    repairLegacyStorage();
  });

  const repaired = await page.evaluate((legacyId) => {
    const history = JSON.parse(localStorage.getItem('vialscreen:history') ?? '[]');
    const session = JSON.parse(localStorage.getItem(`vialscreen:session:${legacyId}`) ?? 'null');
    return {
      thumbnailDataUrl: history[0]?.thumbnailDataUrl,
      captureDataUrl: session?.captures?.[0]?.dataUrl,
      orphanExists: localStorage.getItem('vialscreen:session:orphan-storage-record') !== null,
    };
  }, legacy.id);

  expect(repaired).toEqual({
    thumbnailDataUrl: null,
    captureDataUrl: '',
    orphanExists: false,
  });

  await page.goto('/history');
  await expect(page.getByText('Legacy Storage Fixture')).toBeVisible();
});

test('legacy repair removes oversized keys before rewriting when WebKit is at quota', async ({ page }) => {
  const legacy = record({
    id: 'webkit-quota-repair',
    createdAt: '2026-04-03T10:00:00.000Z',
    peptideName: 'WebKit Quota Fixture',
  });
  const oversizedImage = `data:image/jpeg;base64,${'A'.repeat(210_000)}`;

  await page.goto('/');
  const repaired = await page.evaluate(async ({ legacy, legacyHistory, oversizedImage }) => {
    localStorage.clear();
    localStorage.setItem('vialscreen:history', JSON.stringify([
      { ...legacyHistory, thumbnailDataUrl: oversizedImage },
    ]));
    localStorage.setItem(`vialscreen:session:${legacy.id}`, JSON.stringify({
      ...legacy,
      captures: legacy.captures.map((capture) => ({ ...capture, dataUrl: oversizedImage })),
    }));
    localStorage.setItem('vialscreen:active-session', JSON.stringify({
      ...legacy,
      captures: legacy.captures.map((capture) => ({ ...capture, dataUrl: oversizedImage })),
    }));

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function quotaSensitiveSetItem(key: string, value: string) {
      const existing = this.getItem(key);
      if (existing !== null && value.length < existing.length) {
        throw new DOMException(
          'A smaller replacement still needs the old key removed first.',
          'QuotaExceededError',
        );
      }
      return originalSetItem.call(this, key, value);
    };

    try {
      const { repairLegacyStorage } = await import('/src/utils/storage.ts');
      repairLegacyStorage();
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }

    const history = JSON.parse(localStorage.getItem('vialscreen:history') ?? '[]');
    const session = JSON.parse(localStorage.getItem(`vialscreen:session:${legacy.id}`) ?? 'null');
    const active = JSON.parse(localStorage.getItem('vialscreen:active-session') ?? 'null');
    return {
      thumbnailDataUrl: history[0]?.thumbnailDataUrl,
      captureDataUrl: session?.captures?.[0]?.dataUrl,
      activeCaptureDataUrl: active?.captures?.[0]?.dataUrl,
    };
  }, { legacy, legacyHistory: historyItem(legacy), oversizedImage });

  expect(repaired).toEqual({
    thumbnailDataUrl: null,
    captureDataUrl: '',
    activeCaptureDataUrl: '',
  });
});

test('final save proactively compacts a near-full legacy store and enforces the 100-record cap', async ({ page }) => {
  const current = record({
    id: 'current-after-storage-upgrade',
    createdAt: '2026-04-04T10:00:00.000Z',
    peptideName: 'Current Vial',
  });
  const oversizedImage = `data:image/jpeg;base64,${'A'.repeat(20_000)}`;

  await page.goto('/');
  const outcome = await page.evaluate(async ({ current, oversizedImage }) => {
    localStorage.clear();
    const oldRecords = Array.from({ length: 105 }, (_, index) => ({
      ...current,
      id: `legacy-${index}`,
      createdAt: new Date(Date.UTC(2026, 2, 1, 0, index)).toISOString(),
    }));
    localStorage.setItem('vialscreen:history', JSON.stringify(
      oldRecords.map((session) => ({
        id: session.id,
        createdAt: session.createdAt,
        triageResult: 'pass',
        peptideName: `Legacy ${session.id}`,
        vendor: '',
        overallConfidence: 80,
        thumbnailDataUrl: oversizedImage,
      })),
    ));
    for (const session of oldRecords.slice(0, 10)) {
      localStorage.setItem(`vialscreen:session:${session.id}`, JSON.stringify({
        ...session,
        captures: session.captures.map((capture: { dataUrl: string }) => ({
          ...capture,
          dataUrl: oversizedImage,
          thumbDataUrl: oversizedImage,
        })),
      }));
    }
    localStorage.setItem('vialscreen:session:orphan-large-record', JSON.stringify({
      ...current,
      id: 'orphan-large-record',
      captures: current.captures.map((capture: { dataUrl: string }) => ({
        ...capture,
        dataUrl: `data:image/jpeg;base64,${'B'.repeat(350_000)}`,
        thumbDataUrl: oversizedImage,
      })),
    }));

    const originalSetItem = Storage.prototype.setItem;
    const quotaChars = Array.from({ length: localStorage.length }, (_, index) => {
      const key = localStorage.key(index);
      return key ? key.length + (localStorage.getItem(key)?.length ?? 0) : 0;
    }).reduce((sum, size) => sum + size, 0) + 5_000;
    Storage.prototype.setItem = function cappedSetItem(key: string, value: string) {
      const existingLength = this.getItem(key)?.length ?? 0;
      const used = Array.from({ length: this.length }, (_, index) => {
        const storedKey = this.key(index);
        return storedKey ? storedKey.length + (this.getItem(storedKey)?.length ?? 0) : 0;
      }).reduce((sum, size) => sum + size, 0);
      if (used - existingLength + value.length > quotaChars) {
        throw new DOMException('Simulated WebKit quota reached.', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };

    try {
      const { saveFinalizedSession } = await import('/src/utils/storage.ts');
      const saved = saveFinalizedSession(current);
      const history = JSON.parse(localStorage.getItem('vialscreen:history') ?? '[]');
      const savedDetail = JSON.parse(
        localStorage.getItem(`vialscreen:session:${current.id}`) ?? 'null',
      );
      return {
        saved,
        historyCount: history.length,
        firstId: history[0]?.id,
        oversizedThumbnails: history.filter(
          (item: { thumbnailDataUrl?: string }) => (item.thumbnailDataUrl?.length ?? 0) > 12_000,
        ).length,
        detailHasFullImage: Boolean(savedDetail?.captures?.some(
          (capture: { dataUrl?: string }) => capture.dataUrl,
        )),
      };
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  }, { current, oversizedImage });

  expect(outcome).toEqual({
    saved: true,
    historyCount: 100,
    firstId: current.id,
    oversizedThumbnails: 0,
    detailHasFullImage: false,
  });
});

test('final save releases the duplicate active-session copy before writing detail', async ({ page }) => {
  const current = record({
    id: 'active-session-quota-release',
    createdAt: '2026-04-04T11:00:00.000Z',
    peptideName: 'Active Session Quota Fixture',
  });

  await page.goto('/');
  const outcome = await page.evaluate(async (current) => {
    localStorage.clear();
    const active = JSON.stringify(current);
    localStorage.setItem('vialscreen:active-session', active);
    localStorage.setItem('quota-padding', 'P'.repeat(40_000));

    const originalSetItem = Storage.prototype.setItem;
    const quotaChars = Array.from({ length: localStorage.length }, (_, index) => {
      const key = localStorage.key(index);
      return key ? key.length + (localStorage.getItem(key)?.length ?? 0) : 0;
    }).reduce((sum, size) => sum + size, 0) + 500;

    Storage.prototype.setItem = function cappedSetItem(key: string, value: string) {
      const existingLength = this.getItem(key)?.length ?? 0;
      const used = Array.from({ length: this.length }, (_, index) => {
        const storedKey = this.key(index);
        return storedKey ? storedKey.length + (this.getItem(storedKey)?.length ?? 0) : 0;
      }).reduce((sum, size) => sum + size, 0);
      if (used - existingLength + value.length > quotaChars) {
        throw new DOMException('Simulated WebKit quota reached.', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };

    try {
      const { saveFinalizedSession } = await import('/src/utils/storage.ts');
      const saved = saveFinalizedSession(current);
      return {
        saved,
        activeExists: localStorage.getItem('vialscreen:active-session') !== null,
        detailExists: localStorage.getItem(`vialscreen:session:${current.id}`) !== null,
        historyIds: JSON.parse(localStorage.getItem('vialscreen:history') ?? '[]')
          .map((item: { id: string }) => item.id),
      };
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  }, current);

  expect(outcome).toEqual({
    saved: true,
    activeExists: false,
    detailExists: true,
    historyIds: [current.id],
  });
});

test('save diagnostics distinguish a History-index failure from a detail failure', async ({ page }) => {
  const current = record({ id: 'history-write-failure' });

  await page.goto('/');
  const failure = await page.evaluate(async (current) => {
    localStorage.clear();
    localStorage.setItem('vialscreen:active-session', JSON.stringify(current));
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function rejectHistory(key: string, value: string) {
      if (key === 'vialscreen:history') {
        throw new DOMException('History write blocked.', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };

    try {
      const { getLastSaveFailure, saveFinalizedSession } = await import('/src/utils/storage.ts');
      const saved = saveFinalizedSession(current);
      return {
        saved,
        failure: getLastSaveFailure(),
        detailExists: localStorage.getItem(`vialscreen:session:${current.id}`) !== null,
        activeExists: localStorage.getItem('vialscreen:active-session') !== null,
      };
    } finally {
      Storage.prototype.setItem = originalSetItem;
    }
  }, current);

  expect(failure).toEqual({
    saved: false,
    failure: {
      stage: 'history',
      kind: 'quota',
      errorName: 'QuotaExceededError',
    },
    detailExists: false,
    activeExists: true,
  });
});

test('Sentry keeps native Capacitor localhost events and drops browser localhost events', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { shouldDropSentryEvent } = await import('/src/lib/sentry.ts');
    return {
      nativeLocalhost: shouldDropSentryEvent('localhost', true),
      browserLocalhost: shouldDropSentryEvent('localhost', false),
      productionHost: shouldDropSentryEvent('pepscan.replit.app', false),
    };
  });

  expect(result).toEqual({
    nativeLocalhost: false,
    browserLocalhost: true,
    productionHost: false,
  });
});

test('pending save keeps the real failure classification after an app relaunch', async ({ page }) => {
  const current = {
    ...record({
      id: 'pending-history-after-relaunch',
      createdAt: '2026-04-04T12:00:00.000Z',
    }),
    pendingSave: true,
    pendingSaveFailure: {
      stage: 'history' as const,
      kind: 'quota' as const,
      errorName: 'QuotaExceededError',
    },
  };

  await page.goto('/');
  await page.evaluate((current) => {
    localStorage.clear();
    localStorage.setItem('vialscreen:onboarding', JSON.stringify({
      completed: true,
      disclaimerAcknowledgedAt: '2026-01-01T00:00:00.000Z',
    }));
    localStorage.setItem('vialscreen:active-session', JSON.stringify(current));
  }, current);

  await page.goto('/scan');
  await expect(page.getByText('Scan could not be saved')).toBeVisible();
  await expect(page.getByText(/could not store the History entry/)).toBeVisible();
  await expect(page.getByText(/record details because/)).toHaveCount(0);
});

test('denied iOS Photos access shows Settings guidance without changing the inspection record', async ({ page }) => {
  const current = {
    ...record({
      id: 'photos-denied-record',
      createdAt: '2026-04-03T10:00:00.000Z',
      peptideName: 'Photos Permission Fixture',
    }),
    currentStep: 6,
    pendingSave: true,
  };
  const currentHistory = historyItem(current);

  await page.addInitScript(({ current, currentHistory }) => {
    localStorage.clear();
    localStorage.setItem('vialscreen:onboarding', JSON.stringify({
      completed: true,
      disclaimerAcknowledgedAt: '2026-01-01T00:00:00.000Z',
    }));
    localStorage.setItem('vialscreen:active-session', JSON.stringify(current));
    localStorage.setItem('vialscreen:history', JSON.stringify([currentHistory]));
    localStorage.setItem(`vialscreen:session:${current.id}`, JSON.stringify(current));

    Object.defineProperty(window, 'webkit', {
      configurable: true,
      value: { messageHandlers: { bridge: { postMessage: () => undefined } } },
    });
    Object.defineProperty(window, 'Capacitor', {
      configurable: true,
      writable: true,
      value: {
        PluginHeaders: [
          {
            name: 'PepScanPhotos',
            methods: [{ name: 'saveImageToPhotos', rtype: 'promise' }],
          },
          {
            name: 'App',
            methods: [
              { name: 'addListener', rtype: 'callback' },
              { name: 'removeListener', rtype: 'promise' },
              { name: 'minimizeApp', rtype: 'promise' },
            ],
          },
          {
            name: 'Haptics',
            methods: [
              { name: 'impact', rtype: 'promise' },
              { name: 'notification', rtype: 'promise' },
            ],
          },
        ],
        nativePromise: (pluginName: string) => {
          if (pluginName === 'PepScanPhotos') {
            return Promise.reject({
              code: 'PERMISSION_DENIED',
              message: 'Photos access is denied.',
            });
          }
          return Promise.resolve({});
        },
        nativeCallback: () => Promise.resolve('test-callback'),
      },
    });
  }, { current, currentHistory });

  await page.goto('/scan');
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();

  const before = await page.evaluate((id) => ({
    history: localStorage.getItem('vialscreen:history'),
    detail: localStorage.getItem(`vialscreen:session:${id}`),
  }), current.id);

  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('button', { name: 'Save to Photos' }).click();

  await expect(page.getByText(
    'Photos access is off. Open Settings → PepScan → Photos and allow adding photos, then try again. Your saved vial record is unchanged.',
  )).toBeVisible();

  const after = await page.evaluate((id) => ({
    history: localStorage.getItem('vialscreen:history'),
    detail: localStorage.getItem(`vialscreen:session:${id}`),
  }), current.id);
  expect(after).toEqual(before);
});

test('Share Image Card stays independent from direct Photos saving', async ({ page }) => {
  const current = {
    ...record({
      id: 'share-card-independent',
      createdAt: '2026-04-03T10:00:00.000Z',
      peptideName: 'Share Card Fixture',
    }),
    currentStep: 6,
    pendingSave: true,
  };

  await page.addInitScript((session) => {
    localStorage.clear();
    localStorage.setItem('vialscreen:onboarding', JSON.stringify({
      completed: true,
      disclaimerAcknowledgedAt: '2026-01-01T00:00:00.000Z',
    }));
    localStorage.setItem('vialscreen:active-session', JSON.stringify(session));

    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => false,
    });
    const originalCreateObjectURL = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      (window as Window & { __shareCardBlob?: Blob }).__shareCardBlob = blob;
      return originalCreateObjectURL(blob);
    };
  }, current);

  await page.goto('/scan');
  await expect(page.getByRole('button', { name: 'Share' })).toBeVisible();
  const activeBefore = await page.evaluate(
    () => localStorage.getItem('vialscreen:active-session'),
  );

  await page.getByRole('button', { name: 'Share' }).click();
  await page.getByRole('button', { name: 'Share Image Card' }).click();

  await expect.poll(() => page.evaluate(() => Boolean(
    (window as Window & { __shareCardBlob?: Blob }).__shareCardBlob,
  ))).toBe(true);
  const generated = await page.evaluate(() => {
    const blob = (window as Window & { __shareCardBlob?: Blob }).__shareCardBlob;
    return blob ? { type: blob.type, size: blob.size } : null;
  });
  expect(generated?.type).toBe('image/png');
  expect(generated?.size).toBeGreaterThan(0);
  await expect(page.getByText('Could not share the image. Try the text summary instead.')).not.toBeVisible();

  const activeAfter = await page.evaluate(
    () => localStorage.getItem('vialscreen:active-session'),
  );
  expect(activeAfter).toBe(activeBefore);
});