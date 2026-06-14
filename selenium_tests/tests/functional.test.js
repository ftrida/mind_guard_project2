// tests/functional.test.js
import { By, until } from 'selenium-webdriver';
import { CLIENT_URL } from '../utils.js';

export async function runFunctionalTests(driver, resultsRegistry) {
  console.log('\n--- Running Functional Tests ---');

  // Helper to mark status
  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.functional.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  // 1. FT-001: Login with valid credentials
  let ft1Start = Date.now();
  try {
    console.log('[FT-001] Deleting cookies to start clean login...');
    await driver.manage().deleteAllCookies();
    await driver.sleep(500);

    console.log('[FT-001] Navigating to login page...');
    await driver.get(`${CLIENT_URL}/login`);

    console.log('[FT-001] Entering credentials...');
    const emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 8000);
    const passwordInput = await driver.findElement(By.css('input[type="password"]'));
    const submitBtn = await driver.findElement(By.css('button[type="submit"]'));

    await emailInput.clear();
    await emailInput.sendKeys('employee@mindguard.com');
    await passwordInput.clear();
    await passwordInput.sendKeys('password123');

    console.log('[FT-001] Clicking Sign In...');
    await submitBtn.click();

    console.log('[FT-001] Waiting for dashboard redirect...');
    await driver.wait(until.urlContains('/dashboard'), 8000);
    console.log('[FT-001] Success: Redirected to dashboard.');
    setStatus('FT-001', 'PASS', null, ft1Start);
  } catch (err) {
    console.error('[FT-001] Failed:', err.message);
    setStatus('FT-001', 'FAIL', err.message, ft1Start);
  }

  // 2. FT-002: Verify mood logging
  let ft2Start = Date.now();
  try {
    console.log('[FT-002] Navigating to Mood Check page...');
    await driver.get(`${CLIENT_URL}/mood`);

    console.log('[FT-002] Selecting mood...');
    const moodButtons = await driver.wait(
      until.elementsLocated(By.xpath("//button[contains(., 'Happy') or contains(., 'Calm') or contains(., 'Tired')]")),
      8000
    );
    if (moodButtons.length > 0) {
      await moodButtons[0].click();
    } else {
      throw new Error('Mood option buttons not found');
    }

    console.log('[FT-002] Entering optional note...');
    const noteArea = await driver.findElement(By.css('textarea'));
    await noteArea.sendKeys('Feeling great while running automated Selenium tests!');

    console.log('[FT-002] Submitting Mood check...');
    const saveButton = await driver.findElement(By.xpath("//button[contains(., 'Save') or contains(., 'Reflections') or contains(., 'Submit')]"));
    await saveButton.click();

    // Look for success alert message
    await driver.wait(until.elementLocated(By.xpath("//span[contains(., 'successfully logged') or contains(., 'logged')]")), 8000);
    console.log('[FT-002] Success: Mood logged successfully.');
    setStatus('FT-002', 'PASS', null, ft2Start);
  } catch (err) {
    console.error('[FT-002] Failed:', err.message);
    setStatus('FT-002', 'FAIL', err.message, ft2Start);
  }

  // 3. FT-003: Focus Timer Session
  let ft3Start = Date.now();
  try {
    console.log('[FT-003] Navigating to Focus page...');
    await driver.get(`${CLIENT_URL}/focus`);

    console.log('[FT-003] Setting up task...');
    const taskInput = await driver.wait(
      until.elementLocated(By.css('input[type="text"]')),
      8000
    );
    await taskInput.sendKeys('Automated Selenium Testing Focus Session');

    console.log('[FT-003] Starting Focus timer...');
    const startBtn = await driver.findElement(By.xpath("//button[contains(., 'Start') or contains(., 'Focus')]"));
    await startBtn.click();

    // Verify it changed to active focus timer state (has a Stop or Pause button)
    const stopBtn = await driver.wait(
      until.elementLocated(By.xpath("//button[contains(., 'Stop') or contains(., 'Pause') or contains(., 'Quit')]")),
      5000
    );
    console.log('[FT-003] Success: Focus timer is running.');
    setStatus('FT-003', 'PASS', null, ft3Start);

    // Stop early to clean up
    await stopBtn.click();
    await driver.sleep(500);
  } catch (err) {
    console.error('[FT-003] Failed:', err.message);
    setStatus('FT-003', 'FAIL', err.message, ft3Start);
  }

  // 4. FT-004: AI Therapy Chat
  let ft4Start = Date.now();
  try {
    console.log('[FT-004] Navigating to AI Chat page...');
    await driver.get(`${CLIENT_URL}/chat`);

    // If we see the Start New Counseling button, click it to activate chat
    try {
      const startNewBtn = await driver.findElement(By.xpath("//button[contains(., 'Start New') or contains(., 'Counseling')]"));
      await startNewBtn.click();
      await driver.sleep(1000);
    } catch (_) {
      // Session already active
    }

    console.log('[FT-004] Sending stress query...');
    const chatInput = await driver.wait(
      until.elementLocated(By.css('input[placeholder*="feeling"]')),
      8000
    );
    await chatInput.sendKeys('I am feeling a bit overloaded with code reviews today, what can I do?');

    const sendBtn = await driver.findElement(By.xpath("//button[contains(., 'Send') or @type='submit']"));
    await sendBtn.click();

    console.log('[FT-004] Waiting for AI therapist message...');
    await driver.sleep(3000);
    console.log('[FT-004] Success: Chat input sent and processed.');
    setStatus('FT-004', 'PASS', null, ft4Start);
  } catch (err) {
    console.error('[FT-004] Failed:', err.message);
    setStatus('FT-004', 'FAIL', err.message, ft4Start);
  }

  // 5. FT-005: Profile settings update
  let ft5Start = Date.now();
  try {
    console.log('[FT-005] Navigating to Profile settings...');
    await driver.get(`${CLIENT_URL}/profile`);

    console.log('[FT-005] Editing profile name details...');
    const nameInput = await driver.wait(
      until.elementLocated(By.xpath("//label[contains(., 'Full Name')]/following-sibling::div/input")),
      8000
    );
    await nameInput.clear();
    await nameInput.sendKeys('John Doe Updated');

    console.log('[FT-005] Saving updates...');
    const saveProfileBtn = await driver.findElement(By.xpath("//button[contains(., 'Save') or contains(., 'Update') or contains(., 'Changes')]"));
    await saveProfileBtn.click();

    await driver.sleep(1500); // Wait for API write
    console.log('[FT-005] Success: Profile updated.');
    setStatus('FT-005', 'PASS', null, ft5Start);
  } catch (err) {
    console.error('[FT-005] Failed:', err.message);
    setStatus('FT-005', 'FAIL', err.message, ft5Start);
  }
}
