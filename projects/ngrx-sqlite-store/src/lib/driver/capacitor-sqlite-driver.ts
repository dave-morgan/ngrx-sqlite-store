import type { SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

import type { Row, SqlDriver, SqlValue } from './sql-driver';

export interface CapacitorSqliteDriverOptions {
  database: string;
  encrypted?: boolean;
  mode?: string;
  version?: number;
  readonly?: boolean;
  /**
   * Steady SQLite page cache per connection in KiB (ADR-0070). Bulk transactions raise it
   * to BULK_CACHE_KIB until idle maintenance restores it. Default 512; SQLite's own is 2000.
   */
  cacheKiB?: number;
}

/**
 * Thin Capacitor adapter. On web the app must register the jeep-sqlite custom
 * element, mount <jeep-sqlite>, await its readiness, and serve sql-wasm.wasm
 * before opening this driver. Web commits are saved to the IndexedDB store.
 */
/**
 * ADR-0066: during streamed bulk transactions the automatic checkpoint is raised so the
 * bulk commit does not checkpoint inline; idle bulk maintenance restores the default.
 * Normal commits keep SQLite's default so the WAL stays bounded if the process dies.
 */
const BULK_AUTOCHECKPOINT_PAGES = 10_000;
const DEFAULT_AUTOCHECKPOINT_PAGES = 1000;
const DEFAULT_CACHE_KIB = 512;
const BULK_CACHE_KIB = 2000; // SQLite default; larger bulk caches leave allocator growth in PSS
/**
 * Written before a native open. A retained marker gates later document reloads.
 * Marker absence is a fresh-session heuristic, not proof of native process identity.
 */
const NATIVE_SESSION_KEY = 'ngrx-sqlite-store:native-open';

function sessionStore(): Storage | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Unknown (no storage, read failure) counts as possibly surviving: the safe, gated path. */
function mayHoldNativeHandle(key: string): boolean {
  try {
    const store = sessionStore();
    return !store || store.getItem(`${NATIVE_SESSION_KEY}:${key}`) !== null;
  } catch {
    return true;
  }
}

function markNativeHandle(key: string): boolean {
  try {
    const store = sessionStore();
    if (!store) return false;
    store.setItem(`${NATIVE_SESSION_KEY}:${key}`, '1');
    return true;
  } catch {
    return false; // A readable but unwritable session store cannot protect a later reload.
  }
}

export class CapacitorSqliteDriver implements SqlDriver {
  private sqlite?: SQLiteConnection;
  private web = false;
  private db?: SQLiteDBConnection;
  private android = false;
  /** Pending open-time verification, checked before the next operation resolves. */
  private verification?: Promise<void>;
  /** wal_autocheckpoint is raised for a bulk transaction until idle maintenance. */
  private bulk = false;
  /** The open-time first query, issued in the same native burst as create/open. */
  private prefetched?: { sql: string; rows: Promise<unknown[]> };

  constructor(private readonly options: CapacitorSqliteDriverOptions) {}

  /** `firstQuery` (parameterless) is sent right after open, saving a startup round trip. */
  async open(firstQuery?: string): Promise<void> {
    if (this.db) return;
    const [{ Capacitor }, { CapacitorSQLite, SQLiteConnection }] = await Promise.all([
      import('@capacitor/core'),
      import('@capacitor-community/sqlite'),
    ]);
    this.sqlite ??= new SQLiteConnection(CapacitorSQLite);
    this.web = Capacitor.getPlatform() === 'web';
    this.android = Capacitor.getPlatform() === 'android';
    if (this.web) await this.sqlite.initWebStore();
    const {
      database,
      encrypted = false,
      mode = 'no-encryption',
      version = 1,
      readonly = false,
    } = this.options;
    // isConnection/retrieveConnection are local JS lookups.
    const exists = (await this.sqlite.isConnection(database, readonly)).result ?? false;
    const create = () => this.sqlite!.createConnection(database, encrypted, mode, version, readonly);
    // Android queues plugin calls in send order: a read sent after open runs on the opened
    // handle without waiting for open's acknowledgement (ADR-0073).
    const prefetch = () => {
      if (!this.android || !firstQuery) return undefined;
      const rows = CapacitorSQLite.query({
        database: database.endsWith('.db') ? database.slice(0, -3) : database,
        statement: firstQuery, values: [], readonly, isSQL92: true,
      }).then((result) => (result.values ?? []) as unknown[]);
      rows.catch(() => undefined);
      return rows;
    };
    let reading: Promise<unknown[]> | undefined;
    // A surviving Android wrapper may already own an open SQLCipher database.
    // Its native open() replaces that database without closing it. Never open
    // until create succeeded; duplicate creation must reach the sweep first.
    const openCreated = (creating: Promise<SQLiteDBConnection>) => this.android ? creating.then(() => {
      const opening = CapacitorSQLite.open({
        database: database.endsWith('.db') ? database.slice(0, -3) : database,
        readonly,
      });
      // Preserve ordered open/query sends without waiting for open's response.
      reading = prefetch();
      return opening;
    }) : undefined;
    // Fresh process: no wrapper can survive, so create and open pipeline in send order
    // (ADR-0073) without waiting for create's acknowledgement. The marker is written
    // before any native open is sent, so a reload after that always takes the gate.
    // Match both installed normalization stages: JS strips one suffix, then Android
    // strips one more only for names without a slash. Aliases must share a marker.
    const connectionName = database.endsWith('.db') ? database.slice(0, -3) : database;
    const nativeName = !connectionName.includes('/') && connectionName.endsWith('.db')
      ? connectionName.slice(0, -3) : connectionName;
    const handleKey = `${nativeName}:${readonly ? 'ro' : 'rw'}`;
    const maySurvive = !this.android || mayHoldNativeHandle(handleKey);
    const marked = this.android && markNativeHandle(handleKey);
    const gated = maySurvive || !marked;
    const openPipelined = () => {
      const opening = CapacitorSQLite.open({
        database: database.endsWith('.db') ? database.slice(0, -3) : database,
        readonly,
      });
      reading = prefetch();
      return opening;
    };
    let reused = false;
    let opened = false;
    let db: SQLiteDBConnection;
    if (!exists && !this.web) {
      // ADR-0066: a fresh process has no native handles, so create optimistically.
      // Native connections outlive the WebView: after a reload, creation reports the
      // surviving handle and the sweep below (ADR-0046) closes it, including any
      // interrupted transaction, before creating again.
      // ADR-0126 candidate: successful creation must precede native open.
      // This intentionally changes ADR-0073's create/open acknowledgement ordering.
      const creating = create();
      const opening = gated ? openCreated(creating) : openPipelined();
      const [created, nativeOpen] = await Promise.allSettled([creating, opening] as const);
      if (created.status === 'rejected') {
        const error: unknown = created.reason;
        if (!/already exists/i.test(error instanceof Error ? error.message : String(error))) throw error;
        // Both dependent promises settled before closing a surviving native handle.
        // Sweep, create and open then queue natively in send order (ADR-0073), and
        // their responses resolve in that order: the sweep's registry reset lands
        // before create registers the new connection.
        const sweeping = this.sqlite.checkConnectionsConsistency();
        const recreating = create();
        // Gated: creation failure sent nothing to the surviving handle. Pipelined (no marker,
        // so not expected): the stale catalog read is replaced by the recovery prefetch.
        const reopening = openCreated(recreating);
        const [swept, recreated, reopened] = await Promise.allSettled([sweeping, recreating, reopening] as const);
        if (swept.status === 'rejected') throw swept.reason;
        if (recreated.status === 'rejected') throw recreated.reason;
        db = recreated.value;
        if (reopened.status === 'rejected') {
          await this.sqlite.closeConnection(database, readonly);
          throw reopened.reason;
        }
        opened = reopening !== undefined;
      } else {
        db = created.value;
        if (nativeOpen.status === 'rejected') {
          await this.sqlite.closeConnection(database, readonly);
          throw nativeOpen.reason;
        }
        opened = opening !== undefined;
      }
    } else {
      // With an empty JS registry this sweep closes surviving native handles before
      // creating a new one.
      const consistent = (await this.sqlite.checkConnectionsConsistency()).result ?? false;
      reused = consistent && exists;
      db = reused ? await this.sqlite.retrieveConnection(database, readonly) : await create();
    }
    try {
      // ADR-0046: native createConnection allocates a fresh closed handle. Web
      // creation can share an existing underlying DB, so preserve its probes.
      if (reused || this.web) {
        if (!((await db.isDBOpen()).result ?? false)) await db.open();
        // Transaction APIs resolve writable handles only, including on web.
        if (!readonly && (await db.isTransactionActive()).result) await db.rollbackTransaction();
      } else if (!opened) {
        await db.open();
      }
      // ADR-0042: retain the connection's synchronous level; WAL avoids the
      // populated database's rollback-journal cost on every small commit.
      if (Capacitor.getPlatform() === 'android' && !readonly) {
        // ADR-0066: journal mode persists in the file; issue it in order and verify it
        // before the next operation resolves rather than awaiting a round trip here.
        const wal = db.query('PRAGMA journal_mode=WAL').then((mode) => {
          if (mode.values?.[0]?.journal_mode !== 'wal') {
            throw new Error('Android SQLite connection did not enable WAL');
          }
        });
        wal.catch(() => undefined);
        this.verification = wal;
        // Ordered and unawaited, like the WAL pragma: no startup round trip.
        db.query(`PRAGMA cache_size=-${this.cacheKiB}`).catch((error) =>
          console.error('SQLite cache_size configuration failed', error));

      }
      this.db = db;
      if (reading && firstQuery && (opened || reused)) this.prefetched = { sql: firstQuery, rows: reading };
    } catch (error) {
      await this.sqlite.closeConnection(database, readonly);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.db) return;
    await this.database.close();
    await this.connection.closeConnection(this.options.database, this.options.readonly ?? false);
    this.db = undefined;
    this.verification = undefined;
    this.prefetched = undefined;
    this.bulk = false;
  }

  /** Reserved internal tables need literal deletes, not native sync rewriting. */
  get directDeletes(): boolean {
    return !!this.db && this.android && !this.options.readonly;
  }

  /** Native Capacitor runs plugin calls in post order on one plugin thread/queue. */
  get pipelined(): boolean {
    return !!this.db && !this.web;
  }

  /** Ordered and unawaited: precedes the bulk transaction's next statements. */
  beginBulk(): void {
    if (!this.android || this.options.readonly || this.bulk) return;
    this.bulk = true;
    this.database.query(`PRAGMA wal_autocheckpoint=${BULK_AUTOCHECKPOINT_PAGES}`).catch((error) =>
      console.error('SQLite wal_autocheckpoint configuration failed', error));
    this.database.query(`PRAGMA cache_size=-${Math.max(BULK_CACHE_KIB, this.cacheKiB)}`).catch((error) =>
      console.error('SQLite cache_size configuration failed', error));
  }

  private get cacheKiB(): number {
    return this.options.cacheKiB ?? DEFAULT_CACHE_KIB;
  }

  async releaseBulkMemory(): Promise<void> {
    if (!this.android || this.options.readonly) return;
    await this.verified(this.database.query('PRAGMA wal_checkpoint(TRUNCATE)'));
    if (this.bulk) {
      this.bulk = false;
      await this.database.query(`PRAGMA wal_autocheckpoint=${DEFAULT_AUTOCHECKPOINT_PAGES}`);
      await this.database.query(`PRAGMA cache_size=-${this.cacheKiB}`);
    }
    await this.database.query('PRAGMA shrink_memory');
  }

  async checkpoint(): Promise<void> {
    if (!this.android || this.options.readonly) return;
    await this.verified(this.database.query('PRAGMA wal_checkpoint(PASSIVE)'));
  }

  async exec(sql: string): Promise<void> {
    await this.verified(this.database.execute(sql, false));
  }

  async run(sql: string, params: SqlValue[] = []): Promise<{ changes: number; lastId?: number }> {
    const result = await this.verified(this.database.run(sql, params, false));
    return { changes: result.changes?.changes ?? 0, lastId: result.changes?.lastId };
  }

  async batch(
    statements: { sql: string; params?: SqlValue[] }[],
    opts: { transaction: boolean },
  ): Promise<void> {
    await this.verified(this.database.executeSet(
      statements.map(({ sql, params }) => ({
        statement: sql,
        values: params ?? [],
      })),
      opts.transaction,
    ));
    if (this.web && opts.transaction) await this.connection.saveToStore(this.options.database);
  }

  async query<R = Row>(sql: string, params: SqlValue[] = []): Promise<R[]> {
    const prefetched = this.prefetched;
    this.prefetched = undefined;
    if (prefetched && prefetched.sql === sql && params.length === 0)
      return (await this.verified(prefetched.rows)) as R[];
    // Plugin 8.x query has no transaction parameter (its third flag is isSQL92).
    return ((await this.verified(this.database.query(sql, params))).values as R[]) ?? [];
  }

  // Use the plugin's transaction API rather than raw BEGIN/COMMIT so the plugin's own
  // "transaction active" flag stays in sync. On web, jeep-sqlite otherwise treats each
  // statement as standalone and may persist (sql.js export()) mid-transaction, which
  // silently ends it ("cannot commit - no transaction is active").
  async begin(): Promise<void> {
    await this.verified(this.database.beginTransaction());
  }

  async commit(): Promise<void> {
    await this.verified(this.database.commitTransaction());
    if (this.web) await this.connection.saveToStore(this.options.database);
  }

  async rollback(): Promise<void> {
    await this.verified(this.database.rollbackTransaction());
  }

  /** Issue first (ordered), then surface a failed open-time verification instead. */
  private async verified<T>(operation: Promise<T>): Promise<T> {
    if (this.verification) {
      try {
        await this.verification;
        this.verification = undefined;
      } catch (error) {
        operation.catch(() => undefined);
        throw error;
      }
    }
    return operation;
  }

  private get connection(): SQLiteConnection {
    if (!this.sqlite) throw new Error('CapacitorSqliteDriver is not open');
    return this.sqlite;
  }

  private get database(): SQLiteDBConnection {
    if (!this.db) throw new Error('CapacitorSqliteDriver is not open');
    return this.db;
  }
}
