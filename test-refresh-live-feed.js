import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('pageerror', (error) => {
    console.log('PAGEERROR:', error.message);
  });

  await page.goto('http://localhost:8080/register', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('pyw_user', JSON.stringify({
      id: 'u1',
      name: 'Test',
      phone: '9999999999',
      workType: 'Driver',
      weeklyIncome: 5000,
      city: 'Mumbai',
      token: 'dev-token',
    }));
  });

  await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const refreshButton = page.locator('button:has-text("Refresh live feed")');
  await refreshButton.click();

  const loadingVisible = await page
    .locator('button:has-text("Refreshing live feed...")')
    .isVisible()
    .catch(() => false);

  await page.waitForTimeout(2200);

  const backToDefault = await page
    .locator('button:has-text("Refresh live feed")')
    .isVisible()
    .catch(() => false);

  const hasFallbackError = await page
    .locator('text=Dashboard temporarily unavailable')
    .isVisible()
    .catch(() => false);

  console.log('LOADING_STATE_VISIBLE:', loadingVisible);
  console.log('DEFAULT_LABEL_VISIBLE:', backToDefault);
  console.log('HAS_FALLBACK_ERROR:', hasFallbackError);

  await browser.close();
})();
