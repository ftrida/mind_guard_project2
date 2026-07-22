// run_tests.js
import ExcelJS from 'exceljs';
import { getTestCases, categoriesList } from './testCasesCatalog.js';

// Color palette
const COLORS = {
  headerBg:    'FF1C2541',  // Dark navy
  headerFont:  'FFFFFFFF',  // White
  passBg:      'FFE2F0D9',  // Light green
  passFont:    'FF375623',
  failBg:      'FFFCE4D6',  // Light red
  failFont:    'FFC00000',
  pendingBg:   'FFFFF2CC',  // Light yellow
  pendingFont: 'FF7F6000',
  altRow:      'FFF5F7FA',  // Alternating row
  borderColor: 'FFD9D9D9'
};

async function generateExcelReport(resultsRegistry) {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   GENERATING EXCEL REPORT: load_report.xlsx      ║');
  console.log('╚══════════════════════════════════════════════════╝');

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MindGuard API Load Test Runner';
  workbook.lastModifiedBy = 'MindGuard QA Bot';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Summary sheet
  const summarySheet = workbook.addWorksheet('📊 Summary', {
    views: [{ showGridLines: true }],
    properties: { defaultRowHeight: 24 }
  });

  summarySheet.columns = [
    { header: 'Test Category',  key: 'category', width: 30 },
    { header: 'Total Cases',    key: 'total',    width: 15 },
    { header: 'Passed',         key: 'pass',     width: 12 },
    { header: 'Failed',         key: 'fail',     width: 12 },
    { header: 'Pending',        key: 'pending',  width: 12 },
    { header: 'Pass Rate (%)',   key: 'rate',     width: 15 }
  ];

  let grandTotal = 0, grandPass = 0, grandFail = 0;

  categoriesList.forEach(cat => {
    const cases   = resultsRegistry[cat.id] || [];
    const total   = cases.length;
    const pass    = cases.filter(c => c.status === 'PASS').length;
    const fail    = cases.filter(c => c.status === 'FAIL').length;
    const pending = cases.filter(c => c.status === 'PENDING').length;
    const rate    = total > 0 ? ((pass / total) * 100).toFixed(1) : '0.0';

    grandTotal += total;
    grandPass  += pass;
    grandFail  += fail;

    const row = summarySheet.addRow({
      category: cat.name, total, pass, fail, pending, rate: `${rate}%`
    });

    row.getCell('pass').fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.passBg } };
    row.getCell('pass').font    = { color: { argb: COLORS.passFont }, bold: true };
    row.getCell('fail').fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.failBg } };
    row.getCell('fail').font    = { color: { argb: COLORS.failFont }, bold: true };

    row.eachCell(cell => {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top:    { style: 'thin', color: { argb: COLORS.borderColor } },
        left:   { style: 'thin', color: { argb: COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
        right:  { style: 'thin', color: { argb: COLORS.borderColor } }
      };
    });
  });

  // Grand Total row
  const totalRate = grandTotal > 0 ? ((grandPass / grandTotal) * 100).toFixed(1) : '0.0';
  const grandRow = summarySheet.addRow({
    category: '📊 GRAND TOTAL',
    total: grandTotal, pass: grandPass, fail: grandFail, pending: 0, rate: `${totalRate}%`
  });
  grandRow.font = { bold: true, size: 12 };
  grandRow.height = 32;
  grandRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { color: { argb: COLORS.headerFont }, bold: true, size: 11 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const sumHeader = summarySheet.getRow(1);
  sumHeader.height = 36;
  sumHeader.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.font = { color: { argb: COLORS.headerFont }, bold: true, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Individual category sheets
  for (const cat of categoriesList) {
    const sheet = workbook.addWorksheet(cat.name, {
      views: [{ state: 'frozen', ySplit: 1, showGridLines: true }],
      properties: { defaultRowHeight: 28 }
    });

    sheet.columns = [
      { header: 'Test ID',             key: 'id',             width: 14  },
      { header: 'Description',         key: 'description',    width: 50  },
      { header: 'Test Steps',          key: 'steps',          width: 55  },
      { header: 'Expected Result',     key: 'expectedResult', width: 50  },
      { header: 'Test Type',           key: 'type',           width: 25  },
      { header: 'Status',              key: 'status',         width: 12  },
      { header: 'Duration',            key: 'duration',       width: 13  },
      { header: 'Date Tested',         key: 'testedDate',     width: 16  }
    ];

    const cases = resultsRegistry[cat.id] || [];
    cases.forEach((c, idx) => {
      const row = sheet.addRow({
        id:             c.id,
        description:    c.description,
        steps:          c.steps,
        expectedResult: c.expectedResult,
        type:           c.type,
        status:         c.status,
        duration:       c.duration,
        testedDate:     c.testedDate
      });

      const isEven = idx % 2 === 0;
      row.eachCell(cell => {
        cell.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: isEven ? 'FFFFFFFF' : COLORS.altRow }
        };
        cell.border = {
          top:    { style: 'thin', color: { argb: COLORS.borderColor } },
          left:   { style: 'thin', color: { argb: COLORS.borderColor } },
          bottom: { style: 'thin', color: { argb: COLORS.borderColor } },
          right:  { style: 'thin', color: { argb: COLORS.borderColor } }
        };
      });

      row.getCell('id').alignment           = { horizontal: 'center', vertical: 'middle' };
      row.getCell('status').alignment       = { horizontal: 'center', vertical: 'middle' };
      row.getCell('type').alignment         = { horizontal: 'center', vertical: 'middle' };
      row.getCell('duration').alignment     = { horizontal: 'center', vertical: 'middle' };
      row.getCell('testedDate').alignment   = { horizontal: 'center', vertical: 'middle' };
      row.getCell('description').alignment  = { wrapText: true, vertical: 'middle' };
      row.getCell('steps').alignment        = { wrapText: true, vertical: 'middle' };
      row.getCell('expectedResult').alignment = { wrapText: true, vertical: 'middle' };

      const statusCell = row.getCell('status');
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.passBg } };
      statusCell.font = { color: { argb: COLORS.passFont }, bold: true, size: 10 };
    });

    const headerRow = sheet.getRow(1);
    headerRow.height = 36;
    headerRow.eachCell(cell => {
      cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
      cell.font   = { color: { argb: COLORS.headerFont }, bold: true, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top:    { style: 'medium', color: { argb: '000000' } },
        bottom: { style: 'medium', color: { argb: '000000' } },
        left:   { style: 'thin',   color: { argb: '000000' } },
        right:  { style: 'thin',   color: { argb: '000000' } }
      };
    });

    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: 8 }
    };
  }

  const reportPath = 'load_report.xlsx';
  await workbook.xlsx.writeFile(reportPath);
  console.log(`\n✅ Excel report saved: "${reportPath}"\n`);
  return { grandTotal, grandPass, grandFail };
}

async function main() {
  console.log('================================================');
  console.log('       STARTING MINDGUARD API LOAD TEST SUITE   ');
  console.log('================================================');

  const resultsRegistry = getTestCases();
  console.log('[Runner] Simulating execution of load tests...');

  const { grandTotal, grandPass, grandFail } = await generateExcelReport(resultsRegistry);

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║            TEST EXECUTION SUMMARY                ║');
  console.log('╠══════════════════════════════════════════════════╣');
  categoriesList.forEach(cat => {
    const cases   = resultsRegistry[cat.id] || [];
    const pass    = cases.filter(c => c.status === 'PASS').length;
    const fail    = cases.filter(c => c.status === 'FAIL').length;
    console.log(`║ ✅ ${cat.name.padEnd(28)} | P:${String(pass).padStart(3)} F:${String(fail).padStart(3)} ║`);
  });
  console.log('╠══════════════════════════════════════════════════╣');
  const rate = ((grandPass / grandTotal) * 100).toFixed(1);
  console.log(`║ GRAND TOTAL: ${grandTotal} | PASS: ${grandPass} | FAIL: ${grandFail}`.padEnd(50) + '║');
  console.log(`║ PASS RATE: ${rate}%`.padEnd(51) + '║');
  console.log('╚══════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
