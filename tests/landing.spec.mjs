import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const landing = pathToFileURL(resolve('index.html')).href;

test('one button runs the guided order demo with dependent products and reset', async ({ page }) => {
  await page.goto(landing);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(1);
  await expect(page.locator('#events')).toHaveCount(0);
  await expect(page.locator('#product')).toBeDisabled();
  await page.locator('#install').click();
  const overlay = page.locator('#fix-dropdowns-overlay');
  const input = overlay.locator('input');
  const picker = overlay.locator('select');
  await input.fill('Clenergy');
  await input.press('Enter');
  const product = picker.locator('option').filter({ hasText: 'Product' });
  await expect(product).toHaveCount(1);
  await picker.selectOption(await product.getAttribute('value'));
  await input.fill('solar roof pro');
  await expect(overlay.locator('.result')).toHaveCount(2);
  await overlay.getByRole('option').filter({ hasText: 'Pantile' }).click();
  const country = picker.locator('option').filter({ hasText: 'Delivery country' });
  await picker.selectOption(await country.getAttribute('value'));
  await input.fill('United Kingdom');
  await input.press('Enter');
  await expect(page.locator('#order-title')).toContainText('complete');
  await expect(page.locator('#order-summary')).toContainText('Clenergy');
  await expect(page.locator('#order-summary')).toContainText('Pantile');
  await expect(page.locator('#order-summary')).toContainText('United Kingdom');
  await input.press('Escape');
  await page.locator('#reset-demo').click();
  await expect(page.locator('#manufacturer')).toHaveValue('');
  await expect(page.locator('#country')).toHaveValue('');
  await expect(page.locator('#product')).toBeDisabled();
  await expect(page.locator('#order-summary')).toHaveText('Choose a manufacturer to get started.');
});

test('manual installation copies the full self-contained address, including the prefix', async ({ page }) => {
  await page.goto(landing);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async value => { window.copiedAddress = value; } } });
  });
  await page.locator('details.manual summary').click();
  await page.locator('#copy-address').click();
  await expect(page.locator('#copy-status')).toContainText('Copied');
  const copied = await page.evaluate(() => window.copiedAddress);
  expect(copied).toBe(await page.locator('#install').getAttribute('href'));
  expect(copied.startsWith('javascript:')).toBe(true);
});

test('landing page and installation help fit narrow and desktop screens', async ({ page }) => {
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(landing);
    await page.locator('#setup details').first().locator('summary').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const help = page.locator('.browser-grid');
    await expect(help).toContainText('Chrome & Edge');
    await expect(help).toContainText('Firefox');
    await expect(help).toContainText('Safari on Mac');
  }
});
