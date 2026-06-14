// tests/api.test.js - Appium API Tests via axios (MAP-001 to MAP-005)

import axios from 'axios';
import { updateResult } from '../utils.js';
import { BACKEND_URL, CREDENTIALS } from '../appium.config.js';

let authToken = null;

async function getToken() {
  if (authToken) return authToken;
  const res = await axios.post(`${BACKEND_URL}/api/auth/login`, {
    email: CREDENTIALS.employee.email,
    password: CREDENTIALS.employee.password
  });
  authToken = res.data.token;
  return authToken;
}

export async function runApiTests(driver, registry) {
  console.log('\n--- Running API Tests (Appium) ---');

  // MAP-001: POST /api/auth/login returns JWT
  try {
    const start = Date.now();
    const res = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: CREDENTIALS.employee.email,
      password: CREDENTIALS.employee.password
    });
    const elapsed = `${Date.now() - start}ms`;
    const pass = res.status === 200 && res.data.success === true && res.data.token;
    authToken = res.data.token;
    updateResult(registry, 'api', 'MAP-001', pass ? 'PASS' : 'FAIL',
      pass ? null : `Unexpected response: ${JSON.stringify(res.data).substring(0, 100)}`, elapsed);
    console.log(`[MAP-001] ${pass ? 'PASS' : 'FAIL'}: Auth login API status ${res.status}`);
  } catch (err) {
    updateResult(registry, 'api', 'MAP-001', 'FAIL', err.message, 'N/A');
    console.error('[MAP-001] FAIL:', err.message);
  }

  // MAP-002: GET /api/dashboard
  try {
    const token = await getToken();
    const start = Date.now();
    const res = await axios.get(`${BACKEND_URL}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const elapsed = `${Date.now() - start}ms`;
    const pass = res.status === 200 && res.data.success === true;
    updateResult(registry, 'api', 'MAP-002', pass ? 'PASS' : 'FAIL',
      pass ? null : `Missing success field`, elapsed);
    console.log(`[MAP-002] ${pass ? 'PASS' : 'FAIL'}: Dashboard API status ${res.status}`);
  } catch (err) {
    updateResult(registry, 'api', 'MAP-002', 'FAIL', err.message, 'N/A');
    console.error('[MAP-002] FAIL:', err.message);
  }

  // MAP-003: GET /api/mood returns array
  try {
    const token = await getToken();
    const start = Date.now();
    const res = await axios.get(`${BACKEND_URL}/api/mood`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const elapsed = `${Date.now() - start}ms`;
    const pass = res.status === 200 && Array.isArray(res.data.data || res.data);
    updateResult(registry, 'api', 'MAP-003', pass ? 'PASS' : 'FAIL',
      pass ? null : 'Mood history not an array', elapsed);
    console.log(`[MAP-003] ${pass ? 'PASS' : 'FAIL'}: Mood GET API status ${res.status}`);
  } catch (err) {
    updateResult(registry, 'api', 'MAP-003', 'FAIL', err.message, 'N/A');
    console.error('[MAP-003] FAIL:', err.message);
  }

  // MAP-004: POST /api/mood creates entry
  try {
    const token = await getToken();
    const start = Date.now();
    const res = await axios.post(`${BACKEND_URL}/api/mood`, {
      mood: 'Calm',
      note: 'Appium API test mood log'
    }, { headers: { Authorization: `Bearer ${token}` } });
    const elapsed = `${Date.now() - start}ms`;
    const pass = res.status === 201 || res.status === 200;
    updateResult(registry, 'api', 'MAP-004', pass ? 'PASS' : 'FAIL',
      pass ? null : `Mood POST returned ${res.status}`, elapsed);
    console.log(`[MAP-004] ${pass ? 'PASS' : 'FAIL'}: Mood POST status ${res.status}`);
  } catch (err) {
    updateResult(registry, 'api', 'MAP-004', 'FAIL', err.message, 'N/A');
    console.error('[MAP-004] FAIL:', err.message);
  }

  // MAP-005: GET /api/notifications
  try {
    const token = await getToken();
    const start = Date.now();
    const res = await axios.get(`${BACKEND_URL}/api/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const elapsed = `${Date.now() - start}ms`;
    const pass = res.status === 200;
    updateResult(registry, 'api', 'MAP-005', pass ? 'PASS' : 'FAIL',
      pass ? null : `Notifications returned ${res.status}`, elapsed);
    console.log(`[MAP-005] ${pass ? 'PASS' : 'FAIL'}: Notifications API status ${res.status}`);
  } catch (err) {
    updateResult(registry, 'api', 'MAP-005', 'FAIL', err.message, 'N/A');
    console.error('[MAP-005] FAIL:', err.message);
  }

  console.log('[API Tests] Completed.');
}
