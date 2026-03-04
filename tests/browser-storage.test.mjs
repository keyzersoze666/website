import test from 'node:test';
import assert from 'node:assert/strict';
import {
  storageKeys,
  legacyStorageKeys,
  readStoredValue,
  clearStoredValues,
} from '../src/scripts/browser-storage.ts';
import { invoiceTemplate, parseDraft } from '../src/scripts/workflow-model.ts';

function browserStorage(initial) {
  const values = new Map(Object.entries(initial));
  const writes = [];
  return {
    values,
    writes,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
      writes.push(key);
    },
    removeItem: (key) => {
      values.delete(key);
      writes.push(key);
    },
  };
}

test('previously saved reading preferences remain available without new writes', () => {
  const storage = browserStorage({ [legacyStorageKeys.readingTheme]: 'dark' });
  assert.equal(readStoredValue(storage, 'readingTheme'), 'dark');
  assert.deepEqual(storage.writes, []);
});

test('a new preference takes precedence over the previous brand preference', () => {
  const storage = browserStorage({
    [legacyStorageKeys.readingTheme]: 'dark',
    [storageKeys.readingTheme]: 'light',
  });
  assert.equal(readStoredValue(storage, 'readingTheme'), 'light');
});

test('saved workflow content remains intact and does not automatically save a copy', () => {
  const draft = invoiceTemplate();
  const saved = JSON.stringify([draft]);
  const storage = browserStorage({ [legacyStorageKeys.workflows]: saved });
  const recovered = JSON.parse(readStoredValue(storage, 'workflows'));
  assert.deepEqual(parseDraft(JSON.stringify(recovered[0])), draft);
  assert.equal(storage.values.get(legacyStorageKeys.workflows), saved);
  assert.deepEqual(storage.writes, []);
  storage.setItem(storageKeys.workflows, '[]');
  assert.equal(readStoredValue(storage, 'workflows'), '[]');
});

test('clearing saved drafts removes both copies without affecting reading preferences', () => {
  const storage = browserStorage({
    [storageKeys.workflows]: '[]',
    [legacyStorageKeys.workflows]: '[]',
    [storageKeys.readingTheme]: 'dark',
    unrelated: 'keep',
  });
  clearStoredValues(storage, 'workflows');
  assert.equal(readStoredValue(storage, 'workflows'), null);
  assert.equal(storage.values.get(storageKeys.readingTheme), 'dark');
  assert.equal(storage.values.get('unrelated'), 'keep');
});
