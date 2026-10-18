import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(ROOT, 'client', 'public', 'door-icons');

const COLOR_REPLACEMENTS: [string, string][] = [
  ['#444444', 'var(--door-stroke)'],
  ['#444', 'var(--door-stroke)'],
  ['#9ecff3', 'var(--door-glass)'],
  ['#9ECFF3', 'var(--door-glass)'],
  ['#E5E7EB', 'var(--door-fixed)'],
  ['#e5e7eb', 'var(--door-fixed)'],
  ['#BCDFFB', 'var(--door-operable)'],
  ['#bcdffb', 'var(--door-operable)'],
  ['#fff', 'var(--door-badge-bg)'],
  ['#FFF', 'var(--door-badge-bg)'],
  ['#ffffff', 'var(--door-badge-bg)'],
  ['#FFFFFF', 'var(--door-badge-bg)'],
];

function ensureRootClass(svg: string, cls: string): string {
  const hasClass = /<svg[^>]*class=/i.test(svg);
  
  if (hasClass) {
    return svg.replace(
      /<svg([^>]*?)class=("|')(.*?)\2/i,
      (_m, rest: string, q: string, c: string) => 
        `<svg${rest}class=${q}${cls} ${c}${q}`
    );
  }
  
  return svg.replace('<svg', `<svg class="${cls}"`);
}

async function processSvg(filepath: string): Promise<void> {
  let content = await fs.readFile(filepath, 'utf8');
  
  for (const [from, to] of COLOR_REPLACEMENTS) {
    const regex = new RegExp(from.replace('#', '#'), 'gi');
    content = content.replace(regex, to);
  }
  
  content = ensureRootClass(content, 'door-svg');
  
  await fs.writeFile(filepath, content, 'utf8');
  console.log(`✓ Processed: ${path.basename(filepath)}`);
}

async function walkDirectory(dir: string): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      await walkDirectory(fullPath);
    } else if (/\.svg$/i.test(entry.name)) {
      await processSvg(fullPath);
    }
  }
}

(async () => {
  try {
    console.log('🎨 Themeifying door SVG icons...');
    console.log(`📁 Processing: ${ICONS_DIR}\n`);
    
    await walkDirectory(ICONS_DIR);
    
    console.log('\n✅ Successfully themeified all door icons!');
    console.log('💡 Don\'t forget to add CSS variables to client/src/index.css');
  } catch (error) {
    console.error('❌ Failed to themeify door icons:', error);
    process.exit(1);
  }
})();
