// run_dast.js - MindGuard DAST Test Runner + Excel + JSON Report Generator
// ═══════════════════════════════════════════════════════════════════════════
// DAST Categories:
//   1. AuthN Bypass        - Protected endpoints with no/malformed/expired token
//   2. AuthZ / PrivEsc     - Lower-privilege role calling higher-privilege endpoint
//   3. IDOR                - ID parameter variation to reach another user's objects
//   4. RBAC Matrix         - Each role × each endpoint
//   5. Token Tampering     - JWT claim flips, alg:none, expired tokens
//   6. Injection Probes    - NoSQL, XSS, template injection detection
//   7. Rate Limiting       - Bounded burst to confirm limit exists
//   8. Hardcoded Creds     - Codebase scan for committed secrets
// ═══════════════════════════════════════════════════════════════════════════

import ExcelJS from 'exceljs';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { runAuthnBypassTests }   from './tests/authn_bypass.js';
import { runAuthzPrivescTests }  from './tests/authz_privesc.js';
import { runIdorTests }          from './tests/idor.js';
import { runRbacMatrixTests }    from './tests/rbac_matrix.js';
import { runTokenTamperingTests } from './tests/token_tampering.js';
import { runInjectionTests }     from './tests/injection.js';
import { runRateLimitTests }     from './tests/rate_limiting.js';
import { runHardcodedCredsTests } from './tests/hardcoded_creds.js';
import { runAppiumTests }        from './tests/appium_mobile.js';
import { runSeleniumTests }      from './tests/selenium_web.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Load config ────────────────────────────────────
const inputPath = join(__dirname, 'input.json');
let config;
try {
  config = JSON.parse(readFileSync(inputPath, 'utf-8'));
} catch (err) {
  console.error(`❌ Cannot read input.json: ${err.message}`);
  process.exit(1);
}
const BASE_URL = config.baseUrl || 'http://localhost:5000';

// ── Discovered Endpoints ───────────────────────────
const DISCOVERED_ENDPOINTS = [
  // Public
  { method: 'POST',  path: '/api/auth/register',              access: 'Public' },
  { method: 'POST',  path: '/api/auth/login',                 access: 'Public' },
  { method: 'POST',  path: '/api/auth/forgot-password',       access: 'Public' },
  { method: 'POST',  path: '/api/auth/reset-password/:token', access: 'Public' },
  // Protected (any role)
  { method: 'GET',   path: '/api/auth/logout',                access: 'Authenticated' },
  { method: 'GET',   path: '/api/auth/me',                    access: 'Authenticated' },
  { method: 'GET',   path: '/api/dashboard',                  access: 'Authenticated' },
  { method: 'POST',  path: '/api/chats',                      access: 'Authenticated' },
  { method: 'GET',   path: '/api/chats',                      access: 'Authenticated' },
  { method: 'GET',   path: '/api/chats/:id',                  access: 'Authenticated' },
  { method: 'POST',  path: '/api/chats/:id/messages',         access: 'Authenticated' },
  { method: 'POST',  path: '/api/mood',                       access: 'Authenticated' },
  { method: 'GET',   path: '/api/mood',                       access: 'Authenticated' },
  { method: 'POST',  path: '/api/meditation/history',         access: 'Authenticated' },
  { method: 'GET',   path: '/api/meditation/history',         access: 'Authenticated' },
  { method: 'POST',  path: '/api/meditation/favorite',        access: 'Authenticated' },
  { method: 'GET',   path: '/api/meditation/favorites',       access: 'Authenticated' },
  { method: 'POST',  path: '/api/focus',                      access: 'Authenticated' },
  { method: 'GET',   path: '/api/focus',                      access: 'Authenticated' },
  { method: 'POST',  path: '/api/games',                      access: 'Authenticated' },
  { method: 'GET',   path: '/api/games/leaderboard',          access: 'Authenticated' },
  { method: 'POST',  path: '/api/alerts/trigger',             access: 'Authenticated' },
  { method: 'GET',   path: '/api/alerts',                     access: 'Authenticated' },
  { method: 'GET',   path: '/api/notifications',              access: 'Authenticated' },
  { method: 'GET',   path: '/api/notifications/unread-count', access: 'Authenticated' },
  { method: 'PATCH', path: '/api/notifications/read-all',     access: 'Authenticated' },
  { method: 'PATCH', path: '/api/notifications/:id/read',     access: 'Authenticated' },
  { method: 'PUT',   path: '/api/profile',                    access: 'Authenticated' },
  { method: 'PUT',   path: '/api/profile/settings',           access: 'Authenticated' },
  { method: 'GET',   path: '/api/search',                     access: 'Authenticated' },
  // Admin-only
  { method: 'GET',   path: '/api/admin/overview',             access: 'Admin|Super Admin' },
  { method: 'GET',   path: '/api/admin/employees',            access: 'Admin|Super Admin' },
  { method: 'POST',  path: '/api/admin/employees',            access: 'Admin|Super Admin' },
  { method: 'PUT',   path: '/api/admin/employees/:id',        access: 'Admin|Super Admin' },
  { method: 'DELETE',path: '/api/admin/employees/:id',        access: 'Admin|Super Admin' },
  { method: 'GET',   path: '/api/admin/transcripts',          access: 'Admin|Super Admin' },
  { method: 'GET',   path: '/api/admin/transcripts/:id',      access: 'Admin|Super Admin' },
  { method: 'GET',   path: '/api/admin/reports/download',     access: 'Admin|Super Admin' },
];

