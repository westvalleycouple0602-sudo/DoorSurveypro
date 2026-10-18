import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const root = process.cwd();
const output = path.join(root, 'generated-artifacts/architecture');
fs.mkdirSync(output, { recursive: true });
const sourceRoots = ['client/src', 'server', 'shared', 'scripts', 'tests', 'e2e'];
const files = [];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '__pycache__', 'dist', '.git'].includes(item.name)) continue;
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) walk(filename);
    else if (/\.(tsx?|jsx?|mjs|cjs|py)$/.test(filename) && !filename.endsWith('.d.ts')) files.push(filename);
  }
}
sourceRoots.forEach(walk);
files.sort();
const functions = [], routes = [], mounts = [], tables = [], screens = [], tests = [], modules = [];
const environment = new Map();
const imported = new Map();
const publicName = node => {
  if (!node) return '';
  if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return '[computed]';
};
const binding = node => ts.isIdentifier(node) ? node.text :
  '{' + (node.elements || []).filter(e => e.name).map(e => binding(e.name)).join(', ') + '}';
const literal = node => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;
function resolveImport(filename, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.resolve(path.dirname(filename), specifier.replace(/\.js$/, ''));
  for (const candidate of [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts')])
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.relative(root, candidate);
  return null;
}
function ownerName(node) {
  const names = [];
  for (let parent = node.parent; parent; parent = parent.parent) {
    if ((ts.isClassDeclaration(parent) || ts.isFunctionDeclaration(parent) ||
      ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)) && parent.name) {
      const name = publicName(parent.name);
      if (name && name !== '[computed]' && !names.includes(name)) names.unshift(name);
    }
  }
  return names;
}
function dynamicPaths(node, first) {
  const known = literal(first);
  if (known !== null) return [known];
  if (first && ts.isArrayLiteralExpression(first)) return first.elements.map(literal).filter(v => v !== null);
  if (first && ts.isIdentifier(first)) {
    for (let parent = node.parent; parent; parent = parent.parent) {
      if (ts.isForOfStatement(parent) && ts.isVariableDeclarationList(parent.initializer) &&
        parent.initializer.declarations.some(d => publicName(d.name) === first.text) &&
        ts.isArrayLiteralExpression(parent.expression)) return parent.expression.elements.map(literal).filter(v => v !== null);
    }
  }
  return ['[dynamic path]'];
}
for (const filename of files) {
  const text = fs.readFileSync(filename, 'utf8');
  const isTest = /(^|\/)(__tests__|tests|e2e)\//.test(filename) || /\.(test|spec)\./.test(filename);
  if (isTest) {
    tests.push({ file: filename, declarations: (text.match(/\b(?:it|test)\s*\(/g) || []).length });
    continue;
  }
  modules.push({ file: filename, lines: text.split('\n').length });
  for (const match of text.matchAll(/(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]*)/g)) {
    if (!environment.has(match[1])) environment.set(match[1], new Set());
    environment.get(match[1]).add(filename);
  }
  if (filename.endsWith('.py')) {
    const python = `
import ast, json, sys
tree = ast.parse(open(sys.argv[1], encoding="utf-8").read())
items = []
class Visitor(ast.NodeVisitor):
    def __init__(self): self.scope = []
    def visit_ClassDef(self, node):
        self.scope.append(node.name); self.generic_visit(node); self.scope.pop()
    def visit_FunctionDef(self, node):
        name = ".".join(self.scope + [node.name])
        args = [a.arg for a in node.args.posonlyargs + node.args.args]
        if node.args.vararg: args.append("*" + node.args.vararg.arg)
        args.extend(a.arg for a in node.args.kwonlyargs)
        if node.args.kwarg: args.append("**" + node.args.kwarg.arg)
        items.append({"line":node.lineno, "name":name, "signature":name+"("+", ".join(args)+")"})
        self.scope.append(node.name); self.generic_visit(node); self.scope.pop()
    visit_AsyncFunctionDef = visit_FunctionDef
Visitor().visit(tree)
print(json.dumps(items))
`;
    for (const item of JSON.parse(execFileSync('python3', ['-c', python, filename], { encoding: 'utf8' })))
      functions.push({ file: filename, ...item, kind: 'Python utility' });
    continue;
  }
  const source = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true,
    filename.endsWith('.tsx') || filename.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = new Map();
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const target = resolveImport(filename, statement.moduleSpecifier.text);
    if (!target || !statement.importClause) continue;
    if (statement.importClause.name) imports.set(statement.importClause.name.text, target);
    const bindings = statement.importClause.namedBindings;
    if (bindings && ts.isNamedImports(bindings))
      bindings.elements.forEach(e => imports.set(e.name.text, target));
  }
  imported.set(filename, imports);
  const location = node => source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  const addFunction = (node, name, kind) => {
    if (!name || !node.body) return;
    const owners = ownerName(node);
    if (owners.at(-1) !== name) owners.push(name);
    const qualified = owners.join('.');
    const parameters = node.parameters.map(p => (p.dotDotDotToken ? '...' : '') + binding(p.name) + (p.questionToken ? '?' : ''));
    functions.push({ file: filename, line: location(node), name: qualified,
      signature: `${qualified}(${parameters.join(', ')})`, kind });
  };
  function visit(node) {
    if (ts.isFunctionDeclaration(node)) addFunction(node, publicName(node.name), 'function');
    else if (ts.isMethodDeclaration(node)) addFunction(node, publicName(node.name), 'method');
    else if (ts.isConstructorDeclaration(node)) addFunction(node, 'constructor', 'constructor');
    else if (ts.isGetAccessorDeclaration(node)) addFunction(node, publicName(node.name), 'getter');
    else if (ts.isSetAccessorDeclaration(node)) addFunction(node, publicName(node.name), 'setter');
    else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      const parent = node.parent;
      if (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent))
        addFunction(node, publicName(parent.name), 'assigned function');
      else if (ts.isFunctionExpression(node) && node.name) addFunction(node, node.name.text, 'function expression');
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      let initializer = node.initializer;
      while (ts.isAwaitExpression(initializer) || ts.isParenthesizedExpression(initializer) ||
        ts.isPropertyAccessExpression(initializer)) initializer = initializer.expression;
      if (ts.isCallExpression(initializer)) {
        const callee = initializer.expression;
        if (ts.isIdentifier(callee) && imports.has(callee.text))
          imports.set(publicName(node.name), imports.get(callee.text));
        if ((ts.isIdentifier(callee) && callee.text === 'Router') ||
          (ts.isPropertyAccessExpression(callee) && callee.name.text === 'Router'))
          imports.set(publicName(node.name), filename);
        if (callee.kind === ts.SyntaxKind.ImportKeyword) {
          const specifier = literal(initializer.arguments[0]);
          const target = specifier ? resolveImport(filename, specifier) : null;
          if (target && ts.isObjectBindingPattern(node.name))
            node.name.elements.forEach(e => imports.set(publicName(e.name), target));
          else if (target && ts.isIdentifier(node.name)) imports.set(node.name.text, target);
        }
      }
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'pgTable') {
      const tableName = literal(node.arguments[0]);
      const columns = node.arguments[1];
      if (tableName && columns && ts.isObjectLiteralExpression(columns))
        tables.push({ name: tableName, file: filename, line: location(node),
          columns: columns.properties.filter(p => p.name).map(p => publicName(p.name)) });
    }
    if (filename.startsWith('server/') && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const receiver = node.expression.expression.getText(source);
      if (/^(app|router|[A-Za-z_$][\w$]*(?:Router|Routes))$/.test(receiver)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'all'].includes(method) && node.arguments.length) {
          for (const routePath of dynamicPaths(node, node.arguments[0]))
            routes.push({ method: method.toUpperCase(), path: routePath, receiver, file: filename, line: location(node) });
        }
        if (method === 'use' && node.arguments.length) {
          const first = literal(node.arguments[0]);
          for (const argument of node.arguments.slice(first === null ? 0 : 1)) {
            const symbol = ts.isIdentifier(argument) ? argument.text :
              ts.isCallExpression(argument) && ts.isIdentifier(argument.expression) ? argument.expression.text : '';
            const target = imports.get(symbol);
            if (target) mounts.push({ file: filename, line: location(node), receiver,
              prefix: first ?? '/', symbol, target });
          }
        }
      }
    }
    if (filename === 'client/src/App.tsx' && (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) &&
      node.tagName.getText(source) === 'Route') {
      const attributes = node.attributes.properties;
      const attribute = name => attributes.find(a => ts.isJsxAttribute(a) && a.name.getText(source) === name);
      const routePath = attribute('path');
      const component = attribute('component');
      let page = component?.initializer && ts.isJsxExpression(component.initializer)
        ? component.initializer.expression?.getText(source) : '';
      if (!page && ts.isJsxOpeningElement(node)) {
        const element = node.parent;
        for (const child of element.children || []) {
          const opening = ts.isJsxElement(child) ? child.openingElement : ts.isJsxSelfClosingElement(child) ? child : null;
          const a = opening?.attributes.properties.find(a => ts.isJsxAttribute(a) && a.name.getText(source) === 'component');
          if (a?.initializer && ts.isJsxExpression(a.initializer)) page = a.initializer.expression?.getText(source);
        }
      }
      screens.push({ path: routePath?.initializer && ts.isStringLiteral(routePath.initializer)
        ? routePath.initializer.text : '[fallback/dynamic]', component: page || '[inline/redirect]', file: filename, line: location(node) });
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

const prefixes = new Map();
const join = (a, b) => ('/' + a + '/' + b).replace(/\/+/g, '/').replace(/\/$/, '') || '/';
for (let pass = 0; pass < 8; pass++) {
  let changed = false;
  for (const mount of mounts) {
    const parents = mount.receiver === 'app' ? ['/'] : [...(prefixes.get(mount.file) || [])];
    for (const parent of parents) {
      const prefix = join(parent, mount.prefix);
      if (!prefixes.has(mount.target)) prefixes.set(mount.target, new Set());
      if (!prefixes.get(mount.target).has(prefix)) { prefixes.get(mount.target).add(prefix); changed = true; }
    }
  }
  if (!changed) break;
}
for (const route of routes) {
  route.resolved = route.receiver === 'app' ? [route.path] :
    [...(prefixes.get(route.file) || [])].map(prefix => join(prefix, route.path));
}
functions.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
tables.sort((a, b) => a.name.localeCompare(b.name));
const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const generatedAt = new Date().toISOString();
const data = { sourceCommit, generatedAt, modules, functions, routes, mounts, tables, screens, tests,
  environment: [...environment].sort(([a], [b]) => a.localeCompare(b)).map(([name, refs]) => ({ name, files: [...refs] })),
  dependencies: manifest.dependencies, devDependencies: manifest.devDependencies };
fs.writeFileSync(path.join(output, 'source-inventory.json'), JSON.stringify(data, null, 2));

const escape = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const mdCell = value => String(value ?? '').replaceAll('|', '\\|').replace(/[\r\n]+/g, ' ');
const mdTable = (headers, rows) => [headers, headers.map(() => '---'), ...rows]
  .map(row => '| ' + row.map(mdCell).join(' | ') + ' |').join('\n');
const ref = item => `${item.file}:${item.line}`;
const routeRows = routes.map(r => [r.method, r.resolved.length ? r.resolved.join(' ; ') : `[mount unresolved] ${r.path}`, ref(r)]);
const groups = new Map();
for (const item of functions) {
  if (!groups.has(item.file)) groups.set(item.file, []);
  groups.get(item.file).push(item);
}
const tableRows = tables.map(t => [t.name, t.columns.join(', '), ref(t)]);
const screenRows = screens.map(s => [s.path, s.component, ref(s)]);
const envRows = data.environment.map(e => [e.name, e.files.join('; ')]);
const depsRows = Object.entries(manifest.dependencies).sort(([a], [b]) => a.localeCompare(b));
const testsRows = tests.map(t => [t.file, t.declarations]);
const tableNameCounts = new Map();
for (const table of tables) tableNameCounts.set(table.name, (tableNameCounts.get(table.name) || 0) + 1);
const repeatedTables = [...tableNameCounts].filter(([, count]) => count > 1).map(([name]) => name);
const tableNote = `There are ${tables.length} declarations for ${tableNameCounts.size} distinct table names. ` +
  `Repeated declarations: ${repeatedTables.join(', ') || 'none'}. Repeated names are retained with their source locations; ` +
  'they are not additional distinct database tables. Inspect the actual target schema before reconciling definitions.';
const provenance = `Source revision: ${sourceCommit}\nGenerated (UTC): ${generatedAt}\n\n` +
  `${modules.length} non-test source files inspected; ${functions.length} named functions/methods; ` +
  `${routes.length} HTTP route declarations; ${screens.length} JSX browser routes; ${tables.length} table declarations.\n\n` +
  'This is a static source reference, not a production audit. Counts include declarations, not unique live capabilities. ' +
  'Duplicate/overlapping routes are retained. Router prefixes are resolved statically where possible. ' +
  'Conditional public pages are additionally described in the overview and App.tsx; JSX route counts alone are not the full public-page list.';
const overview = fs.readFileSync('docs/architecture-overview.md', 'utf8');
const appendixIntro = `## Appendix A. Browser route declarations\n\n` +
  'Additional conditional public-page handling includes demo/prelaunch, login redirects, public landing/pricing and operator/portal handling. Inspect App.tsx for those branch conditions.\n\n';
const markdown = `${overview}\n\n---\n\n## Reference provenance\n\n${provenance}\n\n` +
  appendixIntro + mdTable(['Path', 'Component', 'Source'], screenRows) +
  '\n\n## Appendix B. HTTP route declarations\n\n' +
  'These are source declarations, not an assertion that all are enabled or reachable in every environment. Paths marked mount unresolved need registration review. ALL denotes an Express all-method handler.\n\n' +
  mdTable(['Method', 'Resolved/static path', 'Source'], routeRows) +
  '\n\n## Appendix C. Database table declarations\n\n' +
  tableNote + '\n\n' +
  mdTable(['Table', 'Application field names', 'Source'], tableRows) +
  '\n\n## Appendix D. Named function and method index\n\n' +
  'Signatures show parameter names, not default values or function bodies. Nested helpers and assigned callbacks with a stable source name are included. Dependency internals and anonymous callbacks are excluded.\n\n' +
  [...groups].map(([file, items]) => `### ${file}\n\n` + mdTable(['Function / parameters', 'Kind', 'Line'],
    items.map(i => [i.signature, i.kind, i.line]))).join('\n\n') +
  '\n\n## Appendix E. Configuration-variable names\n\nNo values were read or included.\n\n' +
  mdTable(['Variable', 'Source references'], envRows) +
  '\n\n## Appendix F. Runtime dependencies\n\n' + mdTable(['Package', 'Declared version/range'], depsRows) +
  '\n\n## Appendix G. Test-source inventory\n\nTest declaration counts are a rough static count, not test results.\n\n' +
  mdTable(['Source file', 'Direct test/it declarations'], testsRows) +
  '\n\n## Regeneration\n\nRun `node scripts/docs/generate-architecture.mjs` from the project root after updating the overview or code. Generated outputs are kept outside source/deployment history under generated-artifacts/architecture.\n';
fs.writeFileSync(path.join(output, 'DoorSurvey-Pro-Architecture-and-Functions.md'), markdown);

function inline(text) {
  return escape(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function narrative(markdownText) {
  const lines = markdownText.split('\n');
  let html = '', fenced = false, table = false, list = false;
  const close = () => { if (table) { html += '</tbody></table></div>'; table = false; }
    if (list) { html += '</ul>'; list = false; } };
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith('```')) { close(); html += fenced ? '</code></pre>' : '<pre><code>'; fenced = !fenced; continue; }
    if (fenced) { html += escape(line) + '\n'; continue; }
    if (line.startsWith('|')) {
      if (/^\|\s*---/.test(line)) continue;
      const cells = line.split('|').slice(1, -1).map(s => s.trim());
      if (!table) { close(); html += '<div class=\"table-wrap\"><table><thead><tr>' +
        cells.map(s => '<th>' + inline(s) + '</th>').join('') + '</tr></thead><tbody>'; table = true; }
      else html += '<tr>' + cells.map(s => '<td>' + inline(s) + '</td>').join('') + '</tr>';
      continue;
    }
    if (table) close();
    if (/^#{1,6} /.test(line)) {
      close(); const depth = line.match(/^#+/)[0].length;
      html += `<h${depth}>${inline(line.slice(depth + 1))}</h${depth}>`; continue;
    }
    if (/^(?:- |\d+\. )/.test(line)) {
      if (!list) { html += '<ul>'; list = true; }
      html += '<li>' + inline(line.replace(/^(?:- |\d+\. )/, '')) + '</li>'; continue;
    }
    if (list) close();
    if (line.trim()) html += '<p>' + inline(line) + '</p>';
  }
  close();
  return html;
}
function htmlTable(headers, rows) {
  return '<div class=\"table-wrap\"><table><thead><tr>' + headers.map(h => '<th>' + escape(h) + '</th>').join('') +
    '</tr></thead><tbody>' + rows.map(row => '<tr class=\"search-row\">' +
      row.map(cell => '<td>' + escape(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}
function section(id, title, body) {
  return `<section class=\"inventory-group\" id=\"${id}\"><h2>${escape(title)}</h2>${body}</section>`;
}
const functionHTML = [...groups].map(([file, items]) =>
  `<details class=\"function-group inventory-group\"><summary>${escape(file)} <span>${items.length}</span></summary>` +
  htmlTable(['Function / parameters', 'Kind', 'Line'], items.map(i => [i.signature, i.kind, i.line])) + '</details>').join('');
const html = `<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">
<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>DoorSurvey Pro — Architecture and Functions</title>
<style>
:root{color-scheme:light;--ink:#172638;--muted:#536477;--line:#dbe3eb;--accent:#175aa3}
*{box-sizing:border-box}body{margin:0;background:#f4f7fa;color:var(--ink);font:15px/1.65 system-ui,sans-serif}
header{background:#142b45;color:white;padding:36px max(24px,calc((100vw - 1180px)/2))}
header p{color:#d6e3ef;margin:8px 0}header h1{margin:0;font-size:30px;line-height:1.3}
main{max-width:1180px;margin:24px auto;padding:32px;background:white;border:1px solid var(--line);border-radius:12px}
h1,h2,h3{line-height:1.35}h2{margin-top:36px;padding-top:16px;border-top:1px solid var(--line)}h3{margin-top:24px}
p,li{max-width:105ch}a{color:var(--accent)}nav{display:flex;gap:8px 20px;flex-wrap:wrap;margin-bottom:24px}
code{font:12px/1.6 ui-monospace,monospace;background:#edf2f7;padding:2px 5px;border-radius:3px;overflow-wrap:anywhere}
pre{overflow:auto;padding:20px;background:#eff4f9;border:1px solid var(--line);border-radius:8px}pre code{padding:0;background:none;white-space:pre}
.table-wrap{overflow:auto;margin:16px 0}table{border-collapse:collapse;width:100%;font-size:12px;text-align:left}
th{background:#eaf0f7;color:#223c57}th,td{border:1px solid var(--line);padding:9px 11px;vertical-align:top;overflow-wrap:anywhere}
td{max-width:650px}tbody tr:nth-child(even){background:#f8fafc}.provenance{font-size:12px;color:var(--muted);overflow-wrap:anywhere}
.search{position:sticky;top:0;z-index:2;background:#fff;padding:16px 0;border-bottom:1px solid var(--line)}
label{display:block;font-weight:650}input{width:100%;font:inherit;border:1px solid #9eb1c5;padding:10px 12px;border-radius:6px;margin-top:5px}
details{border:1px solid var(--line);border-radius:6px;padding:10px 14px;margin:9px 0}
summary{cursor:pointer;font:13px/1.6 ui-monospace,monospace;overflow-wrap:anywhere}summary span{color:var(--muted);margin-left:8px}
[hidden]{display:none!important}.hint{font-size:12px;color:var(--muted)}
@media(max-width:700px){main{margin:0;padding:18px;border-radius:0}header{padding:26px 18px}header h1{font-size:25px}}
@media print{header{background:none;color:black;padding:0}header p{color:black}main{border:0;margin:0;padding:0;max-width:none}
nav,.search{display:none}details{break-inside:avoid}h2{break-after:avoid}.table-wrap{overflow:visible}body{background:white;font-size:10pt}}
</style></head><body>
<header><h1>DoorSurvey Pro</h1><p>Application architecture, feature catalog and complete named-function reference</p></header>
<main><nav><a href=\"#overview\">Architecture &amp; features</a><a href=\"#screens\">Screens</a><a href=\"#api\">API routes</a>
<a href=\"#tables\">Database tables</a><a href=\"#functions\">Functions</a><a href=\"#configuration\">Configuration</a><a href=\"#tests\">Tests</a></nav>
<p class=\"provenance\">${escape(provenance)}</p>
<article id=\"overview\">${narrative(overview)}</article>
<div class=\"search\"><label for=\"inventory-search\">Search the technical inventories</label>
<input id=\"inventory-search\" type=\"search\" placeholder=\"Function, route, table, file or configuration name…\">
<div class=\"hint\" id=\"search-status\" aria-live=\"polite\">The overview stays visible. Function groups expand when a search matches.</div></div>
${section('screens', 'Appendix A. Browser routes', '<p>Includes JSX Route declarations. Conditional public-page branches are also discussed above.</p>' + htmlTable(['Path', 'Component', 'Source'], screenRows))}
${section('api', 'Appendix B. HTTP route declarations', '<p>Static source declarations; duplicate registrations are retained. Unresolved mounts are explicitly marked. Review guards and registration order before changing an endpoint.</p>' + htmlTable(['Method', 'Resolved/static path', 'Source'], routeRows))}
${section('tables', 'Appendix C. Database table declarations', '<p>Source-declared application fields, not a live database schema inspection.</p><p>' + escape(tableNote) + '</p>' + htmlTable(['Table', 'Application field names', 'Source'], tableRows))}
<section id=\"functions\"><h2>Appendix D. Named functions and methods</h2><p>Open a source file to inspect its named functions. Signatures omit default values and bodies. Anonymous callbacks and dependency internals are excluded.</p>${functionHTML}</section>
${section('configuration', 'Appendix E. Configuration names', '<p>Names only. No environment values were read or exported.</p>' + htmlTable(['Variable', 'Source references'], envRows))}
${section('dependencies', 'Appendix F. Runtime dependencies', htmlTable(['Package', 'Declared version/range'], depsRows))}
${section('tests', 'Appendix G. Test-source inventory', '<p>Counts are static declarations, not evidence of a test run.</p>' + htmlTable(['Source file', 'Direct test/it declarations'], testsRows))}
<footer><h2>Keeping this document current</h2><p>Update <code>docs/architecture-overview.md</code>, then run <code>node scripts/docs/generate-architecture.mjs</code>. Generated files are placed in <code>generated-artifacts/architecture</code>.</p></footer>
</main><script>
const input=document.getElementById('inventory-search');
const groups=[...document.querySelectorAll('.inventory-group')];
input.addEventListener('input',()=>{
 const query=input.value.toLowerCase().trim();let matches=0;
 for(const group of groups){
  const heading=group.querySelector('summary,h2')?.textContent.toLowerCase()||'';
  const rows=[...group.querySelectorAll('.search-row')];let visible=0;
  for(const row of rows){const show=!query||heading.includes(query)||row.textContent.toLowerCase().includes(query);
   row.hidden=!show;if(show)visible++;}
  group.hidden=Boolean(query&&!visible);
  if(group.tagName==='DETAILS')group.open=Boolean(query&&visible);
  matches+=visible;
 }
 document.getElementById('search-status').textContent=query?matches+' matching inventory rows. The overview stays visible.':'The overview stays visible. Function groups expand when a search matches.';
});
</script></body></html>`;
fs.writeFileSync(path.join(output, 'DoorSurvey-Pro-Architecture-and-Functions.html'), html);
if (!functions.length || !routes.length || !tables.length || !screens.length) throw new Error('Incomplete inventory');
console.log(JSON.stringify({ output: path.relative(root, output), sourceCommit,
  sourceFiles: modules.length, functions: functions.length, routeDeclarations: routes.length,
  unresolvedRouterDeclarations: routes.filter(r => !r.resolved.length).length,
  browserRoutes: screens.length, tableDeclarations: tables.length, testFiles: tests.length,
  htmlBytes: Buffer.byteLength(html), markdownBytes: Buffer.byteLength(markdown) }, null, 2));
