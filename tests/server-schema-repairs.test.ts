import assert from 'node:assert/strict';
import { test } from 'node:test';
import { scanOpeningMeasurements } from '../server/lib/scan-opening-measurements';
import {
  insertOrganizationSchema, insertProcurementItemSchema, insertManufacturerOrderFormSchema,
  insertHROnboardingStepSchema, insertHRIntegrationCredentialSchema, insertDetectionOverrideSchema,
  insertExportBrandingSchema, updateDoorOpeningSchema,
} from '../shared/schema';

test('JSON array validators retain values and reject malformed nested entries', () => {
  const cases = [
    [insertOrganizationSchema.partial(), 'rolePermissions', { technician: ['survey:read'] }, { technician: [1] }],
    [insertProcurementItemSchema.partial(), 'openingIds', ['opening-a'], [1]],
    [insertHROnboardingStepSchema.partial(), 'resourceUrls', [{ title: 'Guide', url: '/guide' }], [{ title: 3 }]],
    [insertHRIntegrationCredentialSchema.partial(), 'fieldMappings', [{ hrField: 'email', localField: 'email' }], [{ hrField: 'email', localField: 3 }]],
    [insertManufacturerOrderFormSchema.partial(), 'procurementItemIds', ['item-a'], [false]],
    [insertManufacturerOrderFormSchema.partial(), 'fields', [{ fieldId: 'a', value: null, status: 'missing', messages: [] }], [{ fieldId: 'a', value: 1, status: 'invented', messages: [] }]],
  ] as const;
  for (const [validator, field, valid, invalid] of cases) {
    assert.deepEqual(validator.parse({ [field]: valid }), { [field]: valid });
    assert.equal(validator.safeParse({ [field]: invalid }).success, false);
    assert.deepEqual(validator.parse({}), {}, 'partial updates must not reset omitted values');
  }
});

test('detection overrides require explicit JSON values, including explicit null', () => {
  const base = { organizationId: 'org', createdBy: 'user', openingId: 'opening', fieldPath: 'width' };
  assert.equal(insertDetectionOverrideSchema.safeParse(base).success, false);
  assert.equal(insertDetectionOverrideSchema.safeParse({ ...base, originalValue: null, correctedValue: { width: 900 } }).success, true);
  assert.equal(insertDetectionOverrideSchema.safeParse({ ...base, originalValue: 1, correctedValue: Infinity }).success, false);
});

test('branding wizard payloads cannot replace row or tenant identities', () => {
  const validator = insertExportBrandingSchema.omit({ organizationId: true }).partial();
  assert.deepEqual(validator.parse({ id: 'foreign', organizationId: 'other', createdAt: new Date() }), {});
});

test('scan clear dimensions survive validation independently of door leaf dimensions', () => {
  assert.deepEqual(updateDoorOpeningSchema.parse({ clearWidth: 900, clearHeight: 2100, frameDepth: '5' }), {
    clearWidth: 900, clearHeight: 2100, frameDepth: '5',
  });
  assert.deepEqual(scanOpeningMeasurements({ width: 900, height: 2100, frameDepth: 127, units: 'mm' }), {
    clearWidth: 900, clearHeight: 2100, frameDepth: '5',
  });
  assert.deepEqual(scanOpeningMeasurements({ width: 900, height: 2100, frameDepth: 0 }), {
    clearWidth: 900, clearHeight: 2100,
  });
  for (const invalid of [
    { width: -1, height: 2100 }, { width: Infinity, height: 2100 },
    { width: 36, height: 84, units: 'in' },
  ]) assert.throws(() => scanOpeningMeasurements(invalid));
});
