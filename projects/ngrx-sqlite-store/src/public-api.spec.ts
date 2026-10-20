import { describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => {
  throw new Error('Optional Capacitor core loaded eagerly');
});
vi.mock('@capacitor-community/sqlite', () => {
  throw new Error('Optional SQLite plugin loaded eagerly');
});

import { CapacitorSqliteDriver, SqlJsDriver } from './public-api';
import { StorageEngine } from './lib/storage/storage-engine';

describe('public API optional drivers', () => {
  it('imports and constructs adapters without loading optional Capacitor dependencies', () => {
    expect(new StorageEngine(new SqlJsDriver()).status()).toBe('closed');
    expect(new CapacitorSqliteDriver({ database: 'test' })).toBeDefined();
  });
});
