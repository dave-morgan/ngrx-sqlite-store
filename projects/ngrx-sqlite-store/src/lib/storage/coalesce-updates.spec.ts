import { describe, expect, it } from 'vitest';
import { SqlJsDriver } from '../driver/sqljs-driver';
import { COALESCED_NODE_UPDATE, coalesceNodeUpdates } from './coalesce-updates';

const V = 'UPDATE nss_node SET value = ? WHERE path = ?';
const KV = 'UPDATE nss_node SET kind = ?, value = ? WHERE path = ?';

describe('coalesceNodeUpdates', () => {
  it('merges only adjacent runs, keeps singletons and other statements in order', () => {
    const other = { sql: 'DELETE FROM nss_node WHERE path = ?', params: ['x'] };
    const single = { sql: V, params: ['"a"', 'f/a'] };
    const out = coalesceNodeUpdates([single, other, { sql: V, params: ['1', 'f/b'] }, { sql: KV, params: [3, '"c"', 'f/c'] }, other]);
    expect(out.map((s) => s.sql)).toEqual([V, other.sql, COALESCED_NODE_UPDATE, other.sql]);
    expect(JSON.parse(out[2].params![0] as string)).toEqual([['f/b', null, '1'], ['f/c', 3, '"c"']]);
  });

  it('applies exactly like the sequential updates on a real database, including repeats and kind changes', async () => {
    let seed = 7;
    const random = (n: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return Math.floor((seed / 0x100000000) * n);
    };
    for (let round = 0; round < 40; round++) {
      const statements = Array.from({ length: 2 + random(12) }, () => {
        const path = `f/k${random(6)}`;
        const value = random(5) === 0 ? null : JSON.stringify(random(2) ? `s${random(9)}` : random(99));
        return random(2) ? { sql: V, params: [value, path] } : { sql: KV, params: [1 + random(4), value, path] };
      });
      const dbs = [new SqlJsDriver(), new SqlJsDriver()];
      for (const db of dbs) {
        await db.open();
        await db.exec('CREATE TABLE nss_node (path TEXT PRIMARY KEY, parent TEXT, kind INTEGER NOT NULL, pos REAL, value TEXT) WITHOUT ROWID');
        for (let i = 0; i < 6; i++) await db.run('INSERT INTO nss_node VALUES (?,?,?,?,?)', [`f/k${i}`, 'f', 2, i, String(i)]);
      }
      for (const s of statements) await dbs[0].run(s.sql, s.params);
      for (const s of coalesceNodeUpdates(statements)) await dbs[1].run(s.sql, s.params);
      const read = (db: SqlJsDriver) => db.query('SELECT path, kind, value FROM nss_node ORDER BY path');
      expect(await read(dbs[1])).toEqual(await read(dbs[0]));
      for (const db of dbs) await db.close();
    }
  });
});
