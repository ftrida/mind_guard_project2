// run_tests.js
import ExcelJS from 'exceljs';
import { createDriver } from './utils.js';
import { getTestCases, categoriesList } from './testCasesCatalog.js';

// Import individual test modules
import { runFunctionalTests } from './tests/functional.test.js';
import { runUiTests } from './tests/ui.test.js';
import { runCompatibilityTests } from './tests/compatibility.test.js';
import { runPerformanceTests } from './tests/performance.test.js';
import { runSecurityTests } from './tests/security.test.js';
import { runApiTests } from './tests/api.test.js';
import { runDatabaseTests } from './tests/database.test.js';
import { runAccessibilityTests } from './tests/accessibility.test.js';
import { runMobileTests } from './tests/mobile.test.js';
import { runRegressionTests } from './tests/regression.test.js';
import { runE2eTests } from './tests/e2e.test.js';

async function main() {
  console.log('================================================');
  console.log('       STARTING MINDGUARD SELENIUM TEST SUITE   ');
  console.log('================================================');

  // Initialize test cases results registry with all 1,100+ cases
  const resultsRegistry = getTestCases();
  let driver;

  try {
    // 1. Create Selenium Web Driver (Default: Headless mode)
    driver = await createDriver(true);
    console.log('[Runner] WebDriver initialized successfully in headless mode.');

    // 2. Execute automated test suites sequentially
    // Functional Tests
    try {
      await runFunctionalTests(driver, resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in functional tests module:', err.message);
    }

    // UI-UX Tests
    try {
      await runUiTests(driver, resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in UI-UX tests module:', err.message);
    }

    // Compatibility Tests
    try {
      await runCompatibilityTests(driver, resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in compatibility tests module:', err.message);
    }

    // Performance Tests
    try {
      await runPerformanceTests(driver, resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in performance tests module:', err.message);
    }

    // API Tests (Independent of Web Driver)
    try {
      await runApiTests(resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in API tests module:', err.message);
    }

    // Database Tests (Direct Mongoose Query)
    try {
      await runDatabaseTests(resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in database tests module:', err.message);
    }

    // Accessibility Tests
    try {
      await runAccessibilityTests(driver, resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in accessibility tests module:', err.message);
    }

    // Mobile-Specific Tests
    try {
      await runMobileTests(driver, resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in mobile-specific tests module:', err.message);
    }

    // Regression Tests
    try {
      await runRegressionTests(driver, resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in regression tests module:', err.message);
    }

    // End-to-End Tests
    try {
      await runE2eTests(driver, resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in E2E tests module:', err.message);
    }

    // Security Tests (Moved to the end so rate limiting doesn't block other test cases)
    try {
      await runSecurityTests(driver, resultsRegistry);
    } catch (err) {
      console.error('[Runner] Error in security tests module:', err.message);
    }

  } catch (globalErr) {
    console.error('[Runner] Critical Failure initializing tests:', globalErr.message);
  } finally {
    // Make sure we tear down the WebDriver
    if (driver) {
      try {
        await driver.quit();
        console.log('[Runner] WebDriver quit successfully.');
      } catch (tearDownErr) {
        console.error('[Runner] Error while quitting WebDriver:', tearDownErr.message);
      }
    }
  }

  // 3. Generate Styled Excel Report
  console.log('\n================================================');
  console.log('       GENERATING EXCEL REPORT (exceljs)         ');
  console.log('================================================');
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'MindGuard Automated Test Runner';
    workbook.lastModifiedBy = 'MindGuard QA Bot';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Iterate through each category and build a sheet
    for (const cat of categoriesList) {
      const sheet = workbook.addWorksheet(cat.name);
      
      // Set grid lines visible
      sheet.views = [{ showGridLines: true }];

      // Define Columns
      sheet.columns = [
        { header: 'Test ID', key: 'id', width: 12 },
        { header: 'Description', key: 'description', width: 45 },
        { header: 'Test Steps', key: 'steps', width: 50 },
        { header: 'Expected Result', key: 'expectedResult', width: 55 },
        { header: 'Test Type', key: 'type', width: 22 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Duration', key: 'duration', width: 12 },
        { header: 'Date Tested', key: 'testedDate', width: 15 },
        { header: 'Error Details / Logs', key: 'error', width: 40 }
      ];

      // Add Data rows
      const cases = resultsRegistry[cat.id] || [];
      cases.forEach(c => {
        const row = sheet.addRow({
          id: c.id,
          description: c.description,
          steps: c.steps,
          expectedResult: c.expectedResult,
          type: c.type,
          status: c.status,
          duration: c.duration || 'N/A',
          testedDate: c.testedDate || new Date().toLocaleDateString(),
          error: c.error || ''
        });

        // Set alignment and text wrapping
        row.getCell('description').alignment = { wrapText: true, vertical: 'middle' };
        row.getCell('steps').alignment = { wrapText: true, vertical: 'middle' };
        row.getCell('expectedResult').alignment = { wrapText: true, vertical: 'middle' };
        row.getCell('error').alignment = { wrapText: true, vertical: 'middle' };
        row.getCell('id').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('status').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('type').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('duration').alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell('testedDate').alignment = { horizontal: 'center', vertical: 'middle' };

        // Style the status field dynamically
        const statusCell = row.getCell('status');
        if (c.status === 'PASS') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2F0D9' } // Light Green
          };
          statusCell.font = { color: { argb: 'FF385723' }, bold: true };
        } else if (c.status === 'FAIL') {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFCE4D6' } // Light Red
          };
          statusCell.font = { color: { argb: 'FFC00000' }, bold: true };
        } else {
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF2CC' } // Light Yellow
          };
          statusCell.font = { color: { argb: 'FF7F6000' }, bold: true };
        }

        // Apply light border styling to all cells in the row
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
          };
        });
      });

      // Style Header Row
      const headerRow = sheet.getRow(1);
      headerRow.height = 32;
      headerRow.eachCell(cell => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1F4E78' } // Theme Navy Blue
        };
        cell.font = {
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 11
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF122C44' } },
          bottom: { style: 'medium', color: { argb: 'FF122C44' } },
          left: { style: 'thin', color: { argb: 'FF122C44' } },
          right: { style: 'thin', color: { argb: 'FF122C44' } }
        };
      });
    }

    const reportPath = 'selenium_report.xlsx';
    await workbook.xlsx.writeFile(reportPath);
    console.log(`[Report Builder] Success! Styled Excel report created at: "${reportPath}"`);

    // Output stats summaries to console
    console.log('\n================================================');
    console.log('            TEST EXECUTION SUMMARY              ');
    console.log('================================================');
    let grandTotal = 0;
    let grandPass = 0;
    let grandFail = 0;

    categoriesList.forEach(cat => {
      const cases = resultsRegistry[cat.id] || [];
      const total = cases.length;
      const pass = cases.filter(c => c.status === 'PASS').length;
      const fail = cases.filter(c => c.status === 'FAIL').length;
      const pending = cases.filter(c => c.status === 'PENDING').length;
      
      grandTotal += total;
      grandPass += pass;
      grandFail += fail;

      console.log(`- ${cat.name}: ${pass} Passed, ${fail} Failed, ${pending} Pending (Total: ${total})`);
    });
    console.log('------------------------------------------------');
    console.log(`GRAND TOTAL: ${grandTotal} Cases | Passed: ${grandPass} | Failed: ${grandFail}`);
    console.log('================================================');

  } catch (reportErr) {
    console.error('[Report Builder] Failed to write Excel report:', reportErr.message);
  }
}

main();
