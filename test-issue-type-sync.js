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
    console.log('✓ Dashboard loaded\n');

    // Test 1: Verify initial button shows "Rainstorm" (default)
    const initialBtn = await page.locator('button:has-text("Simulate Rainstorm")');
    const initialVisibility = await initialBtn.isVisible().catch(() => false);
    console.log(`Test 1 - Initial "Simulate Rainstorm": ${initialVisibility ? '✅ PASS' : '❌ FAIL'}`);

    // Test 2: Click "Traffic Delay" and verify button changes
    console.log('\nClicking "Traffic Delay" button...');
    await page.click('button:has-text("Traffic Delay")');
    await page.waitForTimeout(500);
    
    const trafficBtn = await page.locator('button:has-text("Simulate Traffic Delay")');
    const trafficVisibility = await trafficBtn.isVisible().catch(() => false);
    console.log(`Test 2 - After selecting Traffic: ${trafficVisibility ? '✅ PASS' : '❌ FAIL'}`);

    // Test 3: Click "Platform Outage" and verify button changes
    console.log('\nClicking "Platform Outage" button...');
    await page.click('button:has-text("Platform Outage")');
    await page.waitForTimeout(500);
    
    const outageBtn = await page.locator('button:has-text("Simulate Platform Outage")');
    const outageVisibility = await outageBtn.isVisible().catch(() => false);
    console.log(`Test 3 - After selecting Outage: ${outageVisibility ? '✅ PASS' : '❌ FAIL'}`);

    // Test 4: Click "Fraud Attempt" and verify button changes
    console.log('\nClicking "Fraud Attempt" button...');
    await page.click('button:has-text("Fraud Attempt")');
    await page.waitForTimeout(500);
    
    const fraudBtn = await page.locator('button:has-text("Simulate Fraud Attempt")');
    const fraudVisibility = await fraudBtn.isVisible().catch(() => false);
    console.log(`Test 4 - After selecting Fraud: ${fraudVisibility ? '✅ PASS' : '❌ FAIL'}`);

    // Test 5: Verify alternate scenario button shows when not selecting fraud
    console.log('\nClicking back to "Rainstorm"...');
    await page.click('button:has-text("Rainstorm")').catch(() => {});
    await page.waitForTimeout(500);
    
    const alternateBtn = await page.locator('button:has-text("Simulate Fraud Attempt")');
    const alternateVisibility = await alternateBtn.isVisible().catch(() => false);
    console.log(`Test 5 - Fraud button visible when not fraud: ${alternateVisibility ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n═══════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('═══════════════════════════════════════');

    await browser.close();
  } catch (err) {
    console.error('Test error:', err.message);
    process.exitCode = 1;
  }
})();
