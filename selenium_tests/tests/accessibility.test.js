// tests/accessibility.test.js
import { By } from 'selenium-webdriver';
import { CLIENT_URL } from '../utils.js';

export async function runAccessibilityTests(driver, resultsRegistry) {
  console.log('\n--- Running Accessibility Tests ---');

  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.accessibility.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  // 1. AT-001: HTML lang attribute check
  let at1Start = Date.now();
  try {
    console.log('[AT-001] Fetching root HTML tag lang attribute...');
    await driver.get(CLIENT_URL);
    const htmlElem = await driver.findElement(By.xpath('/html'));
    const lang = await htmlElem.getAttribute('lang');
    console.log('[AT-001] HTML lang attribute is:', lang);

    if (lang && lang.trim().length > 0) {
      console.log('[AT-001] Success: HTML document lang is set.');
      setStatus('AT-001', 'PASS', null, at1Start);
    } else {
      throw new Error('HTML document tag is missing the "lang" attribute.');
    }
  } catch (err) {
    console.error('[AT-001] Failed:', err.message);
    setStatus('AT-001', 'FAIL', err.message, at1Start);
  }

  // 2. AT-002: Image alt attribute audits
  let at2Start = Date.now();
  try {
    console.log('[AT-002] Auditing img elements for alt descriptions...');
    const images = await driver.findElements(By.css('img'));
    console.log(`[AT-002] Found ${images.length} images on page.`);

    let missingAltCount = 0;
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const src = await img.getAttribute('src');
      if (!alt) {
        missingAltCount++;
        console.warn(`[AT-002] Warning: Image src "${src}" has empty or missing alt tag.`);
      }
    }

    console.log(`[AT-002] Success: Audit finished. Missing alts: ${missingAltCount}`);
    setStatus('AT-002', 'PASS', null, at2Start);
  } catch (err) {
    console.error('[AT-002] Failed:', err.message);
    setStatus('AT-002', 'FAIL', err.message, at2Start);
  }
}
