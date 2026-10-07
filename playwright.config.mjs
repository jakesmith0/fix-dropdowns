import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } },
  reporter: 'list',
});
