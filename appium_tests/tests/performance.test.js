// tests/performance.test.js - Appium Performance Tests (MPT-001 to MPT-005)

import { navigateTo, loginViaUI, measurePageLoad, updateResult } from '../utils.js';
import axios from 'axios';
import { BACKEND_URL } from '../appium.config.js';

export async function runPerformanceTests(driver, registry) {
  console.log('\n--- Running Performance Tests (Appium) ---');

  // MPT-001: Initial app load time on mobile
  try {
    await loginViaUI(driver, 'employee');
    await navigateTo(driver, '/dashboard');
    const loadTime = await measurePageLoad(driver);
    const pass = loadTime > 0 && loadTime < 3000;
    updateResult(registry, 'performance', 'MPT-001', pass ? 'PASS' : 'FAIL',
      pass ? null : `Load time ${loadTime}ms exceeded 3000ms limit`, `${loadTime}ms`);
    console.log(`[MPT-001] ${pass ? 'PASS' : 'FAIL'}: Dashboard load time ${loadTime}ms`);
  } catch (err) {
    updateResult(registry, 'performance', 'MPT-001', 'FAIL', err.message, 'N/A');
    console.error('[MPT-001] FAIL:', err.message);
  }

  // MPT-002: API response time for dashboard
  try {
    const start = Date.now();
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'employee@mindguard.com',
      password: 'password123'
    });
    const token = res.data.token;

    const apiStart = Date.now();
    await axios.get(`${BACKEND_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const elapsed = Date.now() - apiStart;
    const pass = elapsed < 1000;
    updateResult(registry, 'performance', 'MPT-002', pass ? 'PASS' : 'FAIL',
      pass ? null : `Dashboard API took ${elapsed}ms (limit: 1000ms)`, `${elapsed}ms`);
    console.log(`[MPT-002] ${pass ? 'PASS' : 'FAIL'}: Dashboard API response ${elapsed}ms`);
  } catch (err) {
    updateResult(registry, 'performance', 'MPT-002', 'FAIL', err.message, 'N/A');
    console.error('[MPT-002] FAIL:', err.message);
  }

  // MPT-003: Mood page transition
  try {
    const start = Date.now();
    await navigateTo(driver, '/mood');
    await driver.pause(500);
    const elapsed = Date.now() - start;
    const pass = elapsed < 2000;
    updateResult(registry, 'performance', 'MPT-003', pass ? 'PASS' : 'FAIL',
      pass ? null : `Mood page took ${elapsed}ms`, `${elapsed}ms`);
    console.log(`[MPT-003] ${pass ? 'PASS' : 'FAIL'}: Mood page transition ${elapsed}ms`);
  } catch (err) {
    updateResult(registry, 'performance', 'MPT-003', 'FAIL', err.message, 'N/A');
    console.error('[MPT-003] FAIL:', err.message);
  }

  // MPT-004: AI Chat API response time
  try {
    const loginRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'employee@mindguard.com', password: 'password123'
    });
    const token = loginRes.data.token;

    const chatStart = Date.now();
    const chatRes = await axios.post(`${BACKEND_URL}/api/chats`, {
      message: 'I am stressed', type: 'initial'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const chatElapsed = Date.now() - chatStart;
    const pass = chatElapsed < 8000;
    updateResult(registry, 'performance', 'MPT-004', pass ? 'PASS' : 'FAIL',
      pass ? null : `Chat API took ${chatElapsed}ms`, `${chatElapsed}ms`);
    console.log(`[MPT-004] ${pass ? 'PASS' : 'FAIL'}: Chat API response ${chatElapsed}ms`);
  } catch (err) {
    updateResult(registry, 'performance', 'MPT-004', 'FAIL', err.message, 'N/A');
    console.error('[MPT-004] FAIL:', err.message);
  }

  // MPT-005: Admin overview page load
  try {
    const start = Date.now();
    await navigateTo(driver, '/login');
    await driver.pause(500);
    const emailEl = await driver.$('input[type="email"]');
    if (await emailEl.isExisting()) {
      await emailEl.setValue('admin@mindguard.com');
      const passEl = await driver.$('input[type="password"]');
      await passEl.setValue('password123');
      await (await driver.$('button[type="submit"]')).click();
      await driver.pause(2000);
    }
    await navigateTo(driver, '/admin');
    await driver.pause(2000);
    const elapsed = Date.now() - start;
    updateResult(registry, 'performance', 'MPT-005', elapsed < 5000 ? 'PASS' : 'FAIL',
      elapsed < 5000 ? null : `Admin page ${elapsed}ms`, `${elapsed}ms`);
    console.log(`[MPT-005] PASS: Admin page loaded in ${elapsed}ms`);
  } catch (err) {
    updateResult(registry, 'performance', 'MPT-005', 'FAIL', err.message, 'N/A');
    console.error('[MPT-005] FAIL:', err.message);
  }

  console.log('[Performance Tests] Completed.');
}
