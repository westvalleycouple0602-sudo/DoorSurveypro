import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { users, memberships } from '../shared/schema';

// Execute the actual legacy route body without starting workers, connecting to
// a database, or loading unrelated integrations from the monolithic module.
const source = ts.createSourceFile('routes.ts', readFileSync('server/routes.ts', 'utf8'), ts.ScriptTarget.Latest, true);

test('mention resolution joins local memberships and filters by the requested organization', async () => {
  const file = ts.createSourceFile('comments.ts', readFileSync('server/services/comments.service.ts', 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'resolveUsernames');
  assert.ok(declaration);
  let calls = 0;
  const fixtures = [
    { id: 'local-a', email: 'a@example.com', organizationId: 'org-a' },
    { id: 'local-b', email: 'b@example.com', organizationId: 'org-b' },
  ];
  const db = drizzle(async (query, params) => {
    calls++;
    assert.match(query, /inner join "memberships" on "memberships"\."user_id" = "users"\."id"/);
    assert.match(query, /"memberships"\."organization_id" = \$\d+/);
    const org = params[params.length - 1];
    return { rows: fixtures.filter(row => row.organizationId === org && params.includes(row.email)).map(row => [row.id, row.email]) };
  });
  const compiled = ts.transpileModule(declaration.getText(file), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const resolve = new Function('db', 'users', 'memberships', 'eq', 'and', 'inArray', 'sql', `${compiled}\nreturn resolveUsernames;`)(db, users, memberships, eq, and, inArray, sql);
  assert.deepEqual(await resolve(['A@example.com', 'b@example.com'], 'org-a'), new Map([['a@example.com', 'local-a']]));
  assert.deepEqual(await resolve(['a@example.com', 'B@example.com'], 'org-b'), new Map([['b@example.com', 'local-b']]));
  assert.deepEqual(await resolve(['b@example.com'], 'org-a'), new Map());
  assert.deepEqual(await resolve([], 'org-a'), new Map());
  assert.equal(calls, 3, 'empty mention lists do not query the database');
});
function loadHandler(method: string, path: string, dependencies: Record<string, unknown>) {
  let handler: ts.Node | undefined;
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
      && node.expression.expression.getText(source) === 'app'
      && node.expression.name.text === method
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])
      && node.arguments[0].text === path) {
      assert.equal(handler, undefined, 'ambiguous route registration');
      handler = node.arguments[node.arguments.length - 1];
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(handler, `missing ${method} ${path}`);
  const compiled = ts.transpileModule(`const handler = ${handler.getText(source)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(dependencies), `${compiled}\nreturn handler;`)(...Object.values(dependencies));
}

for (const resource of ['openings', 'hardware']) {
  for (const method of ['patch', 'delete']) {
    test(`${method} ${resource}: session scope reaches storage; foreign IDs and anonymous access have no effects`, async () => {
      const writes: unknown[][] = [];
      const compliance: string[] = [];
      const projects = [{ id: 'project-a', organizationId: 'org-a' }, { id: 'project-b', organizationId: 'org-b' }];
      const openings = [{ id: 'opening-a', projectId: 'project-a' }, { id: 'opening-b', projectId: 'project-b' }];
      const hardware = [{ id: 'hardware-a', openingId: 'opening-a' }, { id: 'hardware-b', openingId: 'opening-b' }];
      const mutate = async (...args: unknown[]) => { writes.push(args); return { id: args[0] }; };
      const handler = loadHandler(method, `/api/${resource}/:id`, {
        getOrganizationContext: async (req: { dbUser?: unknown }) => req.dbUser,
        storage: {
          getOpening: async (id: string) => openings.find(item => item.id === id),
          getHardwareItem: async (id: string) => hardware.find(item => item.id === id),
          getProject: async (id: string, org: string) => projects.find(item => item.id === id && item.organizationId === org),
          updateOpening: mutate, deleteOpening: mutate, updateHardwareItem: mutate, deleteHardwareItem: mutate,
        },
        checkOpeningCompliance: async (id: string) => { compliance.push(id); },
        logError: () => {},
        handleValidationError: (error: unknown) => { throw error; },
      });
      const ownId = resource === 'openings' ? 'opening-a' : 'hardware-a';
      const foreignId = resource === 'openings' ? 'opening-b' : 'hardware-b';
      async function request(id: string, authenticated: boolean, body: Record<string, unknown> = {}) {
        let status = 200;
        const res = { status(code: number) { status = code; return this; }, json() { return this; }, send() { return this; } };
        await handler({ params: { id }, body, providerSubject: 'clerk-subject', dbUser: authenticated ? { userId: 'local-user-a', organizationId: 'org-a', role: 'owner' } : null }, res);
        return status;
      }
      assert.equal(await request(ownId, false), 401);
      assert.equal(await request(foreignId, true, { organizationId: 'org-b' }), 404);
      if (method === 'patch') {
        const reassignment = resource === 'openings' ? { projectId: 'project-b' } : { openingId: 'opening-b' };
        assert.equal(await request(ownId, true, reassignment), 403);
      }
      assert.equal(writes.length, 0);
      assert.equal(compliance.length, 0);
      const spoofedBody = { organizationId: 'org-b', notes: 'Fixture' };
      assert.equal(await request(ownId, true, spoofedBody), method === 'delete' && resource === 'hardware' ? 204 : 200);
      assert.deepEqual(writes[0], method === 'patch' ? [ownId, 'org-a', spoofedBody] : [ownId, 'org-a']);
    });
  }
}
