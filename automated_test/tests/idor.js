// tests/idor.js - IDOR (Insecure Direct Object Reference) Tests
// Tests: Vary ID parameters to reach another principal's objects

import axios from 'axios';

const DELAY_MS = 200;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getToken(baseUrl, email, password) {
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, { email, password }, {
      headers: { 'Content-Type': 'application/json' }, validateStatus: () => true, timeout: 8000
    });
    return res.data.token || null;
  } catch { return null; }
}

async function makeRequest(baseUrl, method, path, token, body = null) {
  const config = {
    method, url: `${baseUrl}${path}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    validateStatus: () => true, timeout: 8000
  };
  if (body) config.data = body;
  const start = Date.now();
  const res = await axios(config);
  return { status: res.status, elapsed: Date.now() - start, data: res.data };
}

// Common ObjectID-looking test values
const FAKE_IDS = [
  '000000000000000000000001',
  '111111111111111111111111',
  '60f7b3b3b3b3b3b3b3b3b3b3',
  '507f1f77bcf86cd799439011',
  'ffffffffffffffffffffffff',
  '000000000000000000000000',
];

export async function runIdorTests(baseUrl, config, results) {
  console.log('\n[DAST] Running IDOR Tests...');
  const timestamp = new Date().toISOString();

  const empToken   = await getToken(baseUrl, config.employeeEmail, config.employeePassword);
  const adminToken = await getToken(baseUrl, config.adminEmail, config.adminPassword);

  if (!empToken || !adminToken) {
    console.warn('[DAST] IDOR: Could not obtain tokens, skipping.');
    return;
  }

  // Test 1: Access chat by random IDs (employee should NOT see other users' chats)
  for (const fakeId of FAKE_IDS.slice(0, 4)) {
    await sleep(DELAY_MS);
    const r = await makeRequest(baseUrl, 'GET', `/api/chats/${fakeId}`, empToken);
    const finding = r.status === 200 && r.data && r.data.success;
    results.push({
      endpoint: `/api/chats/${fakeId}`,
      method: 'GET',
      role: 'Employee',
      status: r.status,
      expected_status: 404,
      finding,
      severity: finding ? 'HIGH' : 'NONE',
      response_time_ms: r.elapsed,
      test_category: 'idor',
      note: finding
        ? `⚠ IDOR: Employee accessed chat ID ${fakeId} that is not their own!`
        : `✓ Access to random chat ID ${fakeId} correctly rejected (${r.status})`,
      timestamp
    });
    const icon = finding ? '✗ IDOR!' : '✓';
    console.log(`  [${icon}] GET /api/chats/${fakeId.substring(0, 8)}... (employee) → ${r.status}`);
  }

  // Test 2: Admin accessing employee-specific notifications with spoofed IDs
  for (const fakeId of FAKE_IDS.slice(0, 3)) {
    await sleep(DELAY_MS);
    const r = await makeRequest(baseUrl, 'PATCH', `/api/notifications/${fakeId}/read`, empToken);
    const finding = r.status === 200 && r.data && r.data.success;
    results.push({
      endpoint: `/api/notifications/${fakeId}/read`,
      method: 'PATCH',
      role: 'Employee',
      status: r.status,
      expected_status: 404,
      finding,
      severity: finding ? 'MEDIUM' : 'NONE',
      response_time_ms: r.elapsed,
      test_category: 'idor',
      note: finding
        ? `⚠ IDOR: Employee modified notification ${fakeId} belonging to another user!`
        : `✓ Access to random notification ID rejected (${r.status})`,
      timestamp
    });
    const icon = finding ? '✗ IDOR!' : '✓';
    console.log(`  [${icon}] PATCH /api/notifications/${fakeId.substring(0, 8)}... → ${r.status}`);
  }

  // Test 3: Admin transcript IDOR - accessing random transcript IDs
  for (const fakeId of FAKE_IDS.slice(0, 4)) {
    await sleep(DELAY_MS);
    const r = await makeRequest(baseUrl, 'GET', `/api/admin/transcripts/${fakeId}`, adminToken);
    const finding = r.status === 200 && r.data && r.data.success;
    results.push({
      endpoint: `/api/admin/transcripts/${fakeId}`,
      method: 'GET',
      role: 'Admin',
      status: r.status,
      expected_status: 404,
      finding,
      severity: finding ? 'MEDIUM' : 'NONE',
      response_time_ms: r.elapsed,
      test_category: 'idor',
      note: finding
        ? `⚠ IDOR: Admin accessed arbitrary transcript ID ${fakeId}`
        : `✓ Random transcript ID correctly returns 404 (${r.status})`,
      timestamp
    });
    const icon = finding ? '✗' : '✓';
    console.log(`  [${icon}] GET /api/admin/transcripts/${fakeId.substring(0, 8)}... (admin) → ${r.status}`);
  }

  // Test 4: Employee PUT to admin employee endpoint with fake ID
  for (const fakeId of FAKE_IDS.slice(0, 2)) {
    await sleep(DELAY_MS);
    const r = await makeRequest(baseUrl, 'PUT', `/api/admin/employees/${fakeId}`, empToken, { fullName: 'DAST IDOR Test' });
    const finding = r.status === 200;
    results.push({
      endpoint: `/api/admin/employees/${fakeId}`,
      method: 'PUT',
      role: 'Employee',
      status: r.status,
      expected_status: 403,
      finding,
      severity: finding ? 'CRITICAL' : 'NONE',
      response_time_ms: r.elapsed,
      test_category: 'idor',
      note: finding
        ? `⚠ CRITICAL IDOR: Employee modified admin employee resource!`
        : `✓ Employee admin employee modification blocked (${r.status})`,
      timestamp
    });
    console.log(`  [${finding ? '✗ CRITICAL' : '✓'}] PUT /api/admin/employees/${fakeId.substring(0,8)}... (employee) → ${r.status}`);
  }

  console.log(`[DAST] IDOR: ${results.filter(r => r.test_category === 'idor' && r.finding).length} IDOR findings.`);
}
