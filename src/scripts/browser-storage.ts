export const storageKeys = {
  readingTheme: 'samvit-labs-reading-theme',
  workflows: 'samvit-labs-workflows-v1',
} as const;

// Read previously saved browser data after the company rename. New writes use
// only storageKeys; clearing saved data also removes its legacy copy.
export const legacyStorageKeys = {
  readingTheme: 'ai-labs-reading-theme',
  workflows: 'ai-labs-workflows-v1',
} as const;

type StorageArea = keyof typeof storageKeys;

export function readStoredValue(
  storage: Pick<Storage, 'getItem'>,
  area: StorageArea
): string | null {
  return (
    storage.getItem(storageKeys[area]) ??
    storage.getItem(legacyStorageKeys[area])
  );
}

export function clearStoredValues(
  storage: Pick<Storage, 'removeItem'>,
  area: StorageArea
): void {
  storage.removeItem(storageKeys[area]);
  storage.removeItem(legacyStorageKeys[area]);
}
