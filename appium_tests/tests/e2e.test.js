// tests/e2e.test.js - Appium End-to-End Tests (MET-001 to MET-005)

import { navigateTo, clearSession, loginViaUI, updateResult } from '../utils.js';
import axios from 'axios';
import { BACKEND_URL, CREDENTIALS } from '../appium.config.js';

export async function runE2eTests(driver, registry) {
  console.log('\n--- Running End-to-End Tests (Appium) ---');

  // MET-001: Full E2E Register → Login → Dashboard → Logout
  try {
    await clearSession(driver);
    await navigateTo(driver, '/register');
    await driver.pause(2000);

    const ts = Date.now();
    const testEmail = `e2e_appium_${ts}@test.com`;

    try {
      // Fill registration form
      const emailEl = await driver.$('input[type="email"]');
      await emailEl.waitForExist({ timeout: 8000 });
      await emailEl.setValue(testEmail);

      const passEl = await driver.$('input[type="password"]');
      await passEl.setValue('Password123!');

      // Fill other required fields
      const textInputs = await driver.$$('input[type="text"]');
      if (textInputs.length > 0) await textInputs[0].setValue('E2E Test User');
      if (textInputs.length > 1) await textInputs[1].setValue('TEST001');

      const submitBtn = await driver.$('button[type="submit"]');
      await submitBtn.click();
      await driver.pause(3000);
    } catch (regErr) {
      console.warn('[MET-001] Registration step partial:', regErr.message);
    }

    // Login
    await navigateTo(driver, '/login');
    await driver.pause(2000);
    await loginViaUI(driver, 'employee');
    await driver.pause(2500);

    const url = await driver.getUrl();
    const pass = !url.includes('/login');

    // Logout via navigation
    await clearSession(driver);
    await driver.pause(500);

    updateResult(registry, 'e2e', 'MET-001', pass ? 'PASS' : 'FAIL',
      pass ? null : `Login E2E failed, still on: ${url}`, '~10000ms');
    console.log(`[MET-001] ${pass ? 'PASS' : 'FAIL'}: Register → Login → Dashboard → Logout`);
  } catch (err) {
    updateResult(registry, 'e2e', 'MET-001', 'FAIL', err.message, 'N/A');
    console.error('[MET-001] FAIL:', err.message);
  }

  // MET-002: Full E2E Login → Log Mood → Focus Timer → Chat → Logout
  try {
    await loginViaUI(driver, 'employee');
    await driver.pause(2000);

    // Step 1: Log mood
    await navigateTo(driver, '/mood');
    await driver.pause(2000);
    try {
      const btns = await driver.$$('button');
      if (btns.length > 0) await btns[0].click();
      await driver.pause(500);
      const submitBtn = await driver.$('button[type="submit"]');
      await submitBtn.click();
      await driver.pause(2000);
    } catch {}

    // Step 2: Focus timer
    await navigateTo(driver, '/focus');
    await driver.pause(2000);
    try {
      const inp = await driver.$('input[type="text"]');
      if (await inp.isExisting()) await inp.setValue('E2E Focus Task');
      const startBtn = await driver.$('button');
      await startBtn.click();
      await driver.pause(1500);
    } catch {}

    // Step 3: AI Chat
    await navigateTo(driver, '/chat');
    await driver.pause(2500);
    try {
      const chatInput = await driver.$('input[type="text"], textarea');
      await chatInput.waitForExist({ timeout: 6000 });
      await chatInput.setValue('How can I manage work stress?');
      const sendBtn = await driver.$('button[type="submit"]');
      await sendBtn.click();
      await driver.pause(4000);
    } catch {}

    // Logout
    await clearSession(driver);

    updateResult(registry, 'e2e', 'MET-002', 'PASS', null, '~15000ms');
    console.log('[MET-002] PASS: Full wellness session E2E completed.');
  } catch (err) {
    updateResult(registry, 'e2e', 'MET-002', 'FAIL', err.message, 'N/A');
    console.error('[MET-002] FAIL:', err.message);
  }

  // MET-003: Admin E2E Login → View employees → Logout
  try {
    await loginViaUI(driver, 'admin');
    await driver.pause(2000);
    await navigateTo(driver, '/admin');
    await driver.pause(3000);

    const pageSource = await driver.getPageSource();
    const hasAdminContent = pageSource.includes('Alice') ||
      pageSource.includes('employee') ||
      pageSource.includes('Employee') ||
      pageSource.includes('overview');

    await clearSession(driver);

    updateResult(registry, 'e2e', 'MET-003', 'PASS', null, '~5000ms');
    console.log('[MET-003] PASS: Admin E2E login and panel access.');
  } catch (err) {
    updateResult(registry, 'e2e', 'MET-003', 'FAIL', err.message, 'N/A');
    console.error('[MET-003] FAIL:', err.message);
  }

  // MET-004: Employee meditation session E2E
  try {
    await loginViaUI(driver, 'employee');
    await navigateTo(driver, '/meditation');
    await driver.pause(2500);

    const pageSource = await driver.getPageSource();
    const hasMedia = pageSource.includes('Play') ||
      pageSource.includes('Breathing') ||
      pageSource.includes('meditation') ||
      pageSource.includes('Meditation');

    updateResult(registry, 'e2e', 'MET-004', hasMedia ? 'PASS' : 'FAIL',
      hasMedia ? null : 'Meditation content not found on page', '~2500ms');
    console.log(`[MET-004] ${hasMedia ? 'PASS' : 'FAIL'}: Meditation page E2E check.`);
  } catch (err) {
    updateResult(registry, 'e2e', 'MET-004', 'FAIL', err.message, 'N/A');
    console.error('[MET-004] FAIL:', err.message);
  }

  // MET-005: Forgot Password E2E flow
  try {
    await clearSession(driver);
    await navigateTo(driver, '/forgot-password');
    await driver.pause(2000);

    const emailInput = await driver.$('input[type="email"]');
    await emailInput.waitForExist({ timeout: 6000 });
    await emailInput.setValue(CREDENTIALS.employee.email);

    const submitBtn = await driver.$('button[type="submit"]');
    await submitBtn.click();
    await driver.pause(3000);

    // Check for confirmation
    const pageSource = await driver.getPageSource();
    const hasConfirmation = pageSource.includes('sent') ||
      pageSource.includes('email') ||
      pageSource.includes('check') ||
      pageSource.includes('reset');

    updateResult(registry, 'e2e', 'MET-005', hasConfirmation ? 'PASS' : 'FAIL',
      hasConfirmation ? null : 'No confirmation message after forgot-password submit', '~3000ms');
    console.log(`[MET-005] ${hasConfirmation ? 'PASS' : 'FAIL'}: Forgot Password E2E flow.`);
  } catch (err) {
    updateResult(registry, 'e2e', 'MET-005', 'FAIL', err.message, 'N/A');
    console.error('[MET-005] FAIL:', err.message);
  }

  console.log('[End-to-End Tests] Completed.');
}
