// Identifiers the suite searches for. The defaults match the records served by the mock CRVS.
// To run against a real CRVS, point TEST_DATA_FILE at a JSON file overriding any entry, e.g.
//   { "persons": { "full": { "identifier_type": "UIN", "identifier_value": "123456789" } } }

import { readFileSync } from 'node:fs';

const defaults = {
  persons: {
    full: { identifier_type: 'UIN', identifier_value: '700000007' },
    minimal: { identifier_type: 'UIN', identifier_value: '100000001' },
    newborn: { identifier_type: 'BRN', identifier_value: 'BRN2025000001' },
    deceased: { identifier_type: 'DRN', identifier_value: 'DRN2024000123' },
    stillborn: { identifier_type: 'DRN', identifier_value: 'DRN2025000099' },
    married: { identifier_type: 'MRN', identifier_value: 'MRN2018000456' },
    divorced: { identifier_type: 'UIN', identifier_value: '300000003' },
    widow: { identifier_type: 'UIN', identifier_value: '600000006' },
    multi: { identifier_type: 'UIN', identifier_value: '400000004' },
    unknown: { identifier_type: 'UIN', identifier_value: '999999999' },
    // The mock rejects this value with rjct.search.too_many_records_found.
    too_many: { identifier_type: 'UIN', identifier_value: 'TOOMANY000' },
  },
  regType: 'ns:org:RegistryType:Civil',
  regRecordType: 'spdci-extensions-dci:Person',
};

const overrides = process.env.TEST_DATA_FILE ? JSON.parse(readFileSync(process.env.TEST_DATA_FILE, 'utf8')) : {};

export const testData = {
  ...defaults,
  ...overrides,
  persons: { ...defaults.persons, ...(overrides.persons || {}) },
};

export function testPerson(name) {
  const person = testData.persons[name];
  if (!person) throw new Error(`Unknown test person "${name}". Known: ${Object.keys(testData.persons).join(', ')}`);
  return person;
}
