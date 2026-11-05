import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SQL_DRIVER } from '../driver/sql-driver';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { StorageEngine } from './storage-engine';
import type { Migration } from './storage-engine';
import { SCHEMA_MIGRATIONS } from '../schema/migrations';
import { NodeStore } from '../schema/node-store';
import { committedWrites } from './committed-writes';
import type { ChangeSet } from './change-set';

describe('StorageEngine', () => {
  let driver: SqlJsDriver;
  let engine: StorageEngine;
  const migration: Migration = {
    version: 2,
    up: async (sql) => {
      await sql.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    },
  };
  beforeEach(() => {
    driver = new SqlJsDriver();
    engine = new StorageEngine(driver, { migrations: [migration] });
  });
  afterEach(async () => {
    await engine.close();
  });

  it('reclaims bulk memory when idle after commit and notification, never for a small dispatch', async () => {
    await engine.open();
    const order: string[] = [];
    const commit = driver.batch.bind(driver);
    vi.spyOn(driver, 'batch').mockImplementation(async (...args) => {
      await commit(...args);
      order.push('commit');
    });
    const releaseBulkMemory = vi.fn(async () => { order.push('reclaim'); });
    Object.assign(driver, { releaseBulkMemory });
    const sub = engine.changes$.subscribe(() => order.push('notify'));
    await engine.transaction(async (tx) => { await tx.write!('INSERT INTO test(name) VALUES (?)', ['tiny']); });
    await engine.maintained();
    expect(releaseBulkMemory).not.toHaveBeenCalled();
    await engine.transaction(async (tx) => {
      await tx.write!('INSERT INTO test(name) VALUES (?)', ['x'.repeat(150000)]);
      tx.changes.add('test');
    });
    // Resolution (and the selector refresh behind it) is not delayed by maintenance.
    expect(order).toEqual(['commit', 'commit', 'notify']);
    // A read queued meanwhile still runs before the idle maintenance.
    await engine.read(async () => order.push('read'));
    await engine.maintained();
    expect(order).toEqual(['commit', 'commit', 'notify', 'read', 'reclaim']);
    sub.unsubscribe();
  });

  it('checkpoints when idle after every 64 small commits', async () => {
    await engine.open();
    const checkpoint = vi.fn(async () => undefined);
    Object.assign(driver, { checkpoint });
    for (let i = 0; i < 63; i++)
      await engine.transaction(async (tx) => { await tx.write!('INSERT INTO test(name) VALUES (?)', ['t']); });
    await engine.maintained();
    expect(checkpoint).not.toHaveBeenCalled();
    await engine.transaction(async (tx) => { await tx.write!('INSERT INTO test(name) VALUES (?)', ['t']); });
    await engine.maintained();
    expect(checkpoint).toHaveBeenCalledOnce();
  });

  it('does not suppress committed changes or attempt rollback if optional reclamation fails', async () => {
    await engine.open();
    const rollback = vi.spyOn(driver, 'rollback');
    Object.assign(driver, { releaseBulkMemory: async () => { throw new Error('maintenance'); } });
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    const notify = vi.fn();
    const sub = engine.changes$.subscribe(notify);
    try {
      await engine.transaction(async (tx) => {
        await tx.write!('INSERT INTO test(name) VALUES (?)', ['x'.repeat(150000)]);
        tx.changes.add('test');
      });
      expect(notify).toHaveBeenCalledTimes(1);
      await engine.maintained();
      expect(rollback).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledTimes(1);
      expect(await engine.read((sql) => sql.query('SELECT length(name) AS n FROM test'))).toEqual([{ n: 150000 }]);
    } finally { sub.unsubscribe(); log.mockRestore(); }
  });

  it.each([false, true])(
    'releases commit journals even when diagnostics retain ChangeSet (callback fails: %s)',
    async (fails) => {
      engine = new StorageEngine(driver, { migrations: SCHEMA_MIGRATIONS });
      await engine.open();
      const value = { payload: Array.from({ length: 100 }, (_, i) => ({ id: i })) };
      let retained!: ChangeSet;
      const sub = engine.changes$.subscribe((changes) => {
        retained = changes;
        expect(committedWrites(changes).values.get('sample')).toBe(value);
      });
      const operation = engine.transaction(async (tx) => {
        await new NodeStore().write(tx, 'sample', value, tx.changes);
        if (fails)
          tx.afterCommit(() => {
            throw new Error('callback');
          });
      });
      if (fails) await expect(operation).rejects.toThrow('callback');
      else await operation;
      expect(committedWrites(retained).values.size).toBe(0);
      expect(committedWrites(retained).entities.size).toBe(0);
      expect(await engine.read((sql) => new NodeStore().read(sql, 'sample'))).toEqual(value);
      sub.unsubscribe();
    },
  );

  it('discards unflushed writes on handler failure and rolls back an atomic batch failure', async () => {
    await engine.open();
    const batch = vi.spyOn(driver, 'batch');
    await expect(
      engine.transaction(async (tx) => {
        await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, 'lost']);
        throw new Error('handler');
      }),
    ).rejects.toThrow('handler');
    expect(batch).not.toHaveBeenCalled();
    await expect(
      engine.transaction(async (tx) => {
        await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, 'lost']);
        await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, 'duplicate']);
      }),
    ).rejects.toThrow();
    expect(await engine.read((sql) => sql.query('SELECT * FROM test'))).toEqual([]);
    await engine.transaction(async (tx) => {
      await tx.write!('INSERT INTO test(name) VALUES (?)', ['kept']);
    });
    expect(batch.mock.calls.at(-1)?.[1]).toEqual({ transaction: true });
    expect(await engine.read((sql) => sql.query('SELECT name FROM test'))).toEqual([
      { name: 'kept' },
    ]);
  });

  it.each([false, true])('streams bounded escaped UTF-8 payloads atomically (failure: %s)', async (fails) => {
    await engine.open();
    const sizes: number[] = [];
    const batch = driver.batch.bind(driver);
    vi.spyOn(driver, 'batch').mockImplementation(async (statements, options) => {
      sizes.push(new TextEncoder().encode(JSON.stringify(statements.map(({ sql, params }) => ({ statement: sql, values: params ?? [] })))).length);
      expect(options.transaction).toBe(false);
      await batch(statements, options);
    });
    const begin = vi.spyOn(driver, 'begin');
    const commit = vi.spyOn(driver, 'commit');
    const notify = vi.fn();
    const callback = vi.fn();
    engine.changes$.subscribe(notify);
    const payload = '\"\\\n😀'.repeat(8_000);
    const operation = engine.transaction(async (tx) => {
      for (let id = 0; id < 8; id++) await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [id, payload]);
      expect(sizes.length).toBeGreaterThan(0);
      expect(notify).not.toHaveBeenCalled();
      tx.changes.add('test');
      tx.afterCommit(callback);
      expect(await tx.query('SELECT COUNT(*) AS count FROM test')).toEqual([{ count: 8 }]);
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [9, payload]);
      if (fails) throw new Error('handler after streaming');
    });
    if (fails) await expect(operation).rejects.toThrow('handler after streaming');
    else await operation;
    expect(begin).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledTimes(fails ? 0 : 1);
    expect(sizes.every((size) => size <= 256 * 1024)).toBe(true);
    expect(await engine.read((sql) => sql.query('SELECT COUNT(*) AS count FROM test'))).toEqual([{ count: fails ? 0 : 9 }]);
    expect(notify).toHaveBeenCalledTimes(fails ? 0 : 1);
    expect(callback).toHaveBeenCalledTimes(fails ? 0 : 1);
  });

  it('flushes before reads, then rolls back every flushed write on failure', async () => {
    await engine.open();
    const batch = vi.spyOn(driver, 'batch');
    await expect(
      engine.transaction(async (tx) => {
        await tx.write!('INSERT INTO test(name) VALUES (?)', ['visible']);
        expect(await tx.query('SELECT name FROM test')).toEqual([{ name: 'visible' }]);
        await tx.write!('INSERT INTO test(name) VALUES (?)', ['pending']);
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    expect(batch.mock.calls[0][1]).toEqual({ transaction: false });
    expect(await engine.read((sql) => sql.query('SELECT * FROM test'))).toEqual([]);
  });

  it('rolls back earlier streamed chunks if a later chunk violates a constraint', async () => {
    await engine.open();
    const rollback = vi.spyOn(driver, 'rollback');
    const notify = vi.fn();
    engine.changes$.subscribe(notify);
    await expect(engine.transaction(async (tx) => {
      const payload = 'x'.repeat(150_000);
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, payload]);
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [2, payload]);
      // The first chunk has already executed, the second remains pending.
      expect(await driver.query('SELECT id FROM test')).toEqual([{ id: 1 }]);
      tx.changes.add('test');
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, 'duplicate']);
    })).rejects.toThrow();
    expect(rollback).toHaveBeenCalledOnce();
    expect(notify).not.toHaveBeenCalled();
    expect(await engine.read((sql) => sql.query('SELECT * FROM test'))).toEqual([]);
  });

  /** Simulates an order-preserving native plugin thread with delayed resolution. */
  function pipelineDriver(): string[] {
    const log: string[] = [];
    let thread = Promise.resolve();
    const serial = <T>(name: string, work: () => Promise<T>): Promise<T> => {
      const run = thread.then(async () => {
        await new Promise((resolve) => setTimeout(resolve, 2));
        log.push(`run:${name}`);
        return work();
      });
      thread = run.then(() => undefined, () => undefined);
      return run;
    };
    const batch = driver.batch.bind(driver);
    const query = driver.query.bind(driver);
    const commit = driver.commit.bind(driver);
    let calls = 0;
    Object.defineProperty(driver, 'pipelined', { value: true, configurable: true });
    vi.spyOn(driver, 'batch').mockImplementation((statements, opts) => {
      const name = `batch${++calls}`;
      log.push(`call:${name}`);
      return serial(name, () => batch(statements, opts));
    });
    vi.spyOn(driver, 'query').mockImplementation((sql, params) => serial('query', () => query(sql, params)));
    vi.spyOn(driver, 'commit').mockImplementation(() => serial('commit', commit));
    return log;
  }

  it('pipelines streamed batches on ordered transports and drains before reads and commit', async () => {
    await engine.open();
    const log = pipelineDriver();
    const payload = 'x'.repeat(150_000);
    await engine.transaction(async (tx) => {
      for (let id = 1; id <= 4; id++) await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [id, payload]);
      expect(await tx.query('SELECT count(*) n FROM test')).toEqual([{ n: 4 }]);
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [5, 'tail']);
      tx.changes.add('test');
    });
    // The second batch is issued before the first one has executed.
    expect(log.indexOf('call:batch2')).toBeLessThan(log.indexOf('run:batch1'));
    expect(log.filter((entry) => entry.startsWith('run:'))).toEqual([
      'run:batch1', 'run:batch2', 'run:batch3', 'run:batch4', 'run:query', 'run:batch5', 'run:commit',
    ]);
    expect(await engine.read((sql) => sql.query('SELECT count(*) n FROM test'))).toEqual([{ n: 5 }]);
  });

  it('releaseOnSend lets later operations queue natively behind one atomic batch', async () => {
    await engine.open();
    const log = pipelineDriver();
    const done = engine.transaction(async (tx) => {
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, 'session']);
    }, { releaseOnSend: true });
    const read = engine.read((sql) => sql.query('SELECT count(*) n FROM test'));
    // The read is issued before the batch has executed, and executes after it.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(log).toContain('call:batch1');
    expect(log).not.toContain('run:batch1');
    expect(await read).toEqual([{ n: 1 }]);
    await done;
    expect(log.filter((entry) => entry.startsWith('run:'))).toEqual(['run:batch1', 'run:query']);
  });

  it('releaseOnSend still rejects a failed batch', async () => {
    await engine.open();
    pipelineDriver();
    await engine.transaction(async (tx) => { await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, 'a']); });
    await expect(engine.transaction(async (tx) => {
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, 'conflict']);
    }, { releaseOnSend: true })).rejects.toThrow();
    expect(await engine.read((sql) => sql.query('SELECT name FROM test'))).toEqual([{ name: 'a' }]);
  });

  it('settles every pipelined batch, then rolls back when one fails', async () => {
    await engine.open();
    pipelineDriver();
    const rollback = vi.spyOn(driver, 'rollback');
    const notify = vi.fn();
    engine.changes$.subscribe(notify);
    const payload = 'x'.repeat(150_000);
    await expect(engine.transaction(async (tx) => {
      tx.changes.add('test');
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, payload]);
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, payload]); // conflict
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [2, payload]);
    })).rejects.toThrow();
    expect(rollback).toHaveBeenCalledOnce();
    expect(notify).not.toHaveBeenCalled();
    expect(await engine.read((sql) => sql.query('SELECT * FROM test'))).toEqual([]);
    await engine.transaction(async (tx) => { await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [9, 'ok']); });
    expect(await engine.read((sql) => sql.query('SELECT id FROM test'))).toEqual([{ id: 9 }]);
  });

  it('uses one atomic batch after initial reads and supports drivers without batching', async () => {
    await engine.open();
    const begin = vi.spyOn(driver, 'begin');
    await engine.transaction(async (tx) => {
      expect(await tx.query('SELECT * FROM test')).toEqual([]);
      await tx.write!('INSERT INTO test(name) VALUES (?)', ['batched']);
    });
    expect(begin).not.toHaveBeenCalled();
    Object.defineProperty(driver, 'batch', { value: undefined });
    await engine.transaction(async (tx) => {
      await tx.write!('INSERT INTO test(name) VALUES (?)', ['legacy']);
      expect(await tx.query('SELECT name FROM test')).toEqual([
        { name: 'batched' },
        { name: 'legacy' },
      ]);
    });
    expect(begin).toHaveBeenCalledTimes(1);
  });

  it('supports Angular injection using SQL_DRIVER and plain construction', async () => {
    TestBed.configureTestingModule({
      providers: [StorageEngine, { provide: SQL_DRIVER, useValue: driver }],
    });
    const injected = TestBed.inject(StorageEngine);
    expect(injected.status()).toBe('closed');
    await injected.open();
    expect(injected.status()).toBe('ready');
    await injected.close();
    expect(injected.status()).toBe('closed');
  });

  it('ships only nss_meta in v1 and opens idempotently', async () => {
    const minimal = new StorageEngine(driver);
    const opening = minimal.open();
    await Promise.resolve();
    expect(minimal.status()).toBe('opening');
    await opening;
    await minimal.open();
    expect(
      await minimal.read((sql) => sql.query("SELECT name FROM sqlite_master WHERE type = 'table'")),
    ).toEqual([{ name: 'nss_meta' }]);
    expect(await minimal.read((sql) => sql.query('SELECT * FROM nss_meta'))).toEqual([
      { key: 'schema_version', value: '1' },
    ]);
    await minimal.close();
  });

  it('runs ordered migrations only once across exported databases', async () => {
    const up = vi.fn(migration.up);
    engine = new StorageEngine(driver, { migrations: [{ version: 2, up }] });
    await engine.open();
    const data = driver.export();
    await engine.close();
    driver = new SqlJsDriver({ data });
    engine = new StorageEngine(driver, { migrations: [{ version: 2, up }] });
    await engine.open();
    expect(up).toHaveBeenCalledTimes(1);
    expect(
      await engine.read((sql) =>
        sql.query('SELECT value FROM nss_meta WHERE key = ?', ['schema_version']),
      ),
    ).toEqual([{ value: '2' }]);
  });

  it('serializes overlapping transactions without interleaving', async () => {
    await engine.open();
    const log: string[] = [];
    const first = engine.transaction(async (tx) => {
      log.push('first enter');
      await new Promise((resolve) => setTimeout(resolve, 5));
      await tx.run('INSERT INTO test(name) VALUES (?)', ['first']);
      log.push('first exit');
      return 1;
    });
    const second = engine.transaction(async (tx) => {
      log.push('second enter');
      expect(await tx.query('SELECT name FROM test')).toEqual([{ name: 'first' }]);
      log.push('second exit');
      return 2;
    });
    expect((await first).result).toBe(1);
    expect((await second).result).toBe(2);
    expect(log).toEqual(['first enter', 'first exit', 'second enter', 'second exit']);
  });

  it('reopens a current schema with one read and no transaction or DDL, including concurrent opens', async () => {
    await engine.open();
    const data = driver.export();
    await engine.close();
    driver = new SqlJsDriver({ data });
    engine = new StorageEngine(driver, { migrations: [migration] });
    const opening = vi.spyOn(driver, 'open');
    const begin = vi.spyOn(driver, 'begin');
    const exec = vi.spyOn(driver, 'exec');
    const run = vi.spyOn(driver, 'run');
    const commit = vi.spyOn(driver, 'commit');
    const query = vi.spyOn(driver, 'query');
    await Promise.all([engine.open(), engine.open()]);
    expect(engine.status()).toBe('ready');
    expect(opening).toHaveBeenCalledOnce();
    // One read returns the schema version together with all metadata and the index catalog.
    expect(query).toHaveBeenCalledOnce();
    expect(engine.bootCatalog()?.meta.get('schema_version')).toBe('2');
    expect(begin).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it('keeps the boot catalog only until a statement can change metadata or schema', async () => {
    await engine.open();
    // A freshly migrated schema has no open-time catalog.
    expect(engine.bootCatalog()).toBeUndefined();
    const reopen = async () => {
      const data = driver.export();
      await engine.close();
      driver = new SqlJsDriver({ data });
      engine = new StorageEngine(driver, { migrations: [migration] });
      await engine.open();
    };
    await reopen();
    expect(engine.bootCatalog()?.meta.get('schema_version')).toBe('2');
    // Unrelated row writes keep it exact.
    await engine.transaction(async (tx) => {
      await tx.write!('INSERT INTO test(id,name) VALUES (?,?)', [1, 'a']);
    });
    expect(engine.bootCatalog()).toBeDefined();
    await engine.transaction(async (tx) => {
      await tx.run('INSERT OR REPLACE INTO nss_meta (key, value) VALUES (?, ?)', ['feature:x:version', '1']);
    });
    expect(engine.bootCatalog()).toBeUndefined();
    await reopen();
    expect(engine.bootCatalog()?.meta.get('feature:x:version')).toBe('1');
    await engine.transaction(async (tx) => {
      await tx.exec('CREATE INDEX test_name ON test(name)');
    });
    expect(engine.bootCatalog()).toBeUndefined();
  });

  it('migrates missing version metadata atomically', async () => {
    await driver.open();
    await driver.exec('CREATE TABLE nss_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
    const begin = vi.spyOn(driver, 'begin');
    const commit = vi.spyOn(driver, 'commit');
    await engine.open();
    expect(begin).toHaveBeenCalledOnce();
    expect(commit).toHaveBeenCalledOnce();
    expect(await driver.query('SELECT value FROM nss_meta WHERE key = ?', ['schema_version'])).toEqual([{ value: '2' }]);
  });

  it.each(['abc', '-1', '1.5', '3'])('rejects invalid/newer schema %s before beginning a transaction', async (version) => {
    await driver.open();
    await driver.exec('CREATE TABLE nss_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
    await driver.run('INSERT INTO nss_meta VALUES (?,?)', ['schema_version', version]);
    const begin = vi.spyOn(driver, 'begin');
    const rollback = vi.spyOn(driver, 'rollback');
    const close = vi.spyOn(driver, 'close');
    await expect(engine.open()).rejects.toThrow('Unsupported schema version');
    expect(begin).not.toHaveBeenCalled();
    expect(rollback).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledOnce();
    expect(engine.status()).toBe('error');
  });

  it.each([
    new Error('database is locked'),
    new Error('no such table: unrelated'),
    new Error('Query: no such table: nss_meta_other'),
  ])('does not mask initial schema query failures: %s', async (error) => {
    const begin = vi.spyOn(driver, 'begin');
    vi.spyOn(driver, 'query').mockRejectedValueOnce(error);
    await expect(engine.open()).rejects.toBe(error);
    expect(begin).not.toHaveBeenCalled();
    expect(engine.status()).toBe('error');
  });

  it.each([
    new Error('no such table: nss_meta'),
    new Error('Query: no such table: nss_meta (code 1 SQLITE_ERROR)'),
    'Query: no such table: main.nss_meta',
  ])('initializes after narrowly recognized missing metadata table: %s', async (error) => {
    vi.spyOn(driver, 'query').mockRejectedValueOnce(error);
    await engine.open();
    expect(engine.status()).toBe('ready');
    expect(await driver.query('SELECT value FROM nss_meta WHERE key = ?', ['schema_version'])).toEqual([{ value: '2' }]);
  });

  it('rolls back failures, discards notifications and callbacks, and continues', async () => {
    await engine.open();
    const notify = vi.fn();
    const callback = vi.fn();
    engine.changes$.subscribe(notify);
    await expect(
      engine.transaction(async (tx) => {
        await tx.run('INSERT INTO test(name) VALUES (?)', ['lost']);
        tx.changes.add('todos');
        tx.afterCommit(callback);
        throw new Error('reducer failed');
      }),
    ).rejects.toThrow('reducer failed');
    expect(await engine.read((sql) => sql.query('SELECT * FROM test'))).toEqual([]);
    expect(notify).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
    await expect(
      engine.transaction(async (tx) => {
        await tx.exec("INSERT INTO test(name) VALUES ('next')");
      }),
    ).resolves.toMatchObject({ result: undefined });
  });

  it('emits committed changes, then awaits callbacks, then resolves', async () => {
    await engine.open();
    const log: string[] = [];
    const commit = driver.commit.bind(driver);
    vi.spyOn(driver, 'commit').mockImplementation(async () => {
      await commit();
      log.push('committed');
    });
    let visible: Promise<unknown> | undefined;
    engine.changes$.subscribe((changes) => {
      expect(log).toEqual(['committed']);
      expect(changes.paths()).toEqual(['todos/items']);
      // Direct driver access verifies visibility at the moment of emission.
      visible = driver.query('SELECT name FROM test');
      log.push('notified');
    });
    const outcome = await engine.transaction(async (tx) => {
      await tx.run('INSERT INTO test(name) VALUES (?)', ['visible']);
      tx.changes.add('todos/items');
      expect(log).toEqual([]);
      tx.afterCommit(async () => {
        await Promise.resolve();
        expect(await visible).toEqual([{ name: 'visible' }]);
        log.push('callback 1');
      });
      tx.afterCommit(() => {
        log.push('callback 2');
      });
      return 'result';
    });
    log.push('resolved');
    expect(outcome.result).toBe('result');
    expect(outcome.changes.paths()).toEqual(['todos/items']);
    expect(log).toEqual(['committed', 'notified', 'callback 1', 'callback 2', 'resolved']);
  });

  it('runs callbacks but emits nothing for an empty change set', async () => {
    await engine.open();
    const notify = vi.fn();
    const callback = vi.fn();
    engine.changes$.subscribe(notify);
    await engine.transaction(async (tx) => {
      tx.afterCommit(callback);
    });
    expect(notify).not.toHaveBeenCalled();
    expect(callback).toHaveBeenCalledOnce();
  });

  it('queues reads behind transactions so rolled-back data is never exposed', async () => {
    await engine.open();
    let entered!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writing = engine.transaction(async (tx) => {
      await tx.run('INSERT INTO test(name) VALUES (?)', ['temporary']);
      entered();
      await gate;
      throw new Error('rollback');
    });
    const rejected = expect(writing).rejects.toThrow('rollback');
    await started;
    let readRan = false;
    const reading = engine.read(async (sql) => {
      readRan = true;
      return sql.query('SELECT * FROM test');
    });
    await Promise.resolve();
    expect(readRan).toBe(false);
    release();
    await rejected;
    expect(await reading).toEqual([]);
  });

  it('does not roll back a committed transaction if an afterCommit callback fails', async () => {
    await engine.open();
    const rollback = vi.spyOn(driver, 'rollback');
    await expect(
      engine.transaction(async (tx) => {
        await tx.run('INSERT INTO test(name) VALUES (?)', ['kept']);
        tx.afterCommit(() => {
          throw new Error('callback failed');
        });
      }),
    ).rejects.toThrow('callback failed');
    expect(rollback).not.toHaveBeenCalled();
    expect(await engine.read((sql) => sql.query('SELECT name FROM test'))).toEqual([
      { name: 'kept' },
    ]);
  });

  it('rolls back commit failures and leaves the queue usable', async () => {
    await engine.open();
    vi.spyOn(driver, 'commit').mockRejectedValueOnce(new Error('commit failed'));
    const notify = vi.fn();
    engine.changes$.subscribe(notify);
    await expect(
      engine.transaction(async (tx) => {
        await tx.run('INSERT INTO test(name) VALUES (?)', ['lost']);
        tx.changes.add('todos');
      }),
    ).rejects.toThrow('commit failed');
    expect(notify).not.toHaveBeenCalled();
    expect(await engine.read((sql) => sql.query('SELECT * FROM test'))).toEqual([]);
  });

  it('rolls back failed migrations and exposes error status', async () => {
    await driver.open();
    await driver.exec('CREATE TABLE existing (id INTEGER)');
    let failedData: Uint8Array | undefined;
    const close = driver.close.bind(driver);
    vi.spyOn(driver, 'close').mockImplementation(async () => {
      failedData = driver.export();
      await close();
    });
    engine = new StorageEngine(driver, {
      migrations: [
        {
          version: 2,
          up: async (sql) => {
            await sql.exec('CREATE TABLE partial (id INTEGER)');
            throw new Error('migration failed');
          },
        },
      ],
    });
    await expect(engine.open()).rejects.toThrow('migration failed');
    expect(engine.status()).toBe('error');
    const restored = new SqlJsDriver({ data: failedData });
    await restored.open();
    try {
      expect(await restored.query("SELECT name FROM sqlite_master WHERE type = 'table'")).toEqual([
        { name: 'existing' },
      ]);
    } finally {
      await restored.close();
    }
    vi.mocked(driver.close).mockRestore();
  });

  it('sorts migrations and refuses unsupported schema downgrades', async () => {
    const order: number[] = [];
    engine = new StorageEngine(driver, {
      migrations: [
        {
          version: 3,
          up: async () => {
            order.push(3);
          },
        },
        {
          version: 2,
          up: async () => {
            order.push(2);
          },
        },
      ],
    });
    await engine.open();
    expect(order).toEqual([2, 3]);
    const data = driver.export();
    await engine.close();
    driver = new SqlJsDriver({ data });
    engine = new StorageEngine(driver);
    await expect(engine.open()).rejects.toThrow('Unsupported schema version: 3');
    expect(engine.status()).toBe('error');
  });

  it('rejects duplicate migration versions before running any migration', async () => {
    const up = vi.fn(migration.up);
    engine = new StorageEngine(driver, { migrations: [migration, { version: 2, up }] });
    await expect(engine.open()).rejects.toThrow('duplicate migration version');
    expect(up).not.toHaveBeenCalled();
  });

  it('stops further operations after rollback fails and retains both errors', async () => {
    await engine.open();
    vi.spyOn(driver, 'rollback').mockRejectedValueOnce(new Error('rollback failed'));
    await expect(
      engine.transaction(async (tx) => {
        await tx.run("INSERT INTO test(name) VALUES ('lost')");
        throw new Error('original failure');
      }),
    ).rejects.toMatchObject({
      errors: [new Error('original failure'), new Error('rollback failed')],
    });
    expect(engine.status()).toBe('error');
    await expect(engine.read((sql) => sql.query('SELECT 1'))).rejects.toThrow('not ready');
  });

  it('drains queued work before closing and rejects subsequent operations', async () => {
    await engine.open();
    const writing = engine.transaction(async (tx) => {
      await tx.exec("INSERT INTO test(name) VALUES ('done')");
    });
    const closing = engine.close();
    await writing;
    await closing;
    expect(engine.status()).toBe('closed');
    await expect(engine.read((sql) => sql.query('SELECT 1'))).rejects.toThrow('not ready');
    await expect(engine.transaction(async () => 1)).rejects.toThrow('not ready');
  });
});
