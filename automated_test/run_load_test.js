// run_load_test.js - MindGuard API Baseline Load Testing Suite
// ═══════════════════════════════════════════════════════════════════════════
// Simulates 100 virtual users (VUs) running concurrently for 60 seconds
// hits endpoints, collects RPS, latency stats (Min, Avg, Max, P95, P99),
// and outputs results to a beautifully formatted Excel report.
// ═══════════════════════════════════════════════════════════════════════════

import axios from 'axios';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';

const BASE_URL = 'http://localhost:5000';
const TEST_DURATION_MS = 60 * 1000; // 1 minute
const CONCURRENCY = 340; // 340 virtual users
const THINK_TIME_MS = 50; // 50ms delay between requests to simulate user interaction

const ENDPOINTS = [
  { path: '/api/auth/me', method: 'GET' },
  { path: '/api/dashboard', method: 'GET' },
  { path: '/api/mood', method: 'GET' },
  { path: '/api/meditation/favorites', method: 'GET' }
];

// Mongoose User Schema to ensure seed user exists and password is known
const UserSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Employee' }
}, { collection: 'users' });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function setupTestUser() {
  console.log('[Setup] Connecting to MongoDB to verify seed user...');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mindguard';
  await mongoose.connect(mongoUri);

  // LoadTestPassword123! pre-computed bcrypt hash (rounds = 10)
  const passwordHash = '$2a$10$kHbdynSRz22dGPU1AzwKLuxtVE9mFXLfNrtLruo3hfifWbPU.f3.S';
  
  let employee = await User.findOne({ email: 'employee@mindguard.com' });
  if (employee) {
    console.log('[Setup] Employee user exists. Updating password hash to LoadTestPassword123!...');
    employee.password = passwordHash;
    await employee.save();
  } else {
    console.log('[Setup] Employee user does not exist. Creating new user employee@mindguard.com...');
    employee = new User({
      fullName: 'John Doe',
      email: 'employee@mindguard.com',
      password: passwordHash,
      role: 'Employee'
    });
    await employee.save();
  }
  
  await mongoose.disconnect();
  console.log('[Setup] MongoDB connection closed. Seed user verified successfully.');
}

async function getAuthToken() {
  console.log('[Auth] Authenticating employee@mindguard.com...');
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: 'employee@mindguard.com',
    password: 'LoadTestPassword123!'
  });

  const setCookieHeader = response.headers['set-cookie'];
  let token = '';
  if (setCookieHeader) {
    for (const cookie of setCookieHeader) {
      if (cookie.startsWith('token=')) {
        token = cookie.split(';')[0].split('=')[1];
        break;
      }
    }
  }

  if (!token) {
    throw new Error('Could not retrieve auth token cookie from login response headers.');
  }

  console.log('[Auth] Logged in successfully. Token acquired.');
  return token;
}

async function runVirtualUser(vuId, token, endTime, results) {
  const instance = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Authorization': `Bearer ${token}`
    },
    validateStatus: () => true // Prevent axios from throwing error on non-200 responses
  });

  while (Date.now() < endTime) {
    // Pick an endpoint randomly
    const ep = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
    const start = Date.now();
    
    let status = 0;
    let success = false;
    
    try {
      const res = await instance.request({
        url: ep.path,
        method: ep.method,
        timeout: 5000
      });
      status = res.status;
      success = status >= 200 && status < 300;
    } catch (err) {
      status = err.response?.status || 500;
      success = false;
    }
    
    const end = Date.now();
    const duration = end - start;

    results.push({
      timestamp: new Date(start).toISOString(),
      vuId,
      endpoint: ep.path,
      method: ep.method,
      status,
      latency: duration,
      success
    });

    // Simulated user think time
    await new Promise(resolve => setTimeout(resolve, THINK_TIME_MS));
  }
}

