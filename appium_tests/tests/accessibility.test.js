// tests/accessibility.test.js - Appium Accessibility Tests (MAT-001 to MAT-005)

import { navigateTo, loginViaUI, updateResult } from '../utils.js';

export async function runAccessibilityTests(driver, registry) {
  console.log('\n--- Running Accessibility Tests (Appium) ---');

  await loginViaUI(driver, 'employee');
  await navigateTo(driver, '/dashboard');
  await driver.pause(2000);

  // MAT-001: HTML lang attribute
  try {
    const lang = await driver.execute(() => document.documentElement.lang);
    const pass = lang && lang.length > 0;
    updateResult(registry, 'accessibility', 'MAT-001', pass ? 'PASS' : 'FAIL',
      pass ? null : 'HTML lang attribute missing', '~500ms');
    console.log(`[MAT-001] ${pass ? 'PASS' : 'FAIL'}: HTML lang="${lang}"`);
  } catch (err) {
    updateResult(registry, 'accessibility', 'MAT-001', 'FAIL', err.message, 'N/A');
  }

  // MAT-002: Images have alt attributes
  try {
    const result = await driver.execute(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const missing = imgs.filter(img => !img.alt || img.alt.trim() === '');
      return { total: imgs.length, missingAlt: missing.length };
    });
    const pass = result.missingAlt === 0;
    updateResult(registry, 'accessibility', 'MAT-002', pass ? 'PASS' : 'FAIL',
      pass ? null : `${result.missingAlt} of ${result.total} images missing alt text`, '~500ms');
    console.log(`[MAT-002] ${pass ? 'PASS' : 'FAIL'}: ${result.missingAlt}/${result.total} images without alt`);
  } catch (err) {
    updateResult(registry, 'accessibility', 'MAT-002', 'FAIL', err.message, 'N/A');
  }

  // MAT-003: Form inputs have accessible labels
  try {
    await navigateTo(driver, '/login');
    await driver.pause(1500);
    const result = await driver.execute(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])'));
      const unlabelled = inputs.filter(inp => {
        const id = inp.id;
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const ariaLabel = inp.getAttribute('aria-label');
        const ariaLabelledBy = inp.getAttribute('aria-labelledby');
        return !label && !ariaLabel && !ariaLabelledBy;
      });
      return { total: inputs.length, unlabelled: unlabelled.length };
    });
    const pass = result.unlabelled === 0;
    updateResult(registry, 'accessibility', 'MAT-003', pass ? 'PASS' : 'FAIL',
      pass ? null : `${result.unlabelled}/${result.total} inputs missing accessible labels`, '~1500ms');
    console.log(`[MAT-003] ${pass ? 'PASS' : 'FAIL'}: ${result.unlabelled}/${result.total} inputs unlabelled`);
  } catch (err) {
    updateResult(registry, 'accessibility', 'MAT-003', 'FAIL', err.message, 'N/A');
  }

  // MAT-004: Buttons have accessible names
  try {
    await loginViaUI(driver, 'employee');
    await navigateTo(driver, '/dashboard');
    await driver.pause(1500);
    const result = await driver.execute(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const unnamed = btns.filter(btn => {
        const txt = btn.innerText?.trim();
        const ariaLabel = btn.getAttribute('aria-label');
        const title = btn.getAttribute('title');
        return !txt && !ariaLabel && !title;
      });
      return { total: btns.length, unnamed: unnamed.length };
    });
    const pass = result.unnamed === 0;
    updateResult(registry, 'accessibility', 'MAT-004', pass ? 'PASS' : 'FAIL',
      pass ? null : `${result.unnamed} buttons without accessible names`, '~1500ms');
    console.log(`[MAT-004] ${pass ? 'PASS' : 'FAIL'}: ${result.unnamed}/${result.total} buttons unnamed`);
  } catch (err) {
    updateResult(registry, 'accessibility', 'MAT-004', 'FAIL', err.message, 'N/A');
  }

  // MAT-005: Color contrast check (basic)
  try {
    const result = await driver.execute(() => {
      const body = window.getComputedStyle(document.body);
      const bg = body.backgroundColor;
      const color = body.color;
      return { backgroundColor: bg, color: color };
    });
    const pass = result.backgroundColor !== result.color;
    updateResult(registry, 'accessibility', 'MAT-005', pass ? 'PASS' : 'FAIL',
      pass ? null : 'Text and background colors appear identical', '~500ms');
    console.log(`[MAT-005] ${pass ? 'PASS' : 'FAIL'}: bg="${result.backgroundColor}", text="${result.color}"`);
  } catch (err) {
    updateResult(registry, 'accessibility', 'MAT-005', 'FAIL', err.message, 'N/A');
  }

  console.log('[Accessibility Tests] Completed.');
}
