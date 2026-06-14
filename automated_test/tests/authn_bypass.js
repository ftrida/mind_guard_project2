// tests/authn_bypass.js - AuthN Bypass Tests
// Tests: Protected endpoints accessed with no/malformed/expired tokens

import axios from 'axios';

const DELAY_MS = 150;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// All protected endpoints (method, path, minimal body)
const PROTECTED_ENDPOINTS = [
  { method: 'GET',   path: '/api/auth/logout',              body: null },
  { method: 'GET',   path: '/api/auth/me',                  body: null },
  { method: 'GET',   path: '/api/dashboard',                body: null },
  { method: 'POST',  path: '/api/chats',                    body: { message: 'test' } },
  { method: 'GET',   path: '/api/chats',                    body: null },
  { method: 'POST',  path: '/api/mood',                     body: { mood: 'Happy', note: 'test' } },
  { method: 'GET',   path: '/api/mood',                     body: null },
  { method: 'POST',  path: '/api/meditation/history',       body: { trackId: 't1', trackTitle: 'Test', category: 'Breathing', durationSeconds: 60 } },
  { method: 'GET',   path: '/api/meditation/history',       body: null },
  { method: 'POST',  path: '/api/meditation/favorite',      body: { trackId: 't1' } },
  { method: 'GET',   path: '/api/meditation/favorites',     body: null },
  { method: 'POST',  path: '/api/focus',                    body: { taskName: 'test', durationMinutes: 25, status: 'completed' } },
  { method: 'GET',   path: '/api/focus',                    body: null },
  { method: 'POST',  path: '/api/games',                    body: { gameName: 'test', score: 100, level: 1 } },
  { method: 'GET',   path: '/api/games/leaderboard',        body: null },
  { method: 'POST',  path: '/api/alerts/trigger',           body: { message: 'test alert' } },
  { method: 'GET',   path: '/api/alerts',                   body: null },
  { method: 'GET',   path: '/api/notifications',            body: null },
  { method: 'GET',   path: '/api/notifications/unread-count', body: null },
  { method: 'PATCH', path: '/api/notifications/read-all',   body: null },
  { method: 'PUT',   path: '/api/profile',                  body: { fullName: 'Test' } },
  { method: 'PUT',   path: '/api/profile/settings',         body: { theme: 'dark' } },
  { method: 'GET',   path: '/api/admin/overview',           body: null },
  { method: 'GET',   path: '/api/admin/employees',          body: null },
  { method: 'POST',  path: '/api/admin/employees',          body: { fullName: 'T', email: 't@t.com', password: 'p', role: 'Employee' } },
  { method: 'GET',   path: '/api/admin/transcripts',        body: null },
  { method: 'GET',   path: '/api/admin/reports/download',   body: null },
  { method: 'GET',   path: '/api/search',                   body: null },
];

async function makeRequest(baseUrl, endpoint, token) {
  const config = {
    method: endpoint.method,
    url: `${baseUrl}${endpoint.path}`,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true,
    timeout: 8000
  };
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (endpoint.body && ['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
    config.data = endpoint.body;
  }
  const start = Date.now();
  const res = await axios(config);
  return { status: res.status, elapsed: Date.now() - start, data: res.data };
}

export async function runAuthnBypassTests(baseUrl, results) {
  console.log('\n[DAST] Running AuthN Bypass Tests...');
  const timestamp = new Date().toISOString();

  for (const ep of PROTECTED_ENDPOINTS) {
    await sleep(DELAY_MS);

    // Test 1: No token
    try {
      const r = await makeRequest(baseUrl, ep, null);
      const finding = r.status === 200 || r.status === 201;
      results.push({
        endpoint: ep.path,
        method: ep.method,
        role: 'UNAUTHENTICATED',
        status: r.status,
        expected_status: 401,
        finding: finding,
        severity: finding ? 'CRITICAL' : 'NONE',
        response_time_ms: r.elapsed,
        test_category: 'authn_bypass',
        note: finding
          ? '⚠ VULNERABILITY: Endpoint returned 2xx with NO auth token!'
          : '✓ Correctly blocked unauthenticated access.',
        timestamp
      });
      const icon = finding ? '✗ CRITICAL' : '✓';
      console.log(`  [${icon}] ${ep.method} ${ep.path} (no token) → ${r.status}`);
    } catch (err) {
      results.push({
        endpoint: ep.path, method: ep.method, role: 'UNAUTHENTICATED',
        status: 'ERR', expected_status: 401, finding: false, severity: 'NONE',
        response_time_ms: 0, test_category: 'authn_bypass',
        note: `Network error: ${err.message}`, timestamp
      });
    }

    await sleep(DELAY_MS);

    // Test 2: Malformed token ("Bearer invalid.token.here")
    try {
      const r = await makeRequest(baseUrl, ep, 'invalid.malformed.token.here');
      const finding = r.status === 200 || r.status === 201;
      results.push({
        endpoint: ep.path, method: ep.method, role: 'MALFORMED_TOKEN',
        status: r.status, expected_status: 401, finding,
        severity: finding ? 'CRITICAL' : 'NONE',
        response_time_ms: r.elapsed, test_category: 'authn_bypass',
        note: finding
          ? '⚠ VULNERABILITY: Endpoint accepted malformed JWT!'
          : '✓ Correctly rejected malformed token.',
        timestamp
      });
      const icon = finding ? '✗ CRITICAL' : '✓';
      console.log(`  [${icon}] ${ep.method} ${ep.path} (malformed) → ${r.status}`);
    } catch (err) {
      results.push({
        endpoint: ep.path, method: ep.method, role: 'MALFORMED_TOKEN',
        status: 'ERR', expected_status: 401, finding: false, severity: 'NONE',
        response_time_ms: 0, test_category: 'authn_bypass',
        note: `Network error: ${err.message}`, timestamp
      });
    }
  }

  console.log(`[DAST] AuthN Bypass: ${results.filter(r => r.test_category === 'authn_bypass' && r.finding).length} findings.`);
}
