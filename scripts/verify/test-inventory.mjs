import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(fs.readFileSync('tests/test-manifest.json', 'utf8'));
const registered = new Map();
for (const [group, files] of Object.entries(manifest)) {
  for (const file of files) {
    if (registered.has(file)) throw new Error(`Test classified twice: ${file}`);
    if (!fs.existsSync(file)) throw new Error(`Registered test does not exist: ${file}`);
    registered.set(file, group);
  }
}
const discovered = [];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.posix.join(directory, item.name);
    if (item.isDirectory()) walk(file);
    else if (/\.(test|spec)\.tsx?$/.test(file)) discovered.push(file);
  }
}
['server', 'client/src', 'shared', 'tests'].forEach(walk);
const missing = discovered.filter(file => !registered.has(file));
if (missing.length) throw new Error(`Classify new tests by runner and isolation before CI:\n${missing.join('\n')}`);
for (const [group, files] of Object.entries(manifest)) {
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (['core', 'database'].includes(group) && !text.includes('node:test'))
      throw new Error(`Expected Node test runner: ${file}`);
    if (group.startsWith('jest') && text.includes('node:test'))
      throw new Error(`Node test incorrectly classified as Jest: ${file}`);
  }
}
console.log(`PASS: ${discovered.length} tests explicitly classified; none silently omitted.`);
