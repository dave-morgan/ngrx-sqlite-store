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

    query: vi.fn(async ({ statement, database, readonly }: { statement: string; database: string; readonly?: boolean }) => {

      if (/nss_meta/.test(statement)) {

        calls.push('catalog');

        const current = handles.get(`${readonly ? 'RO' : 'RW'}_${database}`) as { stale?: boolean } | undefined;

        return { values: [{ key: 'stale', value: String(!!current?.stale) }] };

      }

      if (/cache_size/.test(statement)) {

        calls.push('cache');

        return { values: [] };

      }

      if (/wal_autocheckpoint/.test(statement)) {

        calls.push('autocheckpoint');

        return { values: [{ wal_autocheckpoint: 10000 }] };

      }

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
  // A WebView reload keeps sessionStorage; the previous page marked its native open.
  const markSurvivingSession = (key = 'test:rw') =>
    sessionStorage.setItem(`ngrx-sqlite-store:native-open:${key}`, '1');

  it('does not orphan an open native database when recovering a surviving connection', async () => {
    markSurvivingSession();
    // Installed Database.open unconditionally assigns a new SQLCipher database to _db.
    // Closing the wrapper later can close only the latest underlying database.
    const liveDatabases = new Set<number>([1]);
    const ownedDatabases = new Map<string, number>([['RW_test', 1]]);
    let nextDatabase = 1;
    native.handles.set('RW_test', { open: true, transaction: false });
    native.plugin.open.mockImplementationOnce(async ({ database, readonly }) => {
      native.calls.push('open');
      const key = `${readonly ? 'RO' : 'RW'}_${database}`;
      if (!native.handles.has(key)) throw new Error('No available connection');
      const id = ++nextDatabase;
      liveDatabases.add(id);
      ownedDatabases.set(key, id);
      native.handles.get(key)!.open = true;
    });
    native.plugin.checkConnectionsConsistency.mockImplementationOnce(async ({ dbNames }) => {
      native.calls.push('consistency');
      if (dbNames.length === 0) {
        for (const id of ownedDatabases.values()) liveDatabases.delete(id);
        ownedDatabases.clear();
        native.handles.clear();
        return { result: false };
      }
      return { result: true };
    });
    await new CapacitorSqliteDriver({ database: 'test' }).open();
    // A recreated connection owns a new database; the initial overwritten one must be gone.
    const owned = new Set(ownedDatabases.values());
    expect([...liveDatabases].filter(id => !owned.has(id))).toEqual([]);
  });


  it('does not send native open before successful create acknowledgement', async () => {
    markSurvivingSession();

    let release!: () => void;

    const acknowledgement = new Promise<void>((resolve) => { release = resolve; });

    native.plugin.createConnection.mockImplementationOnce(async ({ database, readonly }) => {

      native.calls.push('create');

      native.handles.set(`${readonly ? 'RO' : 'RW'}_${database}`, { open: false, transaction: false });

      await acknowledgement;

    });

    const opening = new CapacitorSqliteDriver({ database: 'test' }).open();

    try {

      await vi.waitFor(() => expect(native.plugin.createConnection).toHaveBeenCalled(), { timeout: 100 });
      await Promise.resolve();
      expect(native.plugin.open).not.toHaveBeenCalled();

    } finally {

      release();

      await opening;

    }

  });



  it.each([['android', false], ['android', true], ['ios', false], ['web', false]] as const)(

    'reclaims bulk memory only on writable Android (%s readonly=%s)', async (platform, readonly) => {

      native.state.platform = platform;

      const driver = new CapacitorSqliteDriver({ database: 'test', readonly });

      await driver.open();

      native.plugin.query.mockClear();

      await driver.releaseBulkMemory();

      expect(native.plugin.query).toHaveBeenCalledTimes(platform === 'android' && !readonly ? 2 : 0);

      if (platform === 'android' && !readonly) {

        expect(native.plugin.query).toHaveBeenCalledWith(expect.objectContaining({ statement: 'PRAGMA wal_checkpoint(TRUNCATE)' }));

        expect(native.plugin.query).toHaveBeenCalledWith(expect.objectContaining({ statement: 'PRAGMA shrink_memory' }));

      }

      await driver.close();

    },

  );

  beforeEach(() => {

    vi.restoreAllMocks();

    vi.clearAllMocks();

    native.handles.clear();

    native.calls.length = 0;

    native.state.platform = 'android';

    native.state.wal = 'wal';

    sessionStorage.clear();

  });

  it('pipelines create and open in a fresh process without awaiting create (ADR-0073)', async () => {
    let release!: () => void;
    const acknowledgement = new Promise<void>((resolve) => { release = resolve; });
    native.plugin.createConnection.mockImplementationOnce(async ({ database, readonly }) => {
      native.calls.push('create');
      native.handles.set(`${readonly ? 'RO' : 'RW'}_${database}`, { open: false, transaction: false });
      await acknowledgement;
    });
    const opening = new CapacitorSqliteDriver({ database: 'test' }).open('SELECT key, value FROM nss_meta');
    try {
      await vi.waitFor(() => expect(native.plugin.open).toHaveBeenCalled(), { timeout: 100 });
      expect(native.plugin.query).toHaveBeenCalledWith(expect.objectContaining({ statement: 'SELECT key, value FROM nss_meta' }));
      // Marked before the native open was sent: a reload from here on takes the gate.
      expect(sessionStorage.getItem('ngrx-sqlite-store:native-open:test:rw')).toBe('1');
      expect(native.plugin.query).not.toHaveBeenCalledWith(expect.objectContaining({ statement: 'PRAGMA journal_mode=WAL' }));
      expect(native.plugin.query).not.toHaveBeenCalledWith(expect.objectContaining({ statement: 'PRAGMA cache_size=-512' }));
    } finally {
      release();
      await opening;
    }
  });

  it('gates the native open again after a reload of a page that opened', async () => {
    await new CapacitorSqliteDriver({ database: 'test' }).open();
    native.plugin.open.mockClear();
    let release!: () => void;
    const acknowledgement = new Promise<void>((resolve) => { release = resolve; });
    native.plugin.createConnection.mockImplementationOnce(async ({ database, readonly }) => {
      native.calls.push('create');
      native.handles.set(`${readonly ? 'RO' : 'RW'}_${database}`, { open: false, transaction: false });
      await acknowledgement;
    });
    native.handles.clear();
    const opening = new CapacitorSqliteDriver({ database: 'test' }).open();
    try {
      await vi.waitFor(() => expect(native.plugin.createConnection).toHaveBeenCalledTimes(2), { timeout: 100 });
      await Promise.resolve();
      expect(native.plugin.open).not.toHaveBeenCalled();
    } finally {
      release();
      await opening;
    }
  });

  it('waits for create acknowledgement when a readable session store cannot record the marker', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Session storage full', 'QuotaExceededError');
    });
    let release!: () => void;
    const acknowledgement = new Promise<void>((resolve) => { release = resolve; });
    native.plugin.createConnection.mockImplementationOnce(async ({ database, readonly }) => {
      native.calls.push('create');
      native.handles.set(`${readonly ? 'RO' : 'RW'}_${database}`, { open: false, transaction: false });
      await acknowledgement;
    });
    const opening = new CapacitorSqliteDriver({ database: 'test' }).open('SELECT key, value FROM nss_meta');
    try {
      await vi.waitFor(() => expect(native.plugin.createConnection).toHaveBeenCalled(), { timeout: 100 });
      await Promise.resolve();
      expect(native.plugin.open).not.toHaveBeenCalled();
      expect(native.plugin.query).not.toHaveBeenCalled();
    } finally {
      release();
      await opening;
    }
  });

  it.each(['test.db', 'test.db.db'])('recognizes the surviving native marker for alias %s', async (database) => {
    // The installed JS wrapper strips one .db, then Android strips another for simple names.
    markSurvivingSession('test:rw');
    let release!: () => void;
    const acknowledgement = new Promise<void>((resolve) => { release = resolve; });
    native.plugin.createConnection.mockImplementationOnce(async ({ database, readonly }) => {
      native.calls.push('create');
      native.handles.set(`${readonly ? 'RO' : 'RW'}_${database}`, { open: false, transaction: false });
      await acknowledgement;
    });
    const opening = new CapacitorSqliteDriver({ database }).open('SELECT key, value FROM nss_meta');
    try {
      await vi.waitFor(() => expect(native.plugin.createConnection).toHaveBeenCalled(), { timeout: 100 });
      await Promise.resolve();
      expect(native.plugin.open).not.toHaveBeenCalled();
      expect(native.plugin.query).not.toHaveBeenCalled();
    } finally {
      release();
      await opening;
    }
  });

  it('keeps native path names distinct when only the JS suffix normalization applies', async () => {
    // Android does not strip a suffix from a slash-containing native name.
    markSurvivingSession('path/test:rw');
    let release!: () => void;
    const acknowledgement = new Promise<void>((resolve) => { release = resolve; });
    native.plugin.createConnection.mockImplementationOnce(async ({ database, readonly }) => {
      native.calls.push('create');
      native.handles.set(`${readonly ? 'RO' : 'RW'}_${database}`, { open: false, transaction: false });
      await acknowledgement;
    });
    const opening = new CapacitorSqliteDriver({ database: 'path/test.db.db' }).open();
    try {
      await vi.waitFor(() => expect(native.plugin.open).toHaveBeenCalled(), { timeout: 100 });
    } finally {
      release();
      await opening;
    }
  });

  it('still holds the first operation until queued WAL verification succeeds', async () => {
    let release!: () => void;
    const acknowledgement = new Promise<void>((resolve) => { release = resolve; });
    native.plugin.query.mockImplementationOnce(async ({ statement }) => {
      expect(statement).toBe('PRAGMA journal_mode=WAL');
      native.calls.push('wal');
      await acknowledgement;
      return { values: [{ journal_mode: 'wal' }] };
    });
    const driver = new CapacitorSqliteDriver({ database: 'test' });
    await driver.open();
    let resolved = false;
    const operation = driver.query('SELECT 1').then(() => { resolved = true; });
    try {
      await Promise.resolve();
      await Promise.resolve();
      expect(resolved).toBe(false);
    } finally {
      release();
      await operation;
      await driver.close();
    }
    expect(resolved).toBe(true);
  });

  it('keeps readonly and writable markers separate', async () => {
    markSurvivingSession('test:ro');
    await new CapacitorSqliteDriver({ database: 'test' }).open();
    expect(native.calls.slice(0, 2)).toEqual(['create', 'open']);
  });

  it('gates the native open when sessionStorage is unavailable', async () => {
    vi.stubGlobal('sessionStorage', undefined);
    try {
      let release!: () => void;
      const acknowledgement = new Promise<void>((resolve) => { release = resolve; });
      native.plugin.createConnection.mockImplementationOnce(async ({ database, readonly }) => {
        native.calls.push('create');
        native.handles.set(`${readonly ? 'RO' : 'RW'}_${database}`, { open: false, transaction: false });
        await acknowledgement;
      });
      const opening = new CapacitorSqliteDriver({ database: 'test' }).open();
      await vi.waitFor(() => expect(native.plugin.createConnection).toHaveBeenCalled(), { timeout: 100 });
      await Promise.resolve();
      expect(native.plugin.open).not.toHaveBeenCalled();
      release();
      await opening;
    } finally {
      vi.unstubAllGlobals();
    }
  });



  it('opens a fresh native handle with two awaited bridge calls and no redundant probes', async () => {

    const driver = new CapacitorSqliteDriver({ database: 'test' });

    await driver.open();

    await driver.open();

    // ADR-0066: optimistic creation; the WAL pragma is issued in order, unawaited.

    expect(native.calls).toEqual(['create', 'open', 'wal', 'cache']);

    expect(native.handles.get('RW_test')).toEqual({ open: true, transaction: false });

  });



  it('still clears a stale native handle and interrupted transaction on WebView reload', async () => {
    markSurvivingSession();

    const stale = { open: true, transaction: true };

    native.handles.set('RW_test', stale);

    await new CapacitorSqliteDriver({ database: 'test' }).open();

    // The surviving handle makes optimistic creation fail; the sweep closes it first.

    expect(native.calls).toEqual(['create', 'consistency', 'create', 'open', 'wal', 'cache']);

    expect(native.handles.get('RW_test')).not.toBe(stale);

    expect(native.handles.get('RW_test')?.transaction).toBe(false);

  });



  it('pipelines the reload sweep, create and open, keeping the new registry entry', async () => {
    markSurvivingSession();

    native.handles.set('RW_test', { open: true, transaction: true });

    let release!: () => void;

    const acknowledgement = new Promise<void>((resolve) => { release = resolve; });

    const sweep = native.plugin.checkConnectionsConsistency.getMockImplementation()!;

    native.plugin.checkConnectionsConsistency.mockImplementationOnce(async (options) => {

      const result = await sweep(options);

      await acknowledgement;

      return result;

    });

    const driver = new CapacitorSqliteDriver({ database: 'test' });

    const opening = driver.open();

    try {

      // Replacement create/open can still precede the sweep acknowledgement;
      // no speculative open was sent to the surviving wrapper.

      await vi.waitFor(() => expect(native.plugin.open).toHaveBeenCalledTimes(1), { timeout: 100 });

      expect(native.calls).toEqual(['create', 'consistency', 'create', 'open']);

    } finally {

      release();

      await opening;

    }

    expect(native.handles.get('RW_test')).toEqual({ open: true, transaction: false });

    // The registry reset precedes registration: closing finds the connection.

    await driver.close();

    expect(native.plugin.closeConnection).toHaveBeenCalled();

  });



  it('pipelines the first catalog read with a fresh open and serves it without another call', async () => {

    const driver = new CapacitorSqliteDriver({ database: 'test' });

    const catalog = 'SELECT key, value FROM nss_meta';

    await driver.open(catalog);

    expect(native.calls).toEqual(['create', 'open', 'catalog', 'wal', 'cache']);

    native.plugin.query.mockClear();

    expect(await driver.query(catalog)).toEqual([{ key: 'stale', value: 'false' }]);

    expect(native.plugin.query).not.toHaveBeenCalled();

    // Consumed once: a later identical read goes to the plugin.

    await driver.query(catalog);

    expect(native.plugin.query).toHaveBeenCalledOnce();

  });



  it('serves only the replacement handle catalog after WebView reload', async () => {
    markSurvivingSession();

    native.handles.set('RW_test', { open: true, transaction: true, stale: true } as never);

    const driver = new CapacitorSqliteDriver({ database: 'test' });

    const catalog = 'SELECT key, value FROM nss_meta';

    await driver.open(catalog);

    expect(await driver.query(catalog)).toEqual([{ key: 'stale', value: 'false' }]);

  });



  it('preserves an unexpected connection creation error', async () => {

    native.plugin.createConnection.mockRejectedValueOnce(new Error('unavailable encryption key'));

    const driver = new CapacitorSqliteDriver({ database: 'test' });

    await expect(driver.open('SELECT key, value FROM nss_meta'))

      .rejects.toThrow('unavailable encryption key');

  });



  it('still sends a fresh catalog read before the native open acknowledgement', async () => {

    let release!: () => void;

    const acknowledgement = new Promise<void>((resolve) => { release = resolve; });

    const open = native.plugin.open.getMockImplementation()!;

    native.plugin.open.mockImplementationOnce(async (options) => {

      await open(options);

      await acknowledgement;

    });

    const driver = new CapacitorSqliteDriver({ database: 'test' });

    const catalog = 'SELECT key, value FROM nss_meta';

    const opening = driver.open(catalog);

    try {

      await vi.waitFor(() => expect(native.calls.filter((call) => call === 'catalog')).toHaveLength(1));

      expect(native.calls).toEqual(['create', 'open', 'catalog']);

    } finally {

      release();

      await opening;

    }

    expect(await driver.query(catalog)).toEqual([{ key: 'stale', value: 'false' }]);

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

    expect(native.calls).toEqual(['isDBOpen', 'isTransactionActive', 'rollback', 'wal', 'cache']);

    expect(native.handles.get('RW_test')?.transaction).toBe(false);

  });



  it('opens readonly native handles without writable-only transaction probes or WAL', async () => {

    await new CapacitorSqliteDriver({ database: 'test', readonly: true }).open();

    expect(native.calls).toEqual(['create', 'open']);

    expect(native.handles.get('RO_test')?.open).toBe(true);

  });



  it('opens iOS handles without Android PRAGMAs or redundant native probes', async () => {

    native.state.platform = 'ios';

    await new CapacitorSqliteDriver({ database: 'test' }).open();

    expect(native.calls).toEqual(['create', 'open']);

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

    await driver.open();

    // Verified before the next operation resolves; the engine then closes the driver.

    await expect(driver.query('SELECT 1')).rejects.toThrow('did not enable WAL');

    await expect(driver.batch([{ sql: 'SELECT 1' }], { transaction: true })).rejects.toThrow('did not enable WAL');

    await driver.close();

    expect(native.handles.size).toBe(0);

    native.state.wal = 'wal';

    await driver.open();

    await driver.query('SELECT 1');

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



  it('preserves creation error without opening or reading a native connection', async () => {
    markSurvivingSession();

    const failure = new Error('native creation failed');

    native.plugin.createConnection.mockRejectedValueOnce(failure);

    await expect(new CapacitorSqliteDriver({ database: 'test' }).open()).rejects.toBe(failure);

    expect(native.plugin.checkConnectionsConsistency).not.toHaveBeenCalled();

    expect(native.plugin.query).not.toHaveBeenCalled();

  });



  it.each([['android', false], ['android', true], ['ios', false], ['web', false]] as const)(

    'enables direct internal deletes only on open writable Android (%s readonly=%s)', async (platform, readonly) => {

      native.state.platform = platform;

      const driver = new CapacitorSqliteDriver({ database: 'test', readonly });

      expect(Reflect.get(driver, 'directDeletes') ?? false).toBe(false);

      await driver.open();

      expect(Reflect.get(driver, 'directDeletes') ?? false).toBe(platform === 'android' && !readonly);

      await driver.close();

      expect(Reflect.get(driver, 'directDeletes') ?? false).toBe(false);

    },

  );



  it('normalizes the database name for the speculative Android open', async () => {

    const driver = new CapacitorSqliteDriver({ database: 'test.db' });

    await driver.open();

    expect(native.plugin.open).toHaveBeenCalledWith({ database: 'test', readonly: false });

    await driver.close();

    expect(native.handles.size).toBe(0);

  });



});

