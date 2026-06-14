// tests/performance.test.js
import { CLIENT_URL } from '../utils.js';

export async function runPerformanceTests(driver, resultsRegistry) {
  console.log('\n--- Running Performance Tests ---');

  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.performance.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  // 1. PT-001: Initial page load time verification
  let pt1Start = Date.now();
  try {
    console.log('[PT-001] Triggering full page reload of dashboard...');
    const navigationStart = Date.now();
    await driver.get(`${CLIENT_URL}/dashboard`);
    const pageLoadTimeMs = Date.now() - navigationStart;
    console.log(`[PT-001] Dashboard fully loaded in ${pageLoadTimeMs}ms.`);

    if (pageLoadTimeMs < 3000) { // Limit threshold is 3 seconds
      setStatus('PT-001', 'PASS', null, pt1Start);
    } else {
      throw new Error(`Page took too long to load: ${pageLoadTimeMs}ms (Threshold: 3000ms)`);
    }
  } catch (err) {
    console.error('[PT-001] Failed:', err.message);
    setStatus('PT-001', 'FAIL', err.message, pt1Start);
  }

  // 2. PT-002: API response round-trip latency verification
  let pt2Start = Date.now();
  try {
    console.log('[PT-002] Navigating to Focus page and measuring transition latency...');
    const transitionStart = Date.now();
    await driver.get(`${CLIENT_URL}/focus`);
    const transitionTime = Date.now() - transitionStart;
    console.log(`[PT-002] Focus page transition completed in ${transitionTime}ms.`);

    if (transitionTime < 1500) {
      setStatus('PT-002', 'PASS', null, pt2Start);
    } else {
      throw new Error(`API data or component rendering transition latency took ${transitionTime}ms (Threshold: 1500ms)`);
    }
  } catch (err) {
    console.error('[PT-002] Failed:', err.message);
    setStatus('PT-002', 'FAIL', err.message, pt2Start);
  }
}
