// tests/token_tampering.js - JWT Token Tampering Tests
// Tests: Flip JWT claims without re-signing — server MUST reject

import axios from 'axios';
import jwt from 'jsonwebtoken';

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

async function probe(baseUrl, method, path, token) {
  const config = {
    method, url: `${baseUrl}${path}`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    validateStatus: () => true, timeout: 8000
  };
  const start = Date.now();
  const res = await axios(config);
  return { status: res.status, elapsed: Date.now() - start, data: res.data };
}

function tamperClaims(originalToken, newClaims) {
  try {
    // Decode without verifying
    const decoded = jwt.decode(originalToken);
    if (!decoded) return null;
    // Create payload with tampered claims (signed with WRONG secret)
    const tampered = { ...decoded, ...newClaims };
    // Sign with a wrong secret to simulate tampering (server should reject)
    return jwt.sign(tampered, 'wrong_secret_attacker_key', { expiresIn: '1h' });
  } catch { return null; }
}

function createExpiredToken(baseUrl, email) {
  // Create a properly structured but expired token
  try {
    return jwt.sign(
      { id: '000000000000000000000001', email },
      'super_secret_mindguard_jwt_key_1234567890_abc',
      { expiresIn: '-1s' }  // Already expired
    );
  } catch { return null; }
}

export async function runTokenTamperingTests(baseUrl, config, results) {
  console.log('\n[DAST] Running Token Tampering Tests...');
  const timestamp = new Date().toISOString();

  const empToken = await getToken(baseUrl, config.employeeEmail, config.employeePassword);
  if (!empToken) {
    console.warn('[DAST] Token Tampering: Could not get employee token, skipping.');
    return;
  }

  const PROBE_PATH   = '/api/dashboard';
  const ADMIN_PATH   = '/api/admin/overview';

  // Test 1: Expired token
  const expiredToken = createExpiredToken(baseUrl, config.employeeEmail);
  if (expiredToken) {
    await sleep(DELAY_MS);
    const r = await probe(baseUrl, 'GET', PROBE_PATH, expiredToken);
    const finding = r.status === 200;
    results.push({
      endpoint: PROBE_PATH, method: 'GET', role: 'EXPIRED_TOKEN',
      status: r.status, expected_status: 401, finding,
      severity: finding ? 'CRITICAL' : 'NONE',
      response_time_ms: r.elapsed, test_category: 'token_tampering',
      note: finding
        ? '⚠ CRITICAL: Expired JWT accepted by server!'
        : `✓ Expired JWT correctly rejected (${r.status})`,
      timestamp
    });
    console.log(`  [${finding ? '✗ CRITICAL' : '✓'}] Expired token → GET ${PROBE_PATH} → ${r.status}`);
  }

  // Test 2: Role escalation claim (Employee → Admin) with wrong secret
  const roleEscalated = tamperClaims(empToken, { role: 'Admin' });
  if (roleEscalated) {
    await sleep(DELAY_MS);
    const r = await probe(baseUrl, 'GET', ADMIN_PATH, roleEscalated);
    const finding = r.status === 200;
    results.push({
      endpoint: ADMIN_PATH, method: 'GET', role: 'TAMPERED_ROLE_ESCALATION',
      status: r.status, expected_status: 401, finding,
      severity: finding ? 'CRITICAL' : 'NONE',
      response_time_ms: r.elapsed, test_category: 'token_tampering',
      note: finding
        ? '⚠ CRITICAL: Server accepted role-escalated tampered JWT! Admin panel breached!'
        : `✓ Role escalation tampered token correctly rejected (${r.status})`,
      timestamp
    });
    console.log(`  [${finding ? '✗ CRITICAL' : '✓'}] Role tamper (Employee→Admin) → ${ADMIN_PATH} → ${r.status}`);
  }

  // Test 3: userId substitution (sub claim changed to different user ID)
  const idSubstituted = tamperClaims(empToken, { id: '000000000000000000000099' });
  if (idSubstituted) {
    await sleep(DELAY_MS);
    const r = await probe(baseUrl, 'GET', PROBE_PATH, idSubstituted);
    const finding = r.status === 200;
    results.push({
      endpoint: PROBE_PATH, method: 'GET', role: 'TAMPERED_USER_ID',
      status: r.status, expected_status: 401, finding,
      severity: finding ? 'CRITICAL' : 'NONE',
      response_time_ms: r.elapsed, test_category: 'token_tampering',
      note: finding
        ? '⚠ CRITICAL: Server accepted user-ID-substituted JWT!'
        : `✓ User ID substitution tampered token rejected (${r.status})`,
      timestamp
    });
    console.log(`  [${finding ? '✗ CRITICAL' : '✓'}] User ID tamper → ${PROBE_PATH} → ${r.status}`);
  }

  // Test 4: Algorithm confusion - "none" algorithm
  try {
    const decoded = jwt.decode(empToken);
    if (decoded) {
      // Craft a "none" algorithm token manually
      const header  = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ ...decoded, role: 'Admin' })).toString('base64url');
      const noneToken = `${header}.${payload}.`;
      await sleep(DELAY_MS);
      const r = await probe(baseUrl, 'GET', ADMIN_PATH, noneToken);
      const finding = r.status === 200;
      results.push({
        endpoint: ADMIN_PATH, method: 'GET', role: 'ALG_NONE',
        status: r.status, expected_status: 401, finding,
        severity: finding ? 'CRITICAL' : 'NONE',
        response_time_ms: r.elapsed, test_category: 'token_tampering',
        note: finding
          ? '⚠ CRITICAL: "alg:none" JWT accepted! Algorithm confusion vulnerability!'
          : `✓ "alg:none" JWT correctly rejected (${r.status})`,
        timestamp
      });
      console.log(`  [${finding ? '✗ CRITICAL' : '✓'}] alg:none JWT → ${ADMIN_PATH} → ${r.status}`);
    }
  } catch {}

  // Test 5: Empty signature token
  try {
    const decoded = jwt.decode(empToken);
    const parts = empToken.split('.');
    const noSigToken = `${parts[0]}.${parts[1]}.`;
    await sleep(DELAY_MS);
    const r = await probe(baseUrl, 'GET', PROBE_PATH, noSigToken);
    const finding = r.status === 200;
    results.push({
      endpoint: PROBE_PATH, method: 'GET', role: 'EMPTY_SIGNATURE',
      status: r.status, expected_status: 401, finding,
      severity: finding ? 'HIGH' : 'NONE',
      response_time_ms: r.elapsed, test_category: 'token_tampering',
      note: finding
        ? '⚠ HIGH: Empty signature JWT accepted by server!'
        : `✓ Empty signature JWT rejected (${r.status})`,
      timestamp
    });
    console.log(`  [${finding ? '✗ HIGH' : '✓'}] Empty signature JWT → ${PROBE_PATH} → ${r.status}`);
  } catch {}

  console.log(`[DAST] Token Tampering: ${results.filter(r => r.test_category === 'token_tampering' && r.finding).length} findings.`);
}
