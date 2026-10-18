import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const manifest = JSON.parse(fs.readFileSync('tests/test-manifest.json', 'utf8'));
const mode = process.argv[2];
if (mode === 'unit') {
  const commands = [
    ['inventory', ['scripts/verify/test-inventory.mjs']],
    ['core contracts', ['--require', './tests/setup/unit-env.cjs', '--import', 'tsx', '--test', ...manifest.core]],
    ['Jest units', ['node_modules/jest/bin/jest.js', '--config', 'jest.unit.config.cjs', '--runInBand']],
    ['domain calculations', ['--require', './tests/setup/unit-env.cjs', 'node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.domain.config.ts']],
  ];
  const results = [];
  for (const [label, args] of commands) {
    console.log(`\n=== ${label} ===`);
    const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
    if (result.error) throw result.error;
    results.push({ label, status: result.status ?? 1 });
    if (label === 'inventory' && result.status !== 0) break;
  }
  console.log('\nUnit verification summary:');
  results.forEach(({ label, status }) => console.log(`${status === 0 ? 'PASS' : 'FAIL'} ${label}`));
  process.exit(results.some(result => result.status !== 0) ? 1 : 0);
}
if (mode === 'core') {
  const result = spawnSync(process.execPath, [
    '--require', './tests/setup/unit-env.cjs',
    '--import', 'tsx', '--test', ...manifest.core,
  ], { stdio: 'inherit' });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
if (mode === 'integration') {
  // These fixtures mutate records. Never silently reuse DATABASE_URL.
  if (process.env.INTEGRATION_TESTS_APPROVED !== 'isolated' || !process.env.TEST_DATABASE_URL) {
    console.error('BLOCKED: integration tests require a separately provisioned TEST_DATABASE_URL and INTEGRATION_TESTS_APPROVED=isolated. Never use the existing application database.');
    process.exit(2);
  }
  let url;
  try { url = new URL(process.env.TEST_DATABASE_URL); } catch {
    console.error('BLOCKED: invalid test database configuration.'); process.exit(2);
  }
  if (!/^postgres(ql)?:$/.test(url.protocol) ||
    !/(?:^|[_-])(test|testing|ci)(?:[_-]|$)/i.test(decodeURIComponent(url.pathname.slice(1))) ||
    process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
    console.error('BLOCKED: use a distinct disposable database with test/testing/ci in its database name.');
    process.exit(2);
  }
  console.log('Running database fixtures against the explicitly approved isolated test database. Legacy service tests are separate and require dedicated service fixtures.');
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', ...manifest.database], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: process.env.TEST_DATABASE_URL },
  });
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
console.error('Usage: node scripts/verify/run-tests.mjs unit|core|integration');
process.exit(2);
