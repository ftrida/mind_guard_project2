// tests/rbac_matrix.js - RBAC Matrix Tests
// Tests: Each role token × each role-restricted endpoint

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

async function probe(baseUrl, method, path, token, body = null) {
  if (!token) return { status: 'NO_TOKEN', elapsed: 0 };
  const config = {
    method, url: `${baseUrl}${path}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    validateStatus: () => true, timeout: 8000
  };
  if (body) config.data = body;
  const start = Date.now();
  try {
    const res = await axios(config);
    return { status: res.status, elapsed: Date.now() - start };
  } catch (err) {
    return { status: `ERR:${err.code}`, elapsed: Date.now() - start };
  }
}

// RBAC Matrix definition
// format: { path, method, body, allowedRoles: ['Admin','Super Admin'], deniedRoles: ['Employee'] }
const RBAC_MATRIX = [
  // Admin-only routes
  { path: '/api/admin/overview',           method: 'GET',  body: null, allowed: ['Admin', 'Super Admin'], denied: ['Employee'] },
  { path: '/api/admin/employees',          method: 'GET',  body: null, allowed: ['Admin', 'Super Admin'], denied: ['Employee'] },
  { path: '/api/admin/transcripts',        method: 'GET',  body: null, allowed: ['Admin', 'Super Admin'], denied: ['Employee'] },
  { path: '/api/admin/reports/download',   method: 'GET',  body: null, allowed: ['Admin', 'Super Admin'], denied: ['Employee'] },
  // Protected (all roles)
  { path: '/api/dashboard',                method: 'GET',  body: null, allowed: ['Employee', 'Admin', 'Super Admin'], denied: [] },
  { path: '/api/mood',                     method: 'GET',  body: null, allowed: ['Employee', 'Admin', 'Super Admin'], denied: [] },
  { path: '/api/mood',                     method: 'POST', body: { mood: 'Happy', note: 'rbac test' }, allowed: ['Employee', 'Admin', 'Super Admin'], denied: [] },
  { path: '/api/chats',                    method: 'GET',  body: null, allowed: ['Employee', 'Admin', 'Super Admin'], denied: [] },
  { path: '/api/focus',                    method: 'GET',  body: null, allowed: ['Employee', 'Admin', 'Super Admin'], denied: [] },
  { path: '/api/notifications',            method: 'GET',  body: null, allowed: ['Employee', 'Admin', 'Super Admin'], denied: [] },
  { path: '/api/search',                   method: 'GET',  body: null, allowed: ['Employee', 'Admin', 'Super Admin'], denied: [] },
  { path: '/api/meditation/history',       method: 'GET',  body: null, allowed: ['Employee', 'Admin', 'Super Admin'], denied: [] },
  { path: '/api/games/leaderboard',        method: 'GET',  body: null, allowed: ['Employee', 'Admin', 'Super Admin'], denied: [] },
  // Public routes
  { path: '/api/auth/login',               method: 'POST', body: { email: 'test@t.com', password: 'p' }, allowed: ['PUBLIC'], denied: [] },
  { path: '/api/auth/forgot-password',     method: 'POST', body: { email: 'test@t.com' }, allowed: ['PUBLIC'], denied: [] },
];

export async function runRbacMatrixTests(baseUrl, config, results) {
  console.log('\n[DAST] Running RBAC Matrix Tests...');
  const timestamp = new Date().toISOString();

  const tokens = {
    Employee:    await getToken(baseUrl, config.employeeEmail,   config.employeePassword),
    Admin:       await getToken(baseUrl, config.adminEmail,      config.adminPassword),
    'Super Admin': await getToken(baseUrl, config.superAdminEmail, config.superAdminPassword),
    PUBLIC:      null
  };

  for (const rule of RBAC_MATRIX) {
    // Test allowed roles expect 2xx
    for (const role of rule.allowed) {
      await sleep(DELAY_MS);
      const token = tokens[role];
      const r = await probe(baseUrl, rule.method, rule.path, token, rule.body);
      const pass = r.status < 300;
      results.push({
        endpoint: rule.path,
        method: rule.method,
        role,
        status: r.status,
        expected_status: 200,
        finding: !pass,
        severity: !pass ? 'MEDIUM' : 'NONE',
        response_time_ms: r.elapsed,
        test_category: 'rbac_matrix',
        note: pass
          ? `✓ Role "${role}" has correct access to ${rule.path} (${r.status})`
          : `⚠ Role "${role}" should have access to ${rule.path} but got ${r.status}`,
        timestamp
      });
      const icon = pass ? '✓' : '⚠ MISS';
      console.log(`  [${icon}] ${role} → ${rule.method} ${rule.path} → ${r.status}`);
    }

    // Test denied roles expect 4xx
    for (const role of rule.denied) {
      await sleep(DELAY_MS);
      const token = tokens[role];
      const r = await probe(baseUrl, rule.method, rule.path, token, rule.body);
      const finding = r.status === 200 || r.status === 201;
      results.push({
        endpoint: rule.path,
        method: rule.method,
        role,
        status: r.status,
        expected_status: 403,
        finding,
        severity: finding ? 'HIGH' : 'NONE',
        response_time_ms: r.elapsed,
        test_category: 'rbac_matrix',
        note: finding
          ? `⚠ RBAC FAILURE: Role "${role}" accessed restricted resource ${rule.path}!`
          : `✓ Role "${role}" correctly denied from ${rule.path} (${r.status})`,
        timestamp
      });
      const icon = finding ? '✗ RBAC FAIL' : '✓';
      console.log(`  [${icon}] ${role} → ${rule.method} ${rule.path} (expect deny) → ${r.status}`);
    }
  }

  console.log(`[DAST] RBAC Matrix: ${results.filter(r => r.test_category === 'rbac_matrix' && r.finding).length} RBAC findings.`);
}
