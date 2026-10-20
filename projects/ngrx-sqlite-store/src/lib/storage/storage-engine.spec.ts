import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SQL_DRIVER } from '../driver/sql-driver';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { StorageEngine } from './storage-engine';
import type { Migration } from './storage-engine';

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
      engine.transaction(async () => {
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
