import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

// npm can leave a partial install even when its process exits successfully.
// Fail before build/check/test can accidentally pick up a global executable.
const root = process.cwd();
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const tools = { vite: 'bin/vite.js', typescript: 'bin/tsc', jest: 'bin/jest.js', esbuild: null };
let failed = false;
for (const [name, bin] of Object.entries(tools)) {
  try {
    const dir = path.join(root, 'node_modules', name);
    const installed = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const expected = lock.packages[`node_modules/${name}`]?.version;
    if (!expected || installed.version !== expected) throw new Error(`Expected locked version ${expected}, found ${installed.version}`);
    if (bin) {
      const result = spawnSync(process.execPath, [path.join(dir, bin), '--version'], { encoding: 'utf8', timeout: 30000 });
      if (result.error || result.status !== 0) throw new Error(`Local executable failed: ${result.error?.message ?? result.stderr}`);
    } else {
      const require = createRequire(path.join(root, 'package.json'));
      require('esbuild').transformSync('const installed = true;', { loader: 'js' });
    }
    console.log(`PASS local ${name}@${installed.version}`);
  } catch (error) {
    failed = true;
    console.error(`FAIL local ${name}: ${error.message}`);
  }
}
if (failed) process.exit(1);
