import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

import { CapacitorSqliteDriver } from './capacitor-sqlite-driver';

const native = vi.hoisted(() => {
  interface Handle {
    open: boolean;
    transaction: boolean;
  }
  const handles = new Map<string, Handle>();
  const state = { platform: 'android', wal: 'wal' };
  const calls: string[] = [];
  const handle = ({ database, readonly = false }: { database: string; readonly?: boolean }) => {
    const value = handles.get(`${readonly ? 'RO' : 'RW'}_${database}`);
    if (!value) throw new Error('No available connection');
    return value;
  };
  const plugin = {
    initWebStore: vi.fn(async () => { calls.push('initWebStore'); }),
    checkConnectionsConsistency: vi.fn(async ({ dbNames }: { dbNames: string[] }) => {
      calls.push('consistency');
      if (dbNames.length === 0) {
        handles.clear(); // Native closes stale handles, rolling back their transaction.
        return { result: false };
      }
      return { result: true };
    }),
    createConnection: vi.fn(async (options: { database: string; readonly: boolean }) => {
      calls.push('create');
      const key = `${options.readonly ? 'RO' : 'RW'}_${options.database}`;
      if (handles.has(key)) throw new Error('Connection already exists');
      handles.set(key, { open: false, transaction: false });
    }),
    isDBOpen: vi.fn(async (options: { database: string; readonly: boolean }) => {
      calls.push('isDBOpen');
      return { result: handle(options).open };
    }),
    open: vi.fn(async (options: { database: string; readonly: boolean }) => {
      calls.push('open');
      handle(options).open = true;
    }),
    isTransactionActive: vi.fn(async (options: { database: string }) => {
      calls.push('isTransactionActive');
      return { result: handle(options).transaction };
    }),
    rollbackTransaction: vi.fn(async (options: { database: string }) => {
      calls.push('rollback');
      handle(options).transaction = false;
      return { changes: { changes: 0 } };
    }),
    query: vi.fn(async () => {
      calls.push('wal');
      return { values: [{ journal_mode: state.wal }] };
    }),
    close: vi.fn(async (options: { database: string; readonly: boolean }) => {
      calls.push('close');
      handle(options).open = false;
    }),
    closeConnection: vi.fn(async ({ database, readonly }: { database: string; readonly: boolean }) => {
      calls.push('closeConnection');
      handles.delete(`${readonly ? 'RO' : 'RW'}_${database}`);
    }),
    commitTransaction: vi.fn(async () => ({ changes: { changes: 0 } })),
    executeSet: vi.fn(async () => ({ changes: { changes: 0 } })),
    saveToStore: vi.fn(async () => { calls.push('saveToStore'); }),
  };
  return { calls, handles, plugin, state };
});

vi.mock('@capacitor/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor/core')>();
  return { ...actual, Capacitor: { ...actual.Capacitor, getPlatform: () => native.state.platform } };
});

vi.mock('@capacitor-community/sqlite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capacitor-community/sqlite')>();
  return { ...actual, CapacitorSQLite: native.plugin };
});

describe('CapacitorSqliteDriver startup', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    native.handles.clear();
    native.calls.length = 0;
    native.state.platform = 'android';
    native.state.wal = 'wal';
  });

  it('opens a fresh native handle with four bridge calls and no redundant probes', async () => {
    const driver = new CapacitorSqliteDriver({ database: 'test' });
    await driver.open();
    await driver.open();
    expect(native.calls).toEqual(['consistency', 'create', 'open', 'wal']);
    expect(native.handles.get('RW_test')).toEqual({ open: true, transaction: false });
  });

  it('still clears a stale native handle and interrupted transaction on WebView reload', async () => {
    const stale = { open: true, transaction: true };
    native.handles.set('RW_test', stale);
    await new CapacitorSqliteDriver({ database: 'test' }).open();
    expect(native.calls).toEqual(['consistency', 'create', 'open', 'wal']);
    expect(native.handles.get('RW_test')).not.toBe(stale);
    expect(native.handles.get('RW_test')?.transaction).toBe(false);
  });

  it('rolls back an interrupted transaction before configuring a retrieved writable handle', async () => {
    native.handles.set('RW_test', { open: true, transaction: true });
    // A retained JS wrapper is different from a fresh wrapper after page reload.
    vi.spyOn(SQLiteConnection.prototype, 'isConnection').mockResolvedValue({ result: true });
    vi.spyOn(SQLiteConnection.prototype, 'retrieveConnection').mockResolvedValue(
      new SQLiteDBConnection(
        'test',
        false,
        native.plugin as unknown as ConstructorParameters<typeof SQLiteDBConnection>[2],
      ),
    );
    vi.spyOn(SQLiteConnection.prototype, 'checkConnectionsConsistency').mockResolvedValue({ result: true });
    await new CapacitorSqliteDriver({ database: 'test' }).open();
    expect(native.calls).toEqual(['isDBOpen', 'isTransactionActive', 'rollback', 'wal']);
    expect(native.handles.get('RW_test')?.transaction).toBe(false);
  });

  it('opens readonly native handles without writable-only transaction probes or WAL', async () => {
    await new CapacitorSqliteDriver({ database: 'test', readonly: true }).open();
    expect(native.calls).toEqual(['consistency', 'create', 'open']);
    expect(native.handles.get('RO_test')?.open).toBe(true);
  });

  it('opens iOS handles without Android PRAGMAs or redundant native probes', async () => {
    native.state.platform = 'ios';
    await new CapacitorSqliteDriver({ database: 'test' }).open();
    expect(native.calls).toEqual(['consistency', 'create', 'open']);
  });

  it('opens readonly web handles without looking up a writable transaction', async () => {
    native.state.platform = 'web';
    await new CapacitorSqliteDriver({ database: 'test', readonly: true }).open();
    expect(native.calls).toEqual(['initWebStore', 'consistency', 'create', 'isDBOpen', 'open']);
  });

  it('retains web open/recovery probes and saves committed writes to its store', async () => {
    native.state.platform = 'web';
    const driver = new CapacitorSqliteDriver({ database: 'test' });
    await driver.open();
    expect(native.calls).toEqual([
      'initWebStore', 'consistency', 'create', 'isDBOpen', 'open', 'isTransactionActive',
    ]);
    await driver.commit();
    await driver.batch([{ sql: 'SELECT 1' }], { transaction: true });
    expect(native.plugin.saveToStore).toHaveBeenCalledTimes(2);
  });

  it('cleans up a rejected WAL mode and can retry opening', async () => {
    const driver = new CapacitorSqliteDriver({ database: 'test' });
    native.state.wal = 'delete';
    await expect(driver.open()).rejects.toThrow('did not enable WAL');
    expect(native.handles.size).toBe(0);
    native.state.wal = 'wal';
    await driver.open();
    expect(native.handles.get('RW_test')?.open).toBe(true);
  });

  it('cleans up a failed native open before permitting a retry', async () => {
    const driver = new CapacitorSqliteDriver({ database: 'test' });
    native.plugin.open.mockRejectedValueOnce(new Error('native open failed'));
    await expect(driver.open()).rejects.toThrow('native open failed');
    expect(native.handles.size).toBe(0);
    await driver.open();
    expect(native.handles.get('RW_test')?.open).toBe(true);
  });
});