async function exportToExcel(summary, endpointStats, rawLogs) {
  console.log('\n[Export] Generating Excel report...');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MindGuard Load Testing Runner';
  workbook.created = new Date();

  const COLORS = {
    headerBg: 'FF1F3864',  // Navy
    headerFg: 'FFFFFFFF',  // White
    accentBg: 'FFDEEBF7',  // Soft Blue
    alertRedBg: 'FFFCE4D6', // Pale Red
    alertGreenBg: 'FFE2F0D9', // Pale Green
    border: 'FFD9D9D9',
    altRow: 'FFF9FAFB',
    textMain: 'FF000000'
  };

  // ────────────────────────────────────────────────────────────────────────
  // Sheet 1: Summary Sheet
  // ────────────────────────────────────────────────────────────────────────
  const sumSheet = workbook.addWorksheet('📊 Load Test Summary');
  sumSheet.views = [{ showGridLines: true }];

  // Title Row
  sumSheet.mergeCells('B2:I2');
  const titleCell = sumSheet.getCell('B2');
  titleCell.value = 'MINDGUARD API BASELINE LOAD TESTING REPORT';
  titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerFg } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sumSheet.getRow(2).height = 40;

  // Metadata Card Info
  sumSheet.getCell('B4').value = 'Test Execution Date';
  sumSheet.getCell('C4').value = new Date().toLocaleString();
  sumSheet.getCell('B5').value = 'Test Target Host';
  sumSheet.getCell('C5').value = BASE_URL;
  sumSheet.getCell('B6').value = 'Duration (seconds)';
  sumSheet.getCell('C6').value = summary.durationSeconds;
  sumSheet.getCell('B7').value = 'Concurrency (VUs)';
  sumSheet.getCell('C7').value = summary.concurrency;

  const metaCells = ['B4', 'B5', 'B6', 'B7'];
  metaCells.forEach(cellId => {
    sumSheet.getCell(cellId).font = { bold: true };
    sumSheet.getCell(cellId).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accentBg } };
  });

  // KPI Metrics Table
  sumSheet.getCell('E4').value = 'Total Requests';
  sumSheet.getCell('F4').value = summary.totalRequests;
  sumSheet.getCell('E5').value = 'Average RPS';
  sumSheet.getCell('F5').value = Number(summary.averageRps.toFixed(2));
  sumSheet.getCell('E6').value = 'Success Rate';
  sumSheet.getCell('F6').value = Number((summary.successRate * 100).toFixed(2)) + '%';
  sumSheet.getCell('E7').value = 'Failed Requests';
  sumSheet.getCell('F7').value = summary.failedRequests;

  sumSheet.getCell('H4').value = 'Min Response Time';
  sumSheet.getCell('I4').value = summary.minLatency + ' ms';
  sumSheet.getCell('H5').value = 'Avg Response Time';
  sumSheet.getCell('I5').value = Math.round(summary.avgLatency) + ' ms';
  sumSheet.getCell('H6').value = 'Max Response Time';
  sumSheet.getCell('I6').value = summary.maxLatency + ' ms';
  sumSheet.getCell('H7').value = 'P95 Response Time';
  sumSheet.getCell('I7').value = summary.p95 + ' ms';

  const kpiLabels = ['E4', 'E5', 'E6', 'E7', 'H4', 'H5', 'H6', 'H7'];
  kpiLabels.forEach(cellId => {
    sumSheet.getCell(cellId).font = { bold: true };
    sumSheet.getCell(cellId).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accentBg } };
  });

  // Borders & alignment for metadata / KPI cells
  const borderThin = {
    top: { style: 'thin', color: { argb: COLORS.border } },
    left: { style: 'thin', color: { argb: COLORS.border } },
    bottom: { style: 'thin', color: { argb: COLORS.border } },
    right: { style: 'thin', color: { argb: COLORS.border } }
  };
  
  for (let r = 4; r <= 7; r++) {
    for (let col = 2; col <= 9; col++) {
      const cell = sumSheet.getCell(r, col);
      cell.border = borderThin;
      cell.alignment = { vertical: 'middle' };
    }
  }

  // Section: Endpoints performance breakdown
  sumSheet.getCell('B9').value = 'ENDPOINT BREAKDOWN STATISTICS';
  sumSheet.getCell('B9').font = { bold: true, size: 12, color: { argb: 'FF1F3864' } };

  const breakdownHeaders = ['Endpoint', 'Method', 'Requests', 'Success Rate', 'Min Latency', 'Avg Latency', 'Max Latency', 'P95'];
  breakdownHeaders.forEach((header, index) => {
    const colLetter = String.fromCharCode(66 + index); // Starts at 'B' (index = 0)
    const cell = sumSheet.getCell(`${colLetter}10`);
    cell.value = header;
    cell.font = { bold: true, color: { argb: COLORS.headerFg } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  sumSheet.getRow(10).height = 28;

  let currentRow = 11;
  for (const stats of endpointStats) {
    sumSheet.getCell(`B${currentRow}`).value = stats.endpoint;
    sumSheet.getCell(`C${currentRow}`).value = stats.method;
    sumSheet.getCell(`D${currentRow}`).value = stats.requests;
    sumSheet.getCell(`E${currentRow}`).value = Number((stats.successRate * 100).toFixed(2)) + '%';
    sumSheet.getCell(`F${currentRow}`).value = stats.min + ' ms';
    sumSheet.getCell(`G${currentRow}`).value = Math.round(stats.avg) + ' ms';
    sumSheet.getCell(`H${currentRow}`).value = stats.max + ' ms';
    sumSheet.getCell(`I${currentRow}`).value = stats.p95 + ' ms';

    // Stylize row cells
    for (let col = 2; col <= 9; col++) {
      const cell = sumSheet.getCell(currentRow, col);
      cell.border = borderThin;
      cell.alignment = { vertical: 'middle', horizontal: col === 2 ? 'left' : 'center' };
      if (currentRow % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.altRow } };
      }
    }
    currentRow++;
  }

  // Adjust column widths
  sumSheet.getColumn('A').width = 3;
  sumSheet.getColumn('B').width = 32; // Endpoint
  sumSheet.getColumn('C').width = 12; // Method
  sumSheet.getColumn('D').width = 14; // Requests
  sumSheet.getColumn('E').width = 16; // Success Rate
  sumSheet.getColumn('F').width = 16; // Min Latency
  sumSheet.getColumn('G').width = 16; // Avg Latency
  sumSheet.getColumn('H').width = 16; // Max Latency
  sumSheet.getColumn('I').width = 16; // P95

  // ────────────────────────────────────────────────────────────────────────
  // Sheet 2: Raw Logs Sheet
  // ────────────────────────────────────────────────────────────────────────
  const rawSheet = workbook.addWorksheet('📈 Raw Latency Data', {
    views: [{ state: 'frozen', ySplit: 1 }]
  });

  rawSheet.columns = [
    { header: 'Request ID', key: 'id', width: 12 },
    { header: 'Timestamp', key: 'timestamp', width: 24 },
    { header: 'VU ID', key: 'vuId', width: 10 },
    { header: 'Endpoint', key: 'endpoint', width: 32 },
    { header: 'Method', key: 'method', width: 12 },
    { header: 'Status Code', key: 'status', width: 14 },
    { header: 'Latency (ms)', key: 'latency', width: 15 },
    { header: 'Success', key: 'success', width: 12 }
  ];

  // Populate raw log rows
  rawLogs.forEach((log, index) => {
    const row = rawSheet.addRow({
      id: index + 1,
      timestamp: log.timestamp,
      vuId: `VU-${log.vuId}`,
      endpoint: log.endpoint,
      method: log.method,
      status: log.status,
      latency: log.latency,
      success: log.success ? 'Success' : 'Failed'
    });

    // Formatting cell styles & colors
    const isEven = index % 2 === 0;
    row.eachCell((cell, colNum) => {
      cell.border = borderThin;
      cell.alignment = { vertical: 'middle', horizontal: colNum === 4 ? 'left' : 'center' };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.altRow } };
      }
    });

    // Color success and failure differently
    const successCell = row.getCell('success');
    if (log.success) {
      successCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.alertGreenBg } };
      successCell.font = { color: { argb: 'FF375623' }, bold: true };
    } else {
      successCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.alertRedBg } };
      successCell.font = { color: { argb: 'FFC00000' }, bold: true };
    }
  });

  // Header row formatting on Sheet 2
  const rawHeader = rawSheet.getRow(1);
  rawHeader.height = 32;
  rawHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { color: { argb: COLORS.headerFg }, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Enable autofilter on Sheet 2
  rawSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 8 } };

  // Write report
  const filename = 'load_test_report.xlsx';
  await workbook.xlsx.writeFile(filename);
  console.log(`[Export] Report saved as "${filename}"`);
}

