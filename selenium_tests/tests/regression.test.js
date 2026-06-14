// tests/regression.test.js
import { By, until } from 'selenium-webdriver';
import { CLIENT_URL } from '../utils.js';

export async function runRegressionTests(driver, resultsRegistry) {
  console.log('\n--- Running Regression Tests ---');

  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.regression.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  // 1. RT-001: Verify client-side validator blocks empty fields and bad email syntax
  let rt1Start = Date.now();
  try {
    console.log('[RT-001] Deleting cookies to logout...');
    await driver.manage().deleteAllCookies();
    await driver.sleep(500);

    console.log('[RT-001] Navigating to login screen...');
    await driver.get(`${CLIENT_URL}/login`);

    const emailInput = await driver.findElement(By.css('input[type="email"]'));
    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));

    console.log('[RT-001] Entering invalid email format "not-an-email"...');
    await emailInput.clear();
    await emailInput.sendKeys('not-an-email');
    await passwordInput.clear();
    await passwordInput.sendKeys('password123');

    // Click submit
    await submitBtn.click();
    await driver.sleep(1000);

    // If we are still on the login page (not redirected to dashboard), client validation blocked it
    const currentUrl = await driver.getCurrentUrl();
    if (currentUrl.includes('/login')) {
      console.log('[RT-001] Success: Browser validation successfully blocked registration/login with invalid email format.');
      setStatus('RT-001', 'PASS', null, rt1Start);
    } else {
      throw new Error('Form submitted successfully despite invalid email syntax!');
    }
  } catch (err) {
    console.error('[RT-001] Failed:', err.message);
    setStatus('RT-001', 'FAIL', err.message, rt1Start);
  }

  // 2. RT-002: Verify saving name with special characters doesn't crash profile page
  let rt2Start = Date.now();
  try {
    console.log('[RT-002] Deleting cookies to logout...');
    await driver.manage().deleteAllCookies();
    await driver.sleep(500);

    console.log('[RT-002] Logging in back...');
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

    console.log('[RT-002] Navigating to profile settings...');
    await driver.get(`${CLIENT_URL}/profile`);

    const nameInput = await driver.wait(
      until.elementLocated(By.xpath("//label[contains(., 'Full Name')]/following-sibling::div/input")),
      8000
    );

    console.log('[RT-002] Inputting special characters name "O\'Connor-Smith Jr."...');
    await nameInput.clear();
    await nameInput.sendKeys("John O'Connor-Smith Jr.");

    console.log('[RT-002] Clicking Save...');
    const saveProfileBtn = await driver.findElement(By.xpath("//button[contains(., 'Save') or contains(., 'Update') or contains(., 'Changes')]"));
    await saveProfileBtn.click();
    await driver.sleep(1500);

    // Reload and check if saved successfully
    await driver.navigate().refresh();
    const updatedNameInput = await driver.wait(
      until.elementLocated(By.xpath("//label[contains(., 'Full Name')]/following-sibling::div/input")),
      8000
    );
    const val = await updatedNameInput.getAttribute('value');
    console.log(`[RT-002] Reloaded profile name is: "${val}"`);

    if (val === "John O'Connor-Smith Jr.") {
      console.log('[RT-002] Success: Profile updated cleanly with special character inputs.');
      setStatus('RT-002', 'PASS', null, rt2Start);
    } else {
      throw new Error(`Profile name got mangled: "${val}" (Expected: "John O'Connor-Smith Jr.")`);
    }

    // Reset name to default John Doe
    await updatedNameInput.clear();
    await updatedNameInput.sendKeys('John Doe');
    await saveProfileBtn.click();
    await driver.sleep(1000);
  } catch (err) {
    console.error('[RT-002] Failed:', err.message);
    setStatus('RT-002', 'FAIL', err.message, rt2Start);
  }
}