// ── Print Endpoint Discovery ───────────────────────
function printDiscoveredEndpoints() {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║         STEP 1: DISCOVERED API ENDPOINTS                        ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Base URL: ${BASE_URL.padEnd(54)}║`);
  console.log(`║  Total Endpoints Discovered: ${String(DISCOVERED_ENDPOINTS.length).padEnd(35)}║`);
  console.log('╠═════╦═════════╦══════════════════════════════════╦═══════════════╣');
  console.log('║  #  ║ Method  ║ Path                             ║ Access Rule   ║');
  console.log('╠═════╬═════════╬══════════════════════════════════╬═══════════════╣');
  DISCOVERED_ENDPOINTS.forEach((ep, i) => {
    const num    = String(i + 1).padStart(3);
    const method = ep.method.padEnd(7);
    const path   = ep.path.padEnd(32);
    const access = ep.access.padEnd(13);
    console.log(`║  ${num} ║ ${method} ║ ${path} ║ ${access} ║`);
  });
  console.log('╚═════╩═════════╩══════════════════════════════════╩═══════════════╝\n');
}

// ── Excel Report Generator ─────────────────────────
async function generateExcelReport(results) {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  GENERATING DAST EXCEL REPORT               ║');
  console.log('╚══════════════════════════════════════════════╝');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'MindGuard DAST Runner';
  wb.created = new Date();

  const COLORS = {
    critical:  'FFFF0000',  // Red
    high:      'FFFF6600',  // Orange
    medium:    'FFFFFF00',  // Yellow
    low:       'FF92D050',  // Light green
    none:      'FFE2F0D9',  // Pale green
    header:    'FF1F3864',  // Dark blue
    headerFg:  'FFFFFFFF',
    altRow:    'FFF2F2F2'
  };

  // ── Per-category sheets ──────────────────────────
  const categories = [
    { id: 'authn_bypass',    name: 'AuthN Bypass',       prefix: 'AB' },
    { id: 'authz_privesc',   name: 'AuthZ PrivEsc',      prefix: 'AP' },
    { id: 'idor',            name: 'IDOR',               prefix: 'ID' },
    { id: 'rbac_matrix',     name: 'RBAC Matrix',        prefix: 'RM' },
    { id: 'token_tampering', name: 'Token Tampering',    prefix: 'TT' },
    { id: 'injection',       name: 'Injection Probes',   prefix: 'IJ' },
    { id: 'rate_limiting',   name: 'Rate Limiting',      prefix: 'RL' },
    { id: 'hardcoded_creds', name: 'Hardcoded Secrets',  prefix: 'HC' },
    { id: 'appium_mobile',   name: 'Appium Mobile Tests',prefix: 'AM' },
    { id: 'selenium_web',    name: 'Selenium Web Tests', prefix: 'SW' },
  ];

  const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };

  for (const cat of categories) {
    const sheet = wb.addWorksheet(cat.name, {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'ID',               key: 'num',            width: 6  },
      { header: 'Endpoint / File',  key: 'endpoint',       width: 40 },
      { header: 'Method',           key: 'method',         width: 10 },
      { header: 'Role',             key: 'role',           width: 20 },
      { header: 'Status Code',      key: 'status',         width: 14 },
      { header: 'Expected',         key: 'expected_status',width: 12 },
      { header: 'Finding?',         key: 'finding',        width: 10 },
      { header: 'Severity',         key: 'severity',       width: 12 },
      { header: 'Response (ms)',    key: 'response_time_ms',width: 14 },
      { header: 'Note',             key: 'note',           width: 60 },
      { header: 'Timestamp',        key: 'timestamp',      width: 22 }
    ];

    const catResults = results
      .filter(r => r.test_category === cat.id)
      .sort((a, b) => (severityOrder[a.severity] || 4) - (severityOrder[b.severity] || 4));

    catResults.forEach((r, idx) => {
      const row = sheet.addRow({
        num:             idx + 1,
        endpoint:        r.endpoint,
        method:          r.method,
        role:            r.role,
        status:          String(r.status),
        expected_status: String(r.expected_status),
        finding:         r.finding ? '⚠ FINDING' : '✓ OK',
        severity:        r.severity,
        response_time_ms: r.response_time_ms,
        note:            r.note,
        timestamp:       r.timestamp
      });

      // Severity-based row color
      const sev = (r.severity || 'NONE').toUpperCase();
      const bgColor = sev === 'CRITICAL' ? 'FFFCE4D6' :
                      sev === 'HIGH'     ? 'FFFFF2CC' :
                      sev === 'MEDIUM'   ? 'FFDEEBF7' :
                      sev === 'LOW'      ? 'FFE2F0D9' :
                                           'FFFFFFFF';

      if (r.finding) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        });
      } else if (idx % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.altRow } };
        });
      }

      // Finding cell bold red
      const findingCell = row.getCell('finding');
      if (r.finding) findingCell.font = { bold: true, color: { argb: 'FFC00000' } };

      // Severity cell bold
      const sevCell = row.getCell('severity');
      sevCell.font = { bold: true };
      if (sev === 'CRITICAL') sevCell.font = { ...sevCell.font, color: { argb: 'FFC00000' } };
      else if (sev === 'HIGH') sevCell.font = { ...sevCell.font, color: { argb: 'FFD26B00' } };

      row.eachCell(cell => {
        cell.border = {
          top:    { style: 'thin', color: { argb: 'FFD9D9D9' } },
          left:   { style: 'thin', color: { argb: 'FFD9D9D9' } },
          bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
          right:  { style: 'thin', color: { argb: 'FFD9D9D9' } }
        };
        cell.alignment = { vertical: 'middle', wrapText: true };
      });
    });

    // Header row
    const hr = sheet.getRow(1);
    hr.height = 36;
    hr.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
      cell.font = { color: { argb: COLORS.headerFg }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 11 } };
  }

  // ── Endpoint Discovery Sheet ─────────────────────
  const discSheet = wb.addWorksheet('🔍 Endpoints', { views: [{ state: 'frozen', ySplit: 1 }] });
  discSheet.columns = [
    { header: '#',           key: 'num',    width: 6  },
    { header: 'Method',     key: 'method', width: 10 },
    { header: 'Path',       key: 'path',   width: 45 },
    { header: 'Access Rule',key: 'access', width: 22 },
  ];
  DISCOVERED_ENDPOINTS.forEach((ep, i) => {
    const row = discSheet.addRow({ num: i + 1, method: ep.method, path: ep.path, access: ep.access });
    const bgColor = ep.access === 'Public' ? 'FFE2F0D9' :
                    ep.access.includes('Admin') ? 'FFFCE4D6' : 'FFDEEBF7';
    row.eachCell(c => {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      c.alignment = { vertical: 'middle' };
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
  });
  const discHr = discSheet.getRow(1);
  discHr.height = 32;
  discHr.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    c.font = { color: { argb: COLORS.headerFg }, bold: true, size: 11 };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // ── Summary Sheet ────────────────────────────────
  const sumSheet = wb.addWorksheet('📊 DAST Summary');
  sumSheet.columns = [
    { header: 'Category',           key: 'cat',       width: 24 },
    { header: 'Tests Run',          key: 'tests',     width: 12 },
    { header: 'Findings',          key: 'findings',  width: 12 },
    { header: 'Critical',          key: 'critical',  width: 12 },
    { header: 'High',              key: 'high',      width: 10 },
    { header: 'Medium',            key: 'medium',    width: 10 },
    { header: 'Low',               key: 'low',       width: 10 },
    { header: 'Risk Level',        key: 'risk',      width: 14 },
  ];

  let grandTests = 0, grandFindings = 0;
  for (const cat of categories) {
    const catR = results.filter(r => r.test_category === cat.id);
    const findings = catR.filter(r => r.finding);
    const critical = findings.filter(r => r.severity === 'CRITICAL').length;
    const high     = findings.filter(r => r.severity === 'HIGH').length;
    const medium   = findings.filter(r => r.severity === 'MEDIUM').length;
    const low      = findings.filter(r => r.severity === 'LOW').length;
    const risk     = critical > 0 ? '🔴 CRITICAL' : high > 0 ? '🟠 HIGH' : medium > 0 ? '🟡 MEDIUM' : low > 0 ? '🟢 LOW' : '✅ CLEAN';

    grandTests    += catR.length;
    grandFindings += findings.length;

    const row = sumSheet.addRow({ cat: cat.name, tests: catR.length, findings: findings.length, critical, high, medium, low, risk });

    if (critical > 0) row.getCell('risk').font = { bold: true, color: { argb: 'FFC00000' } };
    else if (high > 0) row.getCell('risk').font = { bold: true, color: { argb: 'FFD26B00' } };
    else row.getCell('risk').font = { bold: true, color: { argb: 'FF375623' } };

    row.eachCell(c => {
      c.alignment = { horizontal: 'center', vertical: 'middle' };
      c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });
    row.getCell('cat').alignment = { horizontal: 'left', vertical: 'middle' };
  }

  // Grand total row
  const gtRow = sumSheet.addRow({ cat: 'GRAND TOTAL', tests: grandTests, findings: grandFindings, critical: '', high: '', medium: '', low: '', risk: grandFindings === 0 ? '✅ CLEAN' : `⚠ ${grandFindings} FINDINGS` });
  gtRow.font = { bold: true, size: 11 };
  gtRow.height = 32;
  gtRow.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    c.font = { color: { argb: COLORS.headerFg }, bold: true, size: 11 };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const sumHr = sumSheet.getRow(1);
  sumHr.height = 36;
  sumHr.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
    c.font = { color: { argb: COLORS.headerFg }, bold: true, size: 11 };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Summary and Endpoints sheets will appear at the end as moveWorksheet is not supported in this exceljs version

  const xlPath = 'dast_report.xlsx';
  await wb.xlsx.writeFile(xlPath);
  console.log(`\n✅ DAST Excel report saved: "${xlPath}"`);

  return { grandTests, grandFindings };
}

// ── Main ─────────────────────────────────────────
async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║   MINDGUARD DAST - DYNAMIC APPLICATION SECURITY TESTING          ║
║   Base URL: ${BASE_URL.padEnd(51)}║
║   Mode: Detection-only | No destructive writes                   ║
╚══════════════════════════════════════════════════════════════════╝`);

  // Step 1: Endpoint discovery
  printDiscoveredEndpoints();

  const results = [];

  // Step 2–3: Run all DAST test categories
  await runAuthnBypassTests(BASE_URL, results);
  await runAuthzPrivescTests(BASE_URL, config, results);
  await runIdorTests(BASE_URL, config, results);
  await runRbacMatrixTests(BASE_URL, config, results);
  await runTokenTamperingTests(BASE_URL, config, results);
  await runInjectionTests(BASE_URL, config, results);
  await runRateLimitTests(BASE_URL, config, results);
  await runHardcodedCredsTests(BASE_URL, config, results);
  await runAppiumTests(BASE_URL, results);
  await runSeleniumTests(BASE_URL, results);

  // Step 4: Write report.json
  const jsonPath = 'report.json';
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ JSON report saved: "${jsonPath}" (${results.length} records)`);

  // Step 4: Generate Excel report
  const { grandTests, grandFindings } = await generateExcelReport(results);

  // ── Final console summary ─────────────────────
  const criticalFindings = results.filter(r => r.finding && r.severity === 'CRITICAL');
  const highFindings     = results.filter(r => r.finding && r.severity === 'HIGH');
  const mediumFindings   = results.filter(r => r.finding && r.severity === 'MEDIUM');
  const lowFindings      = results.filter(r => r.finding && r.severity === 'LOW');

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  DAST FINAL REPORT SUMMARY                       ║
╠══════════════════════════════════════════════════════════════════╣
║  Endpoints Discovered : ${String(DISCOVERED_ENDPOINTS.length).padEnd(40)}║
║  Tests Executed       : ${String(grandTests).padEnd(40)}║
║  Total Findings       : ${String(grandFindings).padEnd(40)}║
╠══════════════════════════════════════════════════════════════════╣
║  🔴 CRITICAL : ${String(criticalFindings.length).padEnd(47)}║
║  🟠 HIGH     : ${String(highFindings.length).padEnd(47)}║
║  🟡 MEDIUM   : ${String(mediumFindings.length).padEnd(47)}║
║  🟢 LOW      : ${String(lowFindings.length).padEnd(47)}║
╠══════════════════════════════════════════════════════════════════╣`);

  if (criticalFindings.length > 0) {
    console.log('║  TOP CRITICAL ISSUES TO FIX:                                    ║');
    criticalFindings.slice(0, 3).forEach((f, i) => {
      const line = `  ${i + 1}. ${f.method} ${f.endpoint.substring(0, 35)}`;
      console.log(`║${line.padEnd(66)}║`);
    });
  } else {
    console.log('║  ✅ No critical vulnerabilities found.                           ║');
  }

  console.log(`╠══════════════════════════════════════════════════════════════════╣`);
  console.log(`║  📊 Excel:  dast_report.xlsx                                    ║`);
  console.log(`║  📋 JSON:   report.json                                         ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
