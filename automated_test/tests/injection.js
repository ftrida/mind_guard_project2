// tests/injection.js - Injection Probe Tests (SQLi / NoSQLi / XSS detection only)
// Detection only: flags anomalous status/errors/timing. Does NOT extract data.

import axios from 'axios';

const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function getToken(baseUrl, email, password) {
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, { email, password }, {
      headers: { 'Content-Type': 'application/json' }, validateStatus: () => true, timeout: 8000
    });
    return res.data.token || null;
  } catch { return null; }
}

async function probe(baseUrl, method, path, token, body) {
  const config = {
    method, url: `${baseUrl}${path}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    validateStatus: () => true, timeout: 10000, data: body
  };
  const start = Date.now();
  try {
    const res = await axios(config);
    const elapsed = Date.now() - start;
    const bodyStr = JSON.stringify(res.data || '').toLowerCase();
    return {
      status: res.status, elapsed,
      hasError: bodyStr.includes('error') || bodyStr.includes('stack') || bodyStr.includes('traceback'),
      hasLeak: bodyStr.includes('mongodb') || bodyStr.includes('mongoose') || bodyStr.includes('password') ||
               bodyStr.includes('jwt_secret') || bodyStr.includes('__v'),
      bodySnippet: JSON.stringify(res.data || '').substring(0, 200)
    };
  } catch (err) {
    return { status: 'NETWORK_ERR', elapsed: Date.now() - start, hasError: true, hasLeak: false, bodySnippet: err.message };
  }
}

// NoSQL injection payloads
const NOSQL_PAYLOADS = [
  { email: { '$gt': '' }, password: { '$gt': '' } },
  { email: { '$ne': null }, password: { '$ne': null } },
  { email: 'admin@mindguard.com', password: { '$gt': '' } },
  { email: { '$regex': '.*' }, password: 'password123' },
  { email: { '$where': 'sleep(500)' }, password: 'x' },
];

// XSS payloads in input fields
const XSS_PAYLOADS = [
  '<script>alert(1)</script>',
  '"><img src=x onerror=alert(1)>',
  "' OR '1'='1",
  '${7*7}',
  '{{7*7}}',
];

export async function runInjectionTests(baseUrl, config, results) {
  console.log('\n[DAST] Running Injection Probe Tests...');
  const timestamp = new Date().toISOString();

  const empToken = await getToken(baseUrl, config.employeeEmail, config.employeePassword);

  // 1. NoSQL Injection in login endpoint
  for (const payload of NOSQL_PAYLOADS) {
    await sleep(DELAY_MS);
    const r = await probe(baseUrl, 'POST', '/api/auth/login', null, payload);
    const slowResponse = r.elapsed > 2000;
    const finding = (r.status === 200 && r.bodySnippet.includes('token')) ||
                    r.hasLeak || slowResponse;
    const severity = finding
      ? (r.status === 200 ? 'CRITICAL' : slowResponse ? 'HIGH' : 'MEDIUM')
      : 'NONE';
    results.push({
      endpoint: '/api/auth/login',
      method: 'POST',
      role: 'UNAUTHENTICATED',
      status: r.status,
      expected_status: 401,
      finding,
      severity,
      response_time_ms: r.elapsed,
      test_category: 'injection',
      note: finding
        ? `⚠ NoSQL INJECTION: payload triggered anomaly (status=${r.status}, time=${r.elapsed}ms, leak=${r.hasLeak})`
        : `✓ NoSQL payload rejected correctly (${r.status}, ${r.elapsed}ms)`,
      timestamp
    });
    const icon = finding ? `✗ (${severity})` : '✓';
    console.log(`  [${icon}] NoSQL probe /api/auth/login → ${r.status} in ${r.elapsed}ms`);
  }

  // 2. XSS payloads in mood note field
  if (empToken) {
    for (const xssPayload of XSS_PAYLOADS) {
      await sleep(DELAY_MS);
      const r = await probe(baseUrl, 'POST', '/api/mood', empToken, {
        mood: 'Happy',
        note: xssPayload
      });
      // XSS detection: if server echoes back unescaped payload
      const echoed = r.bodySnippet.includes('<script>') || r.bodySnippet.includes('onerror=');
      const finding = echoed || r.hasLeak;
      results.push({
        endpoint: '/api/mood',
        method: 'POST',
        role: 'Employee',
        status: r.status,
        expected_status: 201,
        finding,
        severity: finding ? 'HIGH' : 'NONE',
        response_time_ms: r.elapsed,
        test_category: 'injection',
        note: finding
          ? `⚠ XSS: Server echoed unescaped script payload in response!`
          : `✓ XSS payload stored/rejected without echo in response (${r.status})`,
        timestamp
      });
      console.log(`  [${finding ? '✗ XSS' : '✓'}] XSS probe /api/mood → ${r.status}`);
    }

    // 3. Template injection in chat message
    for (const payload of ['{{7*7}}', '${7*7}', '<%=7*7%>']) {
      await sleep(DELAY_MS);
      const r = await probe(baseUrl, 'POST', '/api/chats', empToken, {
        message: payload, type: 'initial'
      });
      const finding = r.hasLeak || r.bodySnippet.includes('49');
      results.push({
        endpoint: '/api/chats',
        method: 'POST',
        role: 'Employee',
        status: r.status,
        expected_status: 201,
        finding,
        severity: finding ? 'HIGH' : 'NONE',
        response_time_ms: r.elapsed,
        test_category: 'injection',
        note: finding
          ? `⚠ TEMPLATE INJECTION: Payload "${payload}" may have been evaluated!`
          : `✓ Template injection payload handled safely (${r.status})`,
        timestamp
      });
      console.log(`  [${finding ? '✗' : '✓'}] Template injection /api/chats → ${r.status}`);
    }

    // 4. Search endpoint injection
    const searchPayloads = ["'; DROP TABLE users; --", '{"$gt":""}', '<img src=x>'];
    for (const sp of searchPayloads) {
      await sleep(DELAY_MS);
      const r = await probe(baseUrl, 'GET', `/api/search?q=${encodeURIComponent(sp)}`, empToken, null);
      const finding = r.hasLeak || r.status === 500;
      results.push({
        endpoint: '/api/search',
        method: 'GET',
        role: 'Employee',
        status: r.status,
        expected_status: 200,
        finding,
        severity: finding ? 'HIGH' : 'NONE',
        response_time_ms: r.elapsed,
        test_category: 'injection',
        note: finding
          ? `⚠ INJECTION: Search query "${sp.substring(0,30)}" triggered error/leak`
          : `✓ Search injection payload handled safely (${r.status})`,
        timestamp
      });
      console.log(`  [${finding ? '✗' : '✓'}] Injection probe /api/search → ${r.status}`);
    }
  }

  console.log(`[DAST] Injection: ${results.filter(r => r.test_category === 'injection' && r.finding).length} injection findings.`);
}
