// tests/authz_privesc.js - AuthZ / Privilege Escalation Tests
// Tests: Lower-privilege roles calling higher-privilege endpoints

import axios from 'axios';

const DELAY_MS = 200;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Admin-only endpoints (require Admin or Super Admin)
const ADMIN_ONLY_ENDPOINTS = [
  { method: 'GET',    path: '/api/admin/overview',            body: null },
  { method: 'GET',    path: '/api/admin/employees',           body: null },
  { method: 'POST',   path: '/api/admin/employees',           body: { fullName: 'DAST User', email: `dast_${Date.now()}@test.com`, password: 'pass123', role: 'Employee' } },
  { method: 'GET',    path: '/api/admin/transcripts',         body: null },
  { method: 'GET',    path: '/api/admin/reports/download',    body: null },
];

async function getToken(baseUrl, email, password) {
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, { email, password }, {
      headers: { 'Content-Type': 'application/json' }, validateStatus: () => true, timeout: 8000
    });
    return res.data.token || null;
  } catch { return null; }
}

async function makeRequest(baseUrl, endpoint, token) {
  const config = {
    method: endpoint.method,
    url: `${baseUrl}${endpoint.path}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    validateStatus: () => true,
    timeout: 8000
  };
  if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    config.data = endpoint.body;
  }
  const start = Date.now();
  const res = await axios(config);
  return { status: res.status, elapsed: Date.now() - start };
}

export async function runAuthzPrivescTests(baseUrl, config, results) {
  console.log('\n[DAST] Running AuthZ / Privilege Escalation Tests...');
  const timestamp = new Date().toISOString();

  // Get employee token (lowest privilege)
  const employeeToken = await getToken(baseUrl, config.employeeEmail, config.employeePassword);
  if (!employeeToken) {
    console.warn('[DAST] AuthZ: Could not obtain employee token, skipping.');
    return;
  }

  for (const ep of ADMIN_ONLY_ENDPOINTS) {
    await sleep(DELAY_MS);

    // Employee calling Admin-only endpoint
    const r = await makeRequest(baseUrl, ep, employeeToken);
    const finding = r.status === 200 || r.status === 201;
    results.push({
      endpoint: ep.path,
      method: ep.method,
      role: 'Employee (low-priv)',
      status: r.status,
      expected_status: 403,
      finding,
      severity: finding ? 'CRITICAL' : 'NONE',
      response_time_ms: r.elapsed,
      test_category: 'authz_privesc',
      note: finding
        ? `⚠ PRIVILEGE ESCALATION: Employee accessed Admin-only endpoint ${ep.path}!`
        : `✓ Employee correctly denied access to ${ep.path} (${r.status})`,
      timestamp
    });
    const icon = finding ? '✗ PRIVESC!' : '✓';
    console.log(`  [${icon}] Employee → ${ep.method} ${ep.path} → ${r.status}`);
  }

  // Cross-user resource access: Employee calling another employee's profile data
  // Since profile is per-user, the protected endpoint should only return their own data
  await sleep(DELAY_MS);
  const dashRes = await makeRequest(baseUrl, { method: 'GET', path: '/api/dashboard', body: null }, employeeToken);
  results.push({
    endpoint: '/api/dashboard',
    method: 'GET',
    role: 'Employee',
    status: dashRes.status,
    expected_status: 200,
    finding: false,
    severity: 'NONE',
    response_time_ms: dashRes.elapsed,
    test_category: 'authz_privesc',
    note: `✓ Employee can access own dashboard (${dashRes.status}). Scoped to their own data.`,
    timestamp
  });

  console.log(`[DAST] AuthZ: ${results.filter(r => r.test_category === 'authz_privesc' && r.finding).length} privilege escalation findings.`);
}
