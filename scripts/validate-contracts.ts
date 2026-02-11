#!/usr/bin/env node --import tsx
/* global process */
/**
 * Contract Smoke Test
 *
 * Validates:
 * - All contract files exist
 * - OpenAPI specs are valid JSON
 * - Governance files are readable
 * - Schema pack metadata is accurate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACTS_DIR = path.join(__dirname, '..', 'shared', 'contracts');

interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

async function main() {
  console.log('🔍 Running contract smoke tests...\n');

  const result: TestResult = {
    passed: 0,
    failed: 0,
    errors: [],
  };

  // Test 1: Schema pack exists
  const schemaPackPath = path.join(CONTRACTS_DIR, 'schema-pack.json');
  if (!fs.existsSync(schemaPackPath)) {
    result.failed++;
    result.errors.push('schema-pack.json not found');
  } else {
    try {
      const schemaPack = JSON.parse(fs.readFileSync(schemaPackPath, 'utf-8'));
      result.passed++;
      console.log('✅ schema-pack.json valid');

      // Test 2: OpenAPI files exist and are valid JSON
      for (const [name, config] of Object.entries(schemaPack.contracts)) {
        const contractPath = path.join(CONTRACTS_DIR, (config as any).file);
        if (!fs.existsSync(contractPath)) {
          result.failed++;
          result.errors.push(`${(config as any).file} not found`);
        } else {
          try {
            JSON.parse(fs.readFileSync(contractPath, 'utf-8'));
            result.passed++;
            console.log(`✅ ${name} contract valid`);
          } catch (err) {
            result.failed++;
            result.errors.push(`${(config as any).file} invalid JSON: ${err}`);
          }
        }
      }

      // Test 3: Governance files exist
      for (const [name, file] of Object.entries(schemaPack.governance)) {
        const govPath = path.join(CONTRACTS_DIR, file as string);
        if (!fs.existsSync(govPath)) {
          result.failed++;
          result.errors.push(`Governance file ${file} not found`);
        } else {
          result.passed++;
          console.log(`✅ ${name} governance file exists`);
        }
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`schema-pack.json invalid: ${err}`);
    }
  }

  // Summary
  console.log(`\n📊 Test Results:`);
  console.log(`   Passed: ${result.passed}`);
  console.log(`   Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log(`\n❌ Errors:`);
    result.errors.forEach(err => console.log(`   - ${err}`));
    process.exit(1);
  } else {
    console.log(`\n✅ All contract smoke tests passed!`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
