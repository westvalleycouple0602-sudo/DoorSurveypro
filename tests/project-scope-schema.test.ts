import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { getTableColumns } from 'drizzle-orm';
import {
  projects, insertProjectSchema, updateProjectSchema,
} from '../shared/schema';

const flags = {
  scopePowerByOthers: 'scope_power_by_others',
  scopeDemolitionByOthers: 'scope_demolition_by_others',
  scopePatchingByOthers: 'scope_patching_by_others',
  scopePaintingByOthers: 'scope_painting_by_others',
  scopeAsbestosAbatementByOthers: 'scope_asbestos_abatement_by_others',
  scopeStructuralWorkByOthers: 'scope_structural_work_by_others',
  scopeFireAlarmByOthers: 'scope_fire_alarm_by_others',
  scopeAccessControlByOthers: 'scope_access_control_by_others',
} as const;
const arrays = {
  scopeItemsToRemain: 'scope_items_to_remain',
  scopeItemsToRemove: 'scope_items_to_remove',
} as const;
const allFields = {
  ...flags, ...arrays, scopeAdditionalDisclaimers: 'scope_additional_disclaimers',
} as const;

const scope = {
  ...Object.fromEntries(Object.keys(flags).map(key => [key, 'yes'])),
  scopeItemsToRemain: ['Existing frame', 'Threshold'],
  scopeItemsToRemove: ['Existing closer'],
  scopeAdditionalDisclaimers: 'Power by others before installation.',
};

test('scope column declarations match both historical migration snapshots', () => {
  const columns = getTableColumns(projects);
  for (const snapshotName of ['0000_snapshot.json', '0001_snapshot.json']) {
    const snapshot = JSON.parse(readFileSync(
      new URL(`../migrations/meta/${snapshotName}`, import.meta.url), 'utf8',
    ));
    for (const [key, name] of Object.entries(allFields)) {
      const column = columns[key as keyof typeof allFields];
      const historical = snapshot.tables['public.projects'].columns[name];
      assert.ok(historical, `${snapshotName} contains ${name}`);
      assert.equal(column.name, name);
      assert.equal(column.getSQLType(), historical.type);
      assert.equal(column.notNull, historical.notNull);
      if (key in flags) {
        assert.equal(column.default, 'no');
        assert.equal(historical.default, "'no'");
      } else {
        assert.equal(column.hasDefault, false);
      }
    }
  }
});

test('project creation retains every scope value instead of silently stripping it', () => {
  const result = insertProjectSchema.parse({
    organizationId: 'org-a', name: 'Fixture project', location: 'Fixture site',
    buildingType: 'office', ...scope,
  });
  assert.deepEqual(updateProjectSchema.parse(scope), scope);
  for (const key of Object.keys(allFields)) {
    assert.deepEqual(result[key as keyof typeof result], scope[key as keyof typeof scope]);
  }
  assert.equal(result.organizationId, 'org-a');
});

test('partial scope updates do not reset omitted flags or unrelated fields', () => {
  assert.deepEqual(updateProjectSchema.parse({ scopeItemsToRemain: ['Frame'] }), {
    scopeItemsToRemain: ['Frame'],
  });
  assert.deepEqual(updateProjectSchema.parse({}), {});
});

test('legacy nulls and explicit empty scope lists remain supported', () => {
  const nullable = Object.fromEntries(Object.keys(allFields).map(key => [key, null]));
  assert.deepEqual(updateProjectSchema.parse(nullable), nullable);
  const empty = { scopeItemsToRemain: [], scopeItemsToRemove: [], scopeAdditionalDisclaimers: '' };
  assert.deepEqual(updateProjectSchema.parse(empty), empty);
});

test('scope validation rejects malformed arrays and non-text flags', () => {
  for (const key of Object.keys(arrays)) {
    assert.equal(updateProjectSchema.safeParse({ [key]: 'not an array' }).success, false);
    assert.equal(updateProjectSchema.safeParse({ [key]: [42] }).success, false);
  }
  for (const key of Object.keys(flags)) {
    assert.equal(updateProjectSchema.safeParse({ [key]: true }).success, false);
  }
  assert.equal(updateProjectSchema.safeParse({ scopeAdditionalDisclaimers: {} }).success, false);
});

test('scope patches cannot replace project ID or organization ownership', () => {
  const patch = updateProjectSchema.parse({
    ...scope, id: 'other-project', organizationId: 'org-b', createdAt: new Date(),
  });
  assert.deepEqual(patch, scope);
  // Schema-level regression only: route/storage ownership checks remain required.
});
