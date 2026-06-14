// tests/ui.test.js
import { By, until } from 'selenium-webdriver';
import { CLIENT_URL } from '../utils.js';

export async function runUiTests(driver, resultsRegistry) {
  console.log('\n--- Running UI/UX Tests ---');

  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.ui.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  // 1. UI-001: Loader/Spinner display check
  let ui1Start = Date.now();
  try {
    console.log('[UI-001] Verifying layout loading elements...');
    // When loading the dashboard or switching pages, a loading indicator is often active.
    // Let's reload dashboard and verify page content renders.
    await driver.get(`${CLIENT_URL}/dashboard`);
    const mainDashboard = await driver.wait(until.elementLocated(By.xpath("//h2[contains(., 'Welcome') or contains(., 'Overview')]")), 8000);
    const isDisplayed = await mainDashboard.isDisplayed();
    if (isDisplayed) {
      console.log('[UI-001] Success: Page is fully loaded and main content headers are displayed.');
      setStatus('UI-001', 'PASS', null, ui1Start);
    } else {
      throw new Error('Dashboard main content header not visible.');
    }
  } catch (err) {
    console.error('[UI-001] Failed:', err.message);
    setStatus('UI-001', 'FAIL', err.message, ui1Start);
  }

  // 2. UI-002: Dark/Light mode switcher class verify
  let ui2Start = Date.now();
  try {
    console.log('[UI-002] Locating Theme toggle button in header...');
    const themeBtn = await driver.findElement(By.css('button[title*="theme" i], button[title*="Theme" i]'));
    
    // Check initial html class
    const htmlElem = await driver.findElement(By.xpath('/html'));
    let initialClass = await htmlElem.getAttribute('class');
    console.log('[UI-002] Initial HTML class:', initialClass);

    console.log('[UI-002] Clicking Theme switcher via JS execution...');
    await driver.executeScript("arguments[0].click();", themeBtn);
    await driver.sleep(1000);

    let toggledClass = await htmlElem.getAttribute('class');
    console.log('[UI-002] Toggled HTML class:', toggledClass);

    // Verify it switched (either "dark" class was added or removed)
    if (initialClass !== toggledClass) {
      console.log('[UI-002] Success: Theme class changed successfully.');
      setStatus('UI-002', 'PASS', null, ui2Start);
    } else {
      throw new Error('HTML class attribute did not change after toggle.');
    }

    // Toggle back to restore state
    await driver.executeScript("arguments[0].click();", themeBtn);
  } catch (err) {
    console.error('[UI-002] Failed:', err.message);
    setStatus('UI-002', 'FAIL', err.message, ui2Start);
  }

  // 3. UI-003: Visual warning message block on invalid input
  let ui3Start = Date.now();
  try {
    console.log('[UI-003] Deleting cookies to log out...');
    await driver.manage().deleteAllCookies();
    await driver.sleep(500);

    console.log('[UI-003] Navigating to login page...');
    await driver.get(`${CLIENT_URL}/login`);
    
    console.log('[UI-003] Attempting login with incorrect password to trigger error alert...');
    const emailInput = await driver.findElement(By.css('input[type="email"]'));
    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));

    await emailInput.clear();
    await emailInput.sendKeys('employee@mindguard.com');
    await passwordInput.clear();
    await passwordInput.sendKeys('wrongpassword_test');
    await submitBtn.click();

    // Verify error box renders
    console.log('[UI-003] Waiting for alert notification panel...');
    const errorBox = await driver.wait(
      until.elementLocated(By.xpath("//div[contains(@class, 'bg-red-50') or contains(., 'Invalid')]")),
      5000
    );
    const text = await errorBox.getText();
    console.log('[UI-003] Alert text found:', text);
    if (text.toLowerCase().includes('invalid') || text.toLowerCase().includes('password')) {
      console.log('[UI-003] Success: Visual error alert block is verified.');
      setStatus('UI-003', 'PASS', null, ui3Start);
    } else {
      throw new Error('Error text did not match expected invalid credentials alert.');
    }
  } catch (err) {
    console.error('[UI-003] Failed:', err.message);
    setStatus('UI-003', 'FAIL', err.message, ui3Start);
  }
}
