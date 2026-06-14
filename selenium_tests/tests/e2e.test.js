// tests/e2e.test.js
import { By, until } from 'selenium-webdriver';
import { CLIENT_URL } from '../utils.js';

export async function runE2eTests(driver, resultsRegistry) {
  console.log('\n--- Running End-to-End (E2E) Tests ---');

  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.e2e.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  const randomId = Math.floor(Math.random() * 100000);
  const testEmail = `tester_${randomId}@company.com`;
  const testPassword = `pass_${randomId}123!`;

  // 1. ET-001: Full user registration and login workflow
  let et1Start = Date.now();
  try {
    console.log('[ET-001] Deleting cookies to start clean E2E registration...');
    await driver.manage().deleteAllCookies();
    await driver.sleep(500);

    console.log('[ET-001] Navigating to Registration page...');
    await driver.get(`${CLIENT_URL}/register`);

    console.log('[ET-001] Filling registration fields...');
    const nameInput = await driver.wait(
      until.elementLocated(By.xpath("//label[contains(., 'Full Name')]/following-sibling::input")),
      8000
    );
    const emailInput = await driver.findElement(By.xpath("//label[contains(., 'Work Email')]/following-sibling::input"));
    const passInput = await driver.findElement(By.xpath("//label[contains(., 'Password')]/following-sibling::input"));
    const phoneInput = await driver.findElement(By.xpath("//label[contains(., 'Phone Number')]/following-sibling::input"));
    const ageInput = await driver.findElement(By.xpath("//label[contains(., 'Age')]/following-sibling::input"));
    const genderSelect = await driver.findElement(By.xpath("//label[contains(., 'Gender')]/following-sibling::select"));
    
    const companyInput = await driver.findElement(By.xpath("//label[contains(., 'Company')]/following-sibling::input"));
    const employeeIdInput = await driver.findElement(By.xpath("//label[contains(., 'Employee ID')]/following-sibling::input"));
    const departmentInput = await driver.findElement(By.xpath("//label[contains(., 'Department')]/following-sibling::input"));
    const companyCodeInput = await driver.findElement(By.xpath("//label[contains(., 'Company ID')]/following-sibling::input"));
    
    const emergencyNameInput = await driver.findElement(By.xpath("//label[contains(., 'Contact Name')]/following-sibling::input"));
    const emergencyPhoneInput = await driver.findElement(By.xpath("//label[contains(., 'Contact Phone')]/following-sibling::input"));
    const emergencyEmailInput = await driver.findElement(By.xpath("//label[contains(., 'Contact Email')]/following-sibling::input"));

    await nameInput.sendKeys('Automation Tester');
    await emailInput.sendKeys(testEmail);
    await passInput.sendKeys(testPassword);
    await phoneInput.sendKeys('+15559999');
    await ageInput.sendKeys('30');
    await genderSelect.sendKeys('Male');
    
    await companyInput.sendKeys('Acme Corp');
    await employeeIdInput.sendKeys(`EMP-AUT-${randomId}`);
    await departmentInput.sendKeys('Quality Assurance');
    await companyCodeInput.sendKeys('ACME-100');
    
    await emergencyNameInput.sendKeys('Jane Emergency');
    await emergencyPhoneInput.sendKeys('+15550199');
    await emergencyEmailInput.sendKeys('jane@emergency.com');

    console.log('[ET-001] Clicking Submit Registration...');
    const registerBtn = await driver.findElement(By.css('button[type="submit"]'));
    await registerBtn.click();

    // Verify redirected to login or auto-logged in
    console.log('[ET-001] Waiting for Login redirect or Dashboard...');
    await driver.wait(until.urlContains('/login'), 10000);
    
    // Login as new user
    console.log('[ET-001] Logging in with newly registered account...');
    const loginEmailInput = await driver.findElement(By.css('input[type="email"]'));
    const loginPassInput = await driver.findElement(By.css('input[type="password"]'));
    const loginSubmitBtn = await driver.findElement(By.css('button[type="submit"]'));

    await loginEmailInput.clear();
    await loginEmailInput.sendKeys(testEmail);
    await loginPassInput.clear();
    await loginPassInput.sendKeys(testPassword);
    await loginSubmitBtn.click();

    await driver.wait(until.urlContains('/dashboard'), 10000);
    console.log('[ET-001] Success: Registered and logged in new user.');
    setStatus('ET-001', 'PASS', null, et1Start);
  } catch (err) {
    console.error('[ET-001] Failed:', err.message);
    setStatus('ET-001', 'FAIL', err.message, et1Start);
  }

  // 2. ET-002: Log mood -> Start Focus timer -> AI therapy chat -> Logout
  let et2Start = Date.now();
  try {
    console.log('[ET-002] E2E action list starting. Navigating to Mood Check...');
    await driver.get(`${CLIENT_URL}/mood`);

    console.log('[ET-002] Selecting mood in Mood check...');
    const moodBtns = await driver.wait(
      until.elementsLocated(By.xpath("//button[contains(., 'Calm') or contains(., 'Neutral')]")),
      8000
    );
    await moodBtns[0].click();
    const noteArea = await driver.findElement(By.css('textarea'));
    await noteArea.sendKeys('E2E workspace check mood note log.');
    const saveMoodBtn = await driver.findElement(By.xpath("//button[contains(., 'Save') or contains(., 'Reflections') or contains(., 'Submit')]"));
    await saveMoodBtn.click();
    await driver.wait(until.elementLocated(By.xpath("//span[contains(., 'successfully logged') or contains(., 'logged')]")), 8000);

    console.log('[ET-002] Navigating to Focus timer...');
    await driver.get(`${CLIENT_URL}/focus`);
    const taskInput = await driver.wait(
      until.elementLocated(By.css('input[type="text"]')),
      8000
    );
    await taskInput.sendKeys('E2E Focus work session');
    const startBtn = await driver.findElement(By.xpath("//button[contains(., 'Start') or contains(., 'Focus')]"));
    await startBtn.click();
    
    // Stop the focus timer
    await driver.sleep(1000);
    const stopBtn = await driver.findElement(By.xpath("//button[contains(., 'Stop') or contains(., 'Pause') or contains(., 'Quit')]"));
    await stopBtn.click();
    await driver.sleep(500);

    console.log('[ET-002] Navigating to AI Therapy Chat...');
    await driver.get(`${CLIENT_URL}/chat`);
    
    try {
      const startNewBtn = await driver.findElement(By.xpath("//button[contains(., 'Start New') or contains(., 'Counseling')]"));
      await startNewBtn.click();
      await driver.sleep(1000);
    } catch (_) {
      // Session already active
    }

    const chatInput = await driver.wait(
      until.elementLocated(By.css('input[placeholder*="feeling"]')),
      8000
    );
    await chatInput.sendKeys('I completed a great workout today and finished my E2E tests, how does physical health relate to focus?');
    const sendBtn = await driver.findElement(By.xpath("//button[contains(., 'Send') or @type='submit']"));
    await sendBtn.click();
    await driver.sleep(3000);

    // Logout
    console.log('[ET-002] Triggering E2E user logout...');
    const logoutBtn = await driver.findElement(By.xpath("//button[contains(., 'Logout')]"));
    await logoutBtn.click();
    await driver.wait(until.urlContains('/login'), 10000);

    console.log('[ET-002] Success: Full E2E user journey checklist passed successfully.');
    setStatus('ET-002', 'PASS', null, et2Start);
  } catch (err) {
    console.error('[ET-002] Failed:', err.message);
    setStatus('ET-002', 'FAIL', err.message, et2Start);
  }
}
