import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const demo = pathToFileURL(resolve('tests.html')).href;
const overlay = page => page.locator('#fix-dropdowns-overlay');
const search = page => overlay(page).locator('input');
const picker = page => overlay(page).locator('select');
async function open(page) {
  await page.goto(demo);
  await page.locator('#install').click();
  await expect(overlay(page)).toHaveCount(1);
}
async function field(page, name) {
  const option = picker(page).locator('option').filter({ hasText: name }).first();
  await expect(option).toHaveCount(1);
  await picker(page).selectOption(await option.getAttribute('value'));
}

test('live compatibility checks pass using the real bookmarklet without network requests', async ({ page }) => {
  await page.goto(demo);
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.getByRole('button', { name: 'Run demo checks' }).click();
  await expect(page.locator('#checks-status strong')).toHaveText('6/6 checks passed');
  expect(requests).toEqual([]);
});

test('one dropdown per search, preserving its native events and the current query', async ({ page }) => {
  await open(page);
  await expect(picker(page)).toHaveValue('1');
  await search(page).fill('France');
  await expect(overlay(page).locator('.result')).toHaveCount(0);
  await field(page, 'Country');
  await search(page).fill('France');
  await overlay(page).getByRole('option', { name: 'France', exact: true }).click();
  await expect(page.locator('#country')).toHaveValue('item-2');
  await expect(search(page)).toHaveValue('France');
  await expect(overlay(page).locator('.selected')).toHaveText('✓ Selected');
  await expect(page.locator('#events')).toContainText('input: country = France');
  await expect(page.locator('#events')).toContainText('change: country = France');
});

test('dependent dropdowns and replacement options are scanned while open', async ({ page }) => {
  await open(page);
  await search(page).fill('clenergy');
  await search(page).press('Enter');
  await field(page, 'Product');
  await search(page).fill('solar roof pro');
  await expect(overlay(page).locator('.result')).toHaveCount(2);
  await search(page).press('Enter');
  await expect(page.locator('#product')).toHaveValue('item-1');
  await field(page, 'Manufacturer');
  await search(page).fill('ja solar');
  await search(page).press('Enter');
  await field(page, 'Product');
  await search(page).fill('ja 440');
  await search(page).press('Enter');
  await expect(page.locator('#product option:checked')).toHaveText('JA Solar JAM54D41-440/LB');
});

test('grouped options support accents and typo matching while unavailable controls stay out', async ({ page }) => {
  await open(page);
  const names = await picker(page).locator('option').allTextContents();
  expect(names.join('|')).not.toMatch(/Small dropdown|Multiple selection|Disabled equipment|Custom colour/);
  await field(page, 'Grouped equipment');
  await search(page).fill('unavailable');
  await expect(overlay(page).locator('.result')).toHaveCount(0);
  await search(page).fill('cafe');
  await search(page).press('Enter');
  await expect(page.locator('#grouped')).toHaveValue('cafe');
  await field(page, 'Country');
  await search(page).fill('frnce');
  await expect(overlay(page).locator('.result').first()).toContainText('France');
});

test('new large dropdowns, stale options, and styled wrappers', async ({ page }) => {
  await open(page);
  await field(page, 'Warehouse');
  await search(page).fill('warehouse 17');
  await search(page).press('Enter');
  await expect(page.locator('#wrapped-trigger')).toHaveText('Warehouse 17 ▾');
  await page.locator('#add-dynamic').evaluate(button => button.click());
  await field(page, 'Part number');
  await expect(overlay(page).locator('.result')).toHaveCount(60);
  await search(page).fill('ZX-0999');
  await search(page).press('Enter');
  await expect(page.locator('#dynamic')).toHaveValue('item-1000');
  // Remove an option and click its old result before the observer's scheduled render.
  await page.evaluate(() => {
    document.querySelector('#dynamic').lastElementChild.remove();
    document.querySelector('#fix-dropdowns-overlay').shadowRoot.querySelector('.result').click();
  });
  await expect(overlay(page).locator('.message')).toHaveText('That option changed. Search again.');
  await expect(overlay(page).locator('.option').filter({ hasText: /^Part ZX-0999$/ })).toHaveCount(0);
  await expect(page.locator('#dynamic')).not.toHaveValue('item-1000');
});

test('mouse dragging stays inside viewport and search keeps the panel position', async ({ page }) => {
  await open(page);
  const panel = overlay(page).locator('.panel');
  const head = await overlay(page).locator('.head').boundingBox();
  const before = await panel.boundingBox();
  await page.mouse.move(head.x + 60, head.y + 20);
  await page.mouse.down();
  await page.mouse.move(head.x - 260, head.y + 150, { steps: 8 });
  await page.mouse.up();
  const moved = await panel.boundingBox();
  expect(moved.x).toBeLessThan(before.x - 250);
  expect(moved.y).toBeGreaterThan(before.y + 100);
  await search(page).fill('clenergy');
  expect(await panel.boundingBox()).toEqual(moved);
  const newHead = await overlay(page).locator('.head').boundingBox();
  await page.mouse.move(newHead.x + 60, newHead.y + 20);
  await page.mouse.down();
  await page.mouse.move(0, 0, { steps: 8 });
  await page.mouse.up();
  const clamped = await panel.boundingBox();
  expect(clamped.x).toBeGreaterThanOrEqual(8);
  expect(clamped.y).toBeGreaterThanOrEqual(8);
  await page.setViewportSize({ width: 360, height: 640 });
  const resized = await panel.boundingBox();
  expect(resized.x + resized.width).toBeLessThanOrEqual(352);
  expect(resized.y + resized.height).toBeLessThanOrEqual(632);
});

test('touch dragging moves the panel on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  const panel = overlay(page).locator('.panel');
  const head = await overlay(page).locator('.head').boundingBox();
  const before = await panel.boundingBox();
  const cdp = await page.context().newCDPSession(page);
  const x = head.x + 60, y = head.y + 20;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 130 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const after = await panel.boundingBox();
  expect(after.y).toBeGreaterThan(before.y + 100);
  expect(after.x + after.width).toBeLessThanOrEqual(390);
});

test('keyboard selection, close button and repeated activation', async ({ page }) => {
  await open(page);
  await search(page).press('Enter');
  await expect(page.locator('#manufacturer')).toHaveValue('');
  await search(page).press('ArrowDown');
  await expect(search(page)).toHaveAttribute('aria-activedescendant', 'fd-option-0');
  await search(page).press('Enter');
  await expect(page.locator('#manufacturer')).not.toHaveValue('');
  await page.locator('#install').evaluate(link => link.click());
  await expect(overlay(page)).toHaveCount(1);
  await overlay(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(overlay(page)).toHaveCount(0);
  await page.locator('#install').evaluate(link => link.click());
  await search(page).press('Escape');
  await expect(overlay(page)).toHaveCount(0);
});
