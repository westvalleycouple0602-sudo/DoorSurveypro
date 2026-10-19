import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const failures = [];
const check = (condition, message) => {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${message}`);
  if (!condition) failures.push(message);
};
const [major, minor] = process.versions.node.split('.').map(Number);
check(major > 20 || major === 20 && minor >= 19, 'Node supports current Vite/tooling requirements (20.19+)');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const name of ['dev', 'build', 'start', 'check', 'test', 'verify', 'test:integration'])
  check(Boolean(pkg.scripts[name]), `npm run ${name} is defined`);
for (const file of ['package-lock.json', '.github/workflows/ci.yml', 'AGENTS.md',
  'CONTRIBUTING.md', 'docs/PROJECT_ROADMAP.md', 'tests/test-manifest.json'])
  check(fs.existsSync(file), `${file} exists`);
const ignore = fs.readFileSync('.gitignore', 'utf8');
check(ignore.includes('generated-artifacts'), 'Generated transfer packages stay out of Git history');
check(!pkg.scripts.verify.includes('db:push'), 'Verification does not apply database migrations');
const inventory = spawnSync(process.execPath, ['scripts/verify/test-inventory.mjs'], { stdio: 'inherit' });
check(inventory.status === 0, 'Every test has an explicit runner/isolation group');
console.log('This structural check does not certify runtime secrets, provider access, application health or a passing build/type check.');
process.exit(failures.length ? 1 : 0);
