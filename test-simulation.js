import { chromium } from 'playwright';

(async () => {
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('pageerror', (err) => {
      console.log('❌ PAGE ERROR:', err.message);
    });

    console.log('Loading dashboard...');
    await page.goto('http://localhost:8080/register', { waitUntil: 'domcontentloaded' });

    // Set auth token
    await page.evaluate(() => {
      localStorage.setItem(
        'pyw_user',
        JSON.stringify({
          id: 'u1',
          name: 'Test',
          phone: '9999999999',
          workType: 'Driver',
          weeklyIncome: 5000,
          city: 'Mumbai',
          token: 'dev-token',
        })
      );
    });

    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    console.log('✓ Dashboard loaded');

    // Click Simulate Rainstorm
    console.log('Clicking simulation button...');
    await page.click('button:has-text("Simulate Rainstorm")');
    console.log('✓ Simulation button clicked');

    // Wait for response and render
    await page.waitForTimeout(3000);

    // Check for error screen
    const hasErrorScreen = await page
      .locator('text=Dashboard temporarily unavailable')
      .isVisible()
      .catch(() => false);

    console.log('\n═══════════════════════════════════════');
    if (!hasErrorScreen) {
      console.log('✅ SUCCESS: Simulation works without crashing!');
      console.log('═══════════════════════════════════════');
    } else {
      console.log('❌ FAILURE: Crash detected - error screen shown');
      console.log('═══════════════════════════════════════');
      process.exitCode = 1;
    }

    await browser.close();
  } catch (err) {
    console.error('Test error:', err.message);
    process.exitCode = 1;
  }
})();
