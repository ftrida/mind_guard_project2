// tests/api.test.js
import axios from 'axios';
import { API_URL } from '../utils.js';

export async function runApiTests(resultsRegistry) {
  console.log('\n--- Running API Tests ---');

  const setStatus = (id, status, error = null, startTime = null) => {
    const caseObj = resultsRegistry.api.find(c => c.id === id);
    if (caseObj) {
      caseObj.status = status;
      caseObj.error = error;
      if (startTime) {
        caseObj.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;
      }
    }
  };

  // 1. AP-001: Auth Login API endpoint
  let ap1Start = Date.now();
  try {
    console.log('[AP-001] Calling POST /api/auth/login with valid login body...');
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'employee@mindguard.com',
      password: 'password123'
    });

    console.log('[AP-001] Response status:', response.status);
    console.log('[AP-001] Response data keys:', Object.keys(response.data));

    if (response.status === 200 && response.data.success) {
      console.log('[AP-001] Success: Authentication API responds correctly.');
      setStatus('AP-001', 'PASS', null, ap1Start);
    } else {
      throw new Error(`Unexpected status code ${response.status} or success field false.`);
    }
  } catch (err) {
    console.error('[AP-001] Failed:', err.message);
    setStatus('AP-001', 'FAIL', err.message, ap1Start);
  }

  // 2. AP-002: Dashboard data validation API
  let ap2Start = Date.now();
  try {
    console.log('[AP-002] Logging in first to obtain auth cookie token...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'employee@mindguard.com',
      password: 'password123'
    });
    
    const cookieHeader = loginRes.headers['set-cookie'];
    if (!cookieHeader) {
      throw new Error('No Set-Cookie header received from auth service.');
    }

    console.log('[AP-002] Calling GET /api/dashboard with authorization cookie...');
    const dbRes = await axios.get(`${API_URL}/api/dashboard`, {
      headers: {
        Cookie: cookieHeader[0]
      }
    });

    console.log('[AP-002] Dashboard API response status:', dbRes.status);
    console.log('[AP-002] Dashboard success field:', dbRes.data.success);

    if (dbRes.status === 200 && dbRes.data.success) {
      console.log('[AP-002] Success: Dashboard API returns valid statistics.');
      setStatus('AP-002', 'PASS', null, ap2Start);
    } else {
      throw new Error(`Dashboard request failed with status: ${dbRes.status}`);
    }
  } catch (err) {
    console.error('[AP-002] Failed:', err.message);
    setStatus('AP-002', 'FAIL', err.message, ap2Start);
  }
}
