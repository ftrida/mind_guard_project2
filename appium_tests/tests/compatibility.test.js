// tests/compatibility.test.js - Appium Compatibility Tests (MCT-001 to MCT-005)

import { navigateTo, loginViaUI, updateResult } from '../utils.js';
import { VIEWPORTS } from '../appium.config.js';

export async function runCompatibilityTests(driver, registry) {
  console.log('\n--- Running Compatibility Tests (Appium) ---');

  const viewportTests = [
    { id: 'MCT-001', width: 375,  height: 812,  name: 'iPhone SE (375x812)' },
    { id: 'MCT-002', width: 414,  height: 896,  name: 'iPhone XR (414x896)' },
    { id: 'MCT-003', width: 768,  height: 1024, name: 'iPad (768x1024)' },
    { id: 'MCT-004', width: 360,  height: 640,  name: 'Android Small (360x640)' },
    { id: 'MCT-005', width: 428,  height: 926,  name: 'iPhone 14 Pro Max (428x926)' },
  ];

  await loginViaUI(driver, 'employee');

  for (const vt of viewportTests) {
    const start = Date.now();
    try {
      await driver.setWindowSize(vt.width, vt.height);
      await driver.pause(800);
      await navigateTo(driver, '/dashboard');
      await driver.pause(2000);

      // Check for horizontal scroll (overflow)
      const scrollWidth = await driver.execute(() => document.documentElement.scrollWidth);
      const clientWidth = await driver.execute(() => document.documentElement.clientWidth);
      const hasOverflow = scrollWidth > clientWidth + 5; // 5px tolerance

      const duration = `${Date.now() - start}ms`;
      if (hasOverflow) {
        updateResult(registry, 'compatibility', vt.id, 'FAIL',
          `Horizontal overflow detected: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`, duration);
        console.log(`[${vt.id}] FAIL: Overflow at ${vt.name} — scrollWidth=${scrollWidth}`);
      } else {
        updateResult(registry, 'compatibility', vt.id, 'PASS', null, duration);
        console.log(`[${vt.id}] PASS: No overflow at ${vt.name}`);
      }
    } catch (err) {
      updateResult(registry, 'compatibility', vt.id, 'FAIL', err.message, 'N/A');
      console.error(`[${vt.id}] FAIL:`, err.message);
    }
  }

  // Reset to standard mobile size
  await driver.setWindowSize(390, 844);
  console.log('[Compatibility Tests] Completed.');
}
