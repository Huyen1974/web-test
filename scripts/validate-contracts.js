#!/usr/bin/env node
/**
 * Điều 31 — Contract Schema Validator
 * Validates all contracts in web/tests/contracts/ against schema.json
 * Usage: node scripts/validate-contracts.js
 */

const fs = require('fs');
const path = require('path');

const WEB_DIR = path.join(__dirname, '..', 'web');
const CONTRACTS_DIR = path.join(WEB_DIR, 'tests', 'contracts');

// Resolve ajv from web/node_modules (where pnpm installs it)
const ajvPath = require.resolve('ajv', { paths: [WEB_DIR] });
const ajvFormatsPath = require.resolve('ajv-formats', { paths: [WEB_DIR] });
const AjvModule = require(ajvPath);
const addFormatsModule = require(ajvFormatsPath);
const Ajv = AjvModule.default || AjvModule;
const addFormats = addFormatsModule.default || addFormatsModule;
const SCHEMA_FILE = path.join(CONTRACTS_DIR, 'schema.json');
const SKIP_FILES = ['schema.json', 'README.md'];

// Load schema
const schema = JSON.parse(fs.readFileSync(SCHEMA_FILE, 'utf8'));

// Setup ajv
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

// Find contract files
const files = fs.readdirSync(CONTRACTS_DIR)
  .filter(f => f.endsWith('.json') && !SKIP_FILES.includes(f));

let passed = 0;
let failed = 0;
let skipped = 0;
const errors = [];

for (const file of files) {
  const filepath = path.join(CONTRACTS_DIR, file);
  let data;

  try {
    data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    console.log(`  FAIL  ${file} — invalid JSON: ${e.message}`);
    failed++;
    errors.push({ file, error: `Invalid JSON: ${e.message}` });
    continue;
  }

  // Skip legacy Điều 30 contracts (no contract_id)
  if (!data.contract_id) {
    console.log(`  SKIP  ${file} — no contract_id (legacy Điều 30)`);
    skipped++;
    continue;
  }

  const valid = validate(data);
  if (valid) {
    const checkCount = data.checks ? data.checks.length : 0;
    console.log(`  PASS  ${file} — ${data.contract_id} [${data.tier}] ${checkCount} checks`);
    passed++;
  } else {
    const errMsg = validate.errors.map(e =>
      `${e.instancePath || '/'} ${e.message}`
    ).join('; ');
    console.log(`  FAIL  ${file} — ${errMsg}`);
    failed++;
    errors.push({ file, contract_id: data.contract_id, errors: validate.errors });
  }
}

// Summary
console.log('');
console.log(`Điều 31 Contract Validation: ${passed} PASS, ${failed} FAIL, ${skipped} SKIP`);

if (failed > 0) {
  console.log('');
  console.log('Failures:');
  for (const e of errors) {
    console.log(`  ${e.file}: ${e.error || JSON.stringify(e.errors.map(x => x.message))}`);
  }
  process.exit(1);
}

process.exit(0);
