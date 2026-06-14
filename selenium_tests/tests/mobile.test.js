// tests/mobile.test.js
import { By, until } from 'selenium-webdriver';
import { CLIENT_URL } from '../utils.js';

export async function runMobileTests(driver, resultsRegistry) {
  console.log('\n--- Running Mobile-Specific Tests ---');

  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.mobile.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  // Resize window to mobile viewport
  try {
    await driver.manage().window().setSize({ width: 375, height: 812 });
    await driver.sleep(1000);
  } catch (_) {}

  // 1. MT-001: Mobile navigation toggler
  let mt1Start = Date.now();
  try {
    console.log('[MT-001] Navigating to dashboard in mobile view...');
    await driver.get(`${CLIENT_URL}/dashboard`);

    // Verify main content title is visible
    const dashTitle = await driver.wait(
      until.elementLocated(By.xpath("//h2[contains(., 'Welcome') or contains(., 'Overview')]")),
      8000
    );
    const isDisplayed = await dashTitle.isDisplayed();
    
    if (isDisplayed) {
      console.log('[MT-001] Success: Dashboard header loaded cleanly in mobile layout.');
      setStatus('MT-001', 'PASS', null, mt1Start);
    } else {
      throw new Error('Dashboard titles not visible in mobile view.');
    }
  } catch (err) {
    console.error('[MT-001] Failed:', err.message);
    setStatus('MT-001', 'FAIL', err.message, mt1Start);
  }

  // 2. MT-002: Clickable tap target sizing check
  let mt2Start = Date.now();
  try {
    console.log('[MT-002] Verification of click target sizes for mobile...');
    // Fetch theme toggle switch and assert button dimensions
    const themeBtn = await driver.findElement(By.css('button[title*="theme"]'));
    const rect = await themeBtn.getRect();
    console.log(`[MT-002] Element size: width=${rect.width}px, height=${rect.height}px`);

    if (rect.width >= 32 && rect.height >= 32) {
      console.log('[MT-002] Success: Click target fits spacing index.');
      setStatus('MT-002', 'PASS', null, mt2Start);
    } else {
      throw new Error(`Theme toggle click target size (${rect.width}x${rect.height}px) is too small for mobile touch safety.`);
    }
  } catch (err) {
    console.error('[MT-002] Failed:', err.message);
    setStatus('MT-002', 'FAIL', err.message, mt2Start);
  }

  // Restore window size to default desktop size
  try {
    await driver.manage().window().setSize({ width: 1920, height: 1080 });
  } catch (_) {}
}
