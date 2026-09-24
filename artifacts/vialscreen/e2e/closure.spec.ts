import { expect, test } from 'playwright/test';

const closingText = 'Scanning has been switched off. Pepscan is closing on 15 October 2026.';

test('all operational and result routes fail closed without a verdict or paywall', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('pepscan-closing-notice-shown', '1'));
  for (const path of ['/home', '/scan', '/history', '/history/example', '/history/example/compare', '/upgrade']) {
    await page.goto(path);
    await expect(page.getByText(closingText)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export all my data' })).toBeVisible();
    await expect(page.getByText(/pass|do not use|unlock pro|purchase/i)).toHaveCount(0);
  }
});

test('launch notice appears once per browser session and includes export', async ({ page }) => {
  await page.goto('/');

  const dialog = page.getByRole('dialog', { name: 'Pepscan is closing' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Please export anything you want to keep before then.');
  await expect(dialog.getByRole('button', { name: 'Export all my data' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Pepscan is closing' })).toHaveCount(0);
});

test('complete closure export downloads as a ZIP archive', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('pepscan-closing-notice-shown', '1'));
  await page.goto('/');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export all my data' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^pepscan-complete-export-\d{4}-\d{2}-\d{2}\.zip$/);
  const stream = await download.createReadStream();
  let bytes = 0;
  for await (const chunk of stream) bytes += chunk.length;
  expect(bytes).toBeGreaterThan(200);
});