// Helper to compute P95 and P99 percentiles
function getPercentile(latencies, percentile) {
  if (latencies.length === 0) return 0;
  const sorted = [...latencies].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║               MINDGUARD API BASELINE LOAD TESTER                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  
  // 1. Setup Test User Credentials
  try {
    await setupTestUser();
  } catch (err) {
    console.error(`[Error] Database setup failed: ${err.message}`);
    process.exit(1);
  }

  // 2. Obtain Auth Token
  let token = '';
  try {
    token = await getAuthToken();
  } catch (err) {
    console.error(`[Error] Authentication failed: ${err.message}`);
    console.error(`Make sure the backend is running at ${BASE_URL} and the environment is configured.`);
    process.exit(1);
  }

  console.log(`\n[Execution] Starting Load Test:`);
  console.log(`  - Concurrency: ${CONCURRENCY} virtual users`);
  console.log(`  - Duration: ${TEST_DURATION_MS / 1000} seconds`);
  console.log(`  - Targets: ${ENDPOINTS.map(e => e.path).join(', ')}`);
  console.log('------------------------------------------------------------------');

  const startTime = Date.now();
  const endTime = startTime + TEST_DURATION_MS;
  const results = [];

  // Spawn VUs
  const vuPromises = [];
  for (let i = 1; i <= CONCURRENCY; i++) {
    vuPromises.push(runVirtualUser(i, token, endTime, results));
  }

  // Log progress during execution
  const progressInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const reqCount = results.length;
    const currentRps = elapsed > 0 ? (reqCount / elapsed).toFixed(1) : 0;
    console.log(`[Progress] Running for ${elapsed}s... Total Requests: ${reqCount} (${currentRps} req/sec)`);
  }, 5000);

  // Wait for load test to complete
  await Promise.all(vuPromises);
  clearInterval(progressInterval);
  console.log('[Execution] Load test completed.');

  // 3. Process metrics
  const totalRequests = results.length;
  const durationSec = Math.round((Date.now() - startTime) / 1000);
  const averageRps = totalRequests / durationSec;
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = totalRequests - successfulRequests;
  const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0;

  const latencies = results.map(r => r.latency);
  const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0;
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
  const p95 = getPercentile(latencies, 95);
  const p99 = getPercentile(latencies, 99);

  const summary = {
    durationSeconds: durationSec,
    concurrency: CONCURRENCY,
    totalRequests,
    averageRps,
    successRate,
    failedRequests,
    minLatency,
    avgLatency,
    maxLatency,
    p95,
    p99
  };

  // Endpoint-specific metrics
  const endpointStats = [];
  for (const ep of ENDPOINTS) {
    const epResults = results.filter(r => r.endpoint === ep.path);
    const epLatencies = epResults.map(r => r.latency);
    const epTotal = epResults.length;
    const epSuccess = epResults.filter(r => r.success).length;
    const epSuccessRate = epTotal > 0 ? epSuccess / epTotal : 0;
    const epMin = epLatencies.length > 0 ? Math.min(...epLatencies) : 0;
    const epMax = epLatencies.length > 0 ? Math.max(...epLatencies) : 0;
    const epAvg = epLatencies.length > 0 ? epLatencies.reduce((a, b) => a + b, 0) / epLatencies.length : 0;
    const epP95 = getPercentile(epLatencies, 95);

    endpointStats.push({
      endpoint: ep.path,
      method: ep.method,
      requests: epTotal,
      successRate: epSuccessRate,
      min: epMin,
      max: epMax,
      avg: epAvg,
      p95: epP95
    });
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║                   LOAD TEST STATISTICS SUMMARY                   ║');
  console.log('╠══════════════════════════════════════════════════════════════════╣');
  console.log(`║  Total Requests Sent : ${String(totalRequests).padEnd(41)}║`);
  console.log(`║  Success Rate        : ${String((successRate * 100).toFixed(2) + '%').padEnd(41)}║`);
  console.log(`║  Requests Per Second : ${String(averageRps.toFixed(2)).padEnd(41)}║`);
  console.log(`║  Min Response Time   : ${String(minLatency + ' ms').padEnd(41)}║`);
  console.log(`║  Avg Response Time   : ${String(Math.round(avgLatency) + ' ms').padEnd(41)}║`);
  console.log(`║  Max Response Time   : ${String(maxLatency + ' ms').padEnd(41)}║`);
  console.log(`║  P95 Response Time   : ${String(p95 + ' ms').padEnd(41)}║`);
  console.log(`║  P99 Response Time   : ${String(p99 + ' ms').padEnd(41)}║`);
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // 4. Export to Excel
  await exportToExcel(summary, endpointStats, results);
  console.log('[Finished] Load testing script execution complete.');
}

main().catch(err => {
  console.error('[Fatal] Execution failed:', err);
  process.exit(1);
});
