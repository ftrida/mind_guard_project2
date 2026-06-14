// tests/hardcoded_creds.js - Hardcoded Credentials / Secrets Scanner
// Scans the codebase for committed secrets not in .gitignore

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

const PROJECT_ROOT = join(process.cwd(), '..'); // one level up from automated_test/

// Patterns to search for (regex)
const SECRET_PATTERNS = [
  { name: 'Hardcoded Password',         regex: /password\s*[:=]\s*['"][^'"]{6,}['"]/gi,       severity: 'HIGH' },
  { name: 'Hardcoded API Key',          regex: /api[_-]?key\s*[:=]\s*['"][A-Za-z0-9\-_]{16,}['"]/gi, severity: 'CRITICAL' },
  { name: 'JWT Secret in Code',         regex: /jwt[_-]?secret\s*[:=]\s*['"][^'"]{10,}['"]/gi, severity: 'CRITICAL' },
  { name: 'Hardcoded Bearer Token',     regex: /bearer\s+[A-Za-z0-9\-_.]{20,}/gi,              severity: 'CRITICAL' },
  { name: 'MongoDB Connection String',  regex: /mongodb(\+srv)?:\/\/[^'">\s]{10,}/gi,            severity: 'HIGH' },
  { name: 'Private Key Block',          regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g,        severity: 'CRITICAL' },
  { name: 'AWS Access Key',            regex: /AKIA[0-9A-Z]{16}/g,                              severity: 'CRITICAL' },
  { name: 'GitHub Token',              regex: /ghp_[A-Za-z0-9]{36}/g,                           severity: 'CRITICAL' },
  { name: 'Email Service Key',         regex: /re_[A-Za-z0-9_]{20,}/g,                          severity: 'HIGH' },
  { name: 'Hardcoded IP Address',      regex: /\b(?:\d{1,3}\.){3}\d{1,3}:\d{4,5}\b/g,          severity: 'LOW' },
  { name: 'TODO with sensitive info',  regex: /\/\/\s*TODO.*(?:password|secret|token|key)/gi,    severity: 'LOW' },
  { name: 'Env var in source code',    regex: /process\.env\.\w+\s*\|\|\s*['"][^'"]{6,}['"]/gi, severity: 'MEDIUM' },
];

// Files/dirs to skip
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '.next', 'coverage', 'uploads']);
const SKIP_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.mp3', '.mp4', '.pdf', '.xlsx', '.zip']);

function walkDir(dirPath, fileList = []) {
  try {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dirPath, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath, fileList);
        } else if (stat.isFile() && !SKIP_EXTS.has(extname(entry).toLowerCase())) {
          fileList.push(fullPath);
        }
      } catch {}
    }
  } catch {}
  return fileList;
}

export async function runHardcodedCredsTests(baseUrl, config, results) {
  console.log('\n[DAST] Running Hardcoded Credentials / Secrets Scan...');
  const timestamp = new Date().toISOString();

  const files = walkDir(PROJECT_ROOT);
  console.log(`  → Scanning ${files.length} files in ${PROJECT_ROOT}...`);

  let totalFindings = 0;

  for (const filePath of files) {
    let content;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch { continue; }

    const relPath = relative(PROJECT_ROOT, filePath);

    for (const pattern of SECRET_PATTERNS) {
      const matches = content.match(pattern.regex);
      if (!matches || matches.length === 0) continue;

      for (const match of matches.slice(0, 3)) { // Cap at 3 per pattern per file
        // Redact value - only show first 8 chars
        const redacted = match.substring(0, 40).replace(/['"][^'"]{6,}['"]/g, '"[REDACTED]"');

        const isEnvFile = relPath.includes('.env');
        const isTestFile = relPath.includes('test') || relPath.includes('Test') || relPath.includes('spec');

        // .env files are expected to have secrets but should not be in git
        const adjustedSeverity = isEnvFile
          ? 'LOW'   // .env should not be committed but is expected to hold secrets
          : isTestFile
            ? 'LOW'  // Test files often have test credentials - lower severity
            : pattern.severity;

        const finding = !isEnvFile;

        results.push({
          endpoint: relPath,
          method: 'SCAN',
          role: 'STATIC_ANALYSIS',
          status: 'FOUND',
          expected_status: 'NONE',
          finding,
          severity: adjustedSeverity,
          response_time_ms: 0,
          test_category: 'hardcoded_creds',
          note: `${finding ? '⚠' : 'ℹ'} [${pattern.name}] in "${relPath}": ${redacted}`,
          timestamp
        });

        if (finding) {
          totalFindings++;
          console.log(`  [⚠ ${adjustedSeverity}] ${pattern.name} in ${relPath}: ${redacted}`);
        }
      }
    }
  }

  if (totalFindings === 0) {
    results.push({
      endpoint: 'CODEBASE_SCAN',
      method: 'SCAN',
      role: 'STATIC_ANALYSIS',
      status: 'CLEAN',
      expected_status: 'CLEAN',
      finding: false,
      severity: 'NONE',
      response_time_ms: 0,
      test_category: 'hardcoded_creds',
      note: `✓ No hardcoded credentials found in ${files.length} scanned source files.`,
      timestamp
    });
  }

  console.log(`[DAST] Hardcoded Creds: ${totalFindings} finding(s) across ${files.length} files.`);
}
