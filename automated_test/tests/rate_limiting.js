// tests/rate_limiting.js - Rate Limiting Tests
// Tests: Bounded burst (~30 requests) to confirm rate limit exists

import axios from 'axios';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function burst(baseUrl, path, method, body, token, count) {
  const promises = [];
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (let i = 0; i < count; i++) {
    const config = {
      method, url: `${baseUrl}${path}`,
      headers, validateStatus: () => true, timeout: 8000
    };
    if (body) config.data = body;
    promises.push(axios(config).then(r => r.status).catch(() => 'ERR'));
  }
  return Promise.all(promises);
}

async function getToken(baseUrl, email, password) {
  try {
    const res = await axios.post(`${baseUrl}/api/auth/login`, { email, password }, {
      headers: { 'Content-Type': 'application/json' }, validateStatus: () => true, timeout: 8000
    });
    return res.data.token || null;
  } catch { return null; }
}

export async function runRateLimitTests(baseUrl, config, results) {
  console.log('\n[DAST] Running Rate Limiting Tests...');
  const timestamp = new Date().toISOString();

  const empToken = await getToken(baseUrl, config.employeeEmail, config.employeePassword);

  // Test 1: Burst on /api/auth/login (30 requests)
  {
    console.log('  → Sending 30 rapid requests to /api/auth/login...');
    const statuses = await burst(baseUrl, '/api/auth/login', 'POST',
      { email: 'probe@test.com', password: 'wrong' }, null, 30);
    const has429 = statuses.some(s => s === 429);
    const has2xx = statuses.some(s => s >= 200 && s < 300);
    const finding = !has429;

    results.push({
      endpoint: '/api/auth/login',
      method: 'POST',
      role: 'UNAUTHENTICATED',
      status: `Codes: ${[...new Set(statuses)].join(', ')}`,
      expected_status: 429,
      finding,
      severity: finding ? 'MEDIUM' : 'NONE',
      response_time_ms: 0,
      test_category: 'rate_limiting',
      note: has429
        ? `✓ Rate limiter active! 429 received in burst of 30 requests.`
        : `⚠ No 429 detected in 30-request burst to login. Rate limit threshold may be too high (300 req/15min).`,
      timestamp
    });
    console.log(`  [${has429 ? '✓' : '⚠ WARNING'}] Login burst 30 req → statuses: ${[...new Set(statuses)].join(', ')}`);
  }

  await sleep(500);

  // Test 2: Burst on /api/mood (30 requests - authenticated)
  if (empToken) {
    console.log('  → Sending 30 rapid requests to /api/mood...');
    const statuses = await burst(baseUrl, '/api/mood', 'GET', null, empToken, 30);
    const has429 = statuses.some(s => s === 429);

    results.push({
      endpoint: '/api/mood',
      method: 'GET',
      role: 'Employee',
      status: `Codes: ${[...new Set(statuses)].join(', ')}`,
      expected_status: 429,
      finding: !has429,
      severity: !has429 ? 'LOW' : 'NONE',
      response_time_ms: 0,
      test_category: 'rate_limiting',
      note: has429
        ? `✓ Rate limiter active on /api/mood!`
        : `⚠ No 429 on 30-request burst to /api/mood. Global limiter at 300 req/15min window.`,
      timestamp
    });
    console.log(`  [${has429 ? '✓' : '⚠'}] Mood burst 30 req → statuses: ${[...new Set(statuses)].join(', ')}`);
  }

  await sleep(500);

  // Test 3: Rate limit on forgot-password (brute force protection)
  {
    console.log('  → Sending 20 rapid requests to /api/auth/forgot-password...');
    const statuses = await burst(baseUrl, '/api/auth/forgot-password', 'POST',
      { email: 'probe@test.com' }, null, 20);
    const has429 = statuses.some(s => s === 429);

    results.push({
      endpoint: '/api/auth/forgot-password',
      method: 'POST',
      role: 'UNAUTHENTICATED',
      status: `Codes: ${[...new Set(statuses)].join(', ')}`,
      expected_status: 429,
      finding: !has429,
      severity: !has429 ? 'MEDIUM' : 'NONE',
      response_time_ms: 0,
      test_category: 'rate_limiting',
      note: has429
        ? `✓ Rate limiter blocks password reset flooding!`
        : `⚠ No 429 on 20-req burst to forgot-password. Brute-force risk on password reset.`,
      timestamp
    });
    console.log(`  [${has429 ? '✓' : '⚠'}] Forgot-password burst → statuses: ${[...new Set(statuses)].join(', ')}`);
  }

  // Test 4: Verify rate limit header presence in responses
  try {
    const res = await axios.get(`${baseUrl}/api/dashboard`, {
      headers: { Authorization: `Bearer ${empToken}`, 'Content-Type': 'application/json' },
      validateStatus: () => true, timeout: 8000
    });
    const hasRateLimitHeader = !!(
      res.headers['x-ratelimit-limit'] ||
      res.headers['ratelimit-limit'] ||
      res.headers['retry-after']
    );
    results.push({
      endpoint: '/api/dashboard',
      method: 'GET',
      role: 'Employee',
      status: res.status,
      expected_status: 200,
      finding: !hasRateLimitHeader,
      severity: !hasRateLimitHeader ? 'LOW' : 'NONE',
      response_time_ms: 0,
      test_category: 'rate_limiting',
      note: hasRateLimitHeader
        ? `✓ Rate-limit headers present in response headers.`
        : `⚠ No rate-limit headers (X-RateLimit-Limit etc.) in response. Clients cannot self-throttle.`,
      timestamp
    });
    console.log(`  [${hasRateLimitHeader ? '✓' : '⚠'}] Rate-limit headers check → ${hasRateLimitHeader ? 'present' : 'missing'}`);
  } catch {}

  console.log(`[DAST] Rate Limiting: ${results.filter(r => r.test_category === 'rate_limiting' && r.finding).length} findings.`);
}
