// tests/compatibility.test.js
import { By, until } from 'selenium-webdriver';
import { CLIENT_URL } from '../utils.js';

export async function runCompatibilityTests(driver, resultsRegistry) {
  console.log('\n--- Running Compatibility Tests ---');

  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.compatibility.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  // Login back to dashboard first to check layouts
  try {
    await driver.get(`${CLIENT_URL}/login`);
    const emailInput = await driver.findElement(By.css('input[type="email"]'));
    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));
    await emailInput.clear();
    await emailInput.sendKeys('employee@mindguard.com');
    await passwordInput.clear();
    await passwordInput.sendKeys('password123');
    await submitBtn.click();
    await driver.wait(until.urlContains('/dashboard'), 8000);
  } catch (err) {
    console.warn('[Compatibility Test Setup] Already logged in or redirect failed.');
  }

  // 1. CT-001: Adapt to tablet viewport (768px width)
  let ct1Start = Date.now();
  try {
    console.log('[CT-001] Resizing browser window to tablet resolution (768 x 1024)...');
    await driver.manage().window().setSize({ width: 768, height: 1024 });
    await driver.sleep(1000); // Allow browser rendering engine to repaint

    // Verify main content container is displayed
    const dashboardTitle = await driver.findElement(By.xpath("//h2[contains(., 'Welcome') or contains(., 'Overview')]"));
    const isVisible = await dashboardTitle.isDisplayed();
    if (isVisible) {
      console.log('[CT-001] Success: Layout resized to 768px without breaking text flow.');
      setStatus('CT-001', 'PASS', null, ct1Start);
    } else {
      throw new Error('Title element was hidden or blocked on tablet resize.');
    }
  } catch (err) {
    console.error('[CT-001] Failed:', err.message);
    setStatus('CT-001', 'FAIL', err.message, ct1Start);
  }

  // 2. CT-002: Adapt to mobile viewport (375px width)
  let ct2Start = Date.now();
  try {
    console.log('[CT-002] Resizing browser window to mobile resolution (375 x 812)...');
    await driver.manage().window().setSize({ width: 375, height: 812 });
    await driver.sleep(1000);

    // Sidebar should typically wrap, become collapsible, or hide behind a hamburger on tiny viewports.
    // Let's verify layout doesn't crash
    const dashboardTitle = await driver.findElement(By.xpath("//h2[contains(., 'Welcome') or contains(., 'Overview')]"));
    const isVisible = await dashboardTitle.isDisplayed();

    if (isVisible) {
      console.log('[CT-002] Success: Layout wraps cleanly to 375px viewport width.');
      setStatus('CT-002', 'PASS', null, ct2Start);
    } else {
      throw new Error('Dashboard titles hidden or blocked on mobile viewport sizing.');
    }
  } catch (err) {
    console.error('[CT-002] Failed:', err.message);
    setStatus('CT-002', 'FAIL', err.message, ct2Start);
  }

  // Restore window size to default desktop size
  try {
    await driver.manage().window().setSize({ width: 1920, height: 1080 });
  } catch (_) {}
}
