// utils.js - Appium WebdriverIO driver factory and helper utilities

import { remote } from 'webdriverio';
import axios from 'axios';
import {
  APPIUM_HOST, APPIUM_PORT, APPIUM_PATH,
  capabilities, FRONTEND_URL, BACKEND_URL,
  CREDENTIALS, TIMEOUTS
} from './appium.config.js';

/**
 * Create a WebdriverIO remote driver connected to Appium server
 * @returns {Promise<WebdriverIO.Browser>} driver instance
 */
export async function createDriver() {
  const driver = await remote({
    hostname:    APPIUM_HOST,
    port:        APPIUM_PORT,
    path:        APPIUM_PATH,
    capabilities: capabilities,
    logLevel:    'warn',
    connectionRetryTimeout: 120000,
    connectionRetryCount:   3
  });

  // Set implicit wait
  await driver.setTimeout({ implicit: TIMEOUTS.implicit });
  return driver;
}

/**
 * Navigate to a page and wait for it to load
 */
export async function navigateTo(driver, path) {
  await driver.url(`${FRONTEND_URL}${path}`);
  await driver.pause(TIMEOUTS.animation);
}

/**
 * Login via the UI using mobile Chrome browser
 */
export async function loginViaUI(driver, role = 'employee') {
  const creds = CREDENTIALS[role];
  await navigateTo(driver, '/login');
  await driver.pause(2000);

  try {
    const emailInput = await driver.$('input[type="email"]');
    await emailInput.clearValue();
    await emailInput.setValue(creds.email);

    const passwordInput = await driver.$('input[type="password"]');
    await passwordInput.clearValue();
    await passwordInput.setValue(creds.password);

    const submitBtn = await driver.$('button[type="submit"]');
    await submitBtn.click();

    await driver.pause(3000);
  } catch (err) {
    console.warn(`[Utils] UI Login fallback: ${err.message}`);
  }
}

/**
 * Get auth token via API (avoids UI login overhead)
 */
export async function getAuthToken(role = 'employee') {
  const creds = CREDENTIALS[role];
  try {
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: creds.email,
      password: creds.password
    }, {
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    });
    return res.data.token || null;
  } catch (err) {
    console.warn(`[Utils] API Login failed for ${role}:`, err.message);
    return null;
  }
}

/**
 * Clear cookies (logout) in the driver
 */
export async function clearSession(driver) {
  try {
    await driver.deleteCookies();
    await driver.pause(500);
  } catch (err) {
    // silent
  }
}

/**
 * Safe element getter with fallback
 */
export async function safeFind(driver, selector, timeout = TIMEOUTS.element) {
  try {
    const el = await driver.$(selector);
    await el.waitForExist({ timeout });
    return el;
  } catch {
    return null;
  }
}

/**
 * Safe click
 */
export async function safeClick(driver, selector) {
  const el = await safeFind(driver, selector);
  if (el) {
    await el.click();
    return true;
  }
  return false;
}

/**
 * Measure page load performance using browser Navigation Timing API
 */
export async function measurePageLoad(driver) {
  try {
    const timing = await driver.execute(() => {
      const t = window.performance.timing;
      return t.loadEventEnd - t.navigationStart;
    });
    return timing;
  } catch {
    return -1;
  }
}

/**
 * Get element dimensions on the page
 */
export async function getElementSize(driver, selector) {
  try {
    const el = await driver.$(selector);
    return await el.getSize();
  } catch {
    return { width: 0, height: 0 };
  }
}

/**
 * Update test result in registry
 */
export function updateResult(registry, category, id, status, error = null, duration = 'N/A') {
  const cases = registry[category] || [];
  const tc = cases.find(c => c.id === id);
  if (tc) {
    tc.status    = status;
    tc.error     = error ? String(error).substring(0, 300) : '';
    tc.duration  = duration;
    tc.testedDate = new Date().toLocaleDateString();
  }
}

export { FRONTEND_URL, BACKEND_URL, CREDENTIALS };
