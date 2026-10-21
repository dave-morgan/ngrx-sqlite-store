import type { SqlValue } from '../driver/sql-driver';
import type { SqlReader } from './query-selector';

/** Only infer unambiguous, explicitly aliased projections. SQLite renames duplicate
 * columns in subqueries, which differs from the driver's last-column-wins rows. */
export function learnedColumns(statement: string, row: unknown): readonly string[] | undefined {
  if (
    !row ||
    typeof row !== 'object' ||
    Array.isArray(row) ||
    !Object.values(row).every(
      (value) => value === null || ['string', 'number'].includes(typeof value),
    )
  )
    return undefined;
  if (!/^\s*SELECT\b/i.test(statement) || /--|\/\*/.test(statement)) return undefined;
  const sql = statement.replace(/^\s*SELECT\s+/i, '').replace(/;\s*$/, '');
  const projections: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  let end = sql.length;
  for (let index = 0; index < sql.length; index++) {
    const char = sql[index];
    if (quote) {
      if (char === quote) {
        if (sql[index + 1] === quote) index++;
        else quote = '';
      }
    } else if (["'", '"', '`', '['].includes(char)) quote = char === '[' ? ']' : char;
    else if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (depth === 0) {
      if (/^FROM\b/i.test(sql.slice(index)) && (index === 0 || /\s/.test(sql[index - 1]))) {
        end = index;
        break;
      }
      if (char === ',') {
        projections.push(sql.slice(start, index));
        start = index + 1;
      }
    }
  }
  projections.push(sql.slice(start, end));
  const aliases = projections.map((projection) => {
    const alias = /\sAS\s+("(?:[^"]|"")*"|[A-Za-z_$][\w$]*)\s*$/i.exec(projection)?.[1];
    return alias?.startsWith('"') ? alias.slice(1, -1).replace(/""/g, '"') : alias;
  });
  const columns = Object.keys(row);
  if (
    aliases.length !== columns.length ||
    aliases.some((alias, index) => alias !== columns[index]) ||
    new Set(aliases.map((alias) => alias?.toLowerCase())).size !== aliases.length
  )
    return undefined;
  return columns;
}

interface Request {
  statement: string;
  params: SqlValue[];
  columns: readonly string[];
  resolve: (rows: unknown[]) => void;
  reject: (error: unknown) => void;
}

/** Coalesce concurrent, known-shape read transports without changing readers. */
export function queryBatch(sql: SqlReader): SqlReader {
  let pending: Request[] = [];
  async function flush(): Promise<void> {
    const requests = pending;
    pending = [];
    try {
      // Bound parameters and compound SELECT terms to SQLite's portable limits.
      for (let start = 0; start < requests.length;) {
        const batch: Request[] = [];
        let bindings = 0;
        while (start < requests.length && batch.length < 32) {
          const request = requests[start];
          const size = request.params.length + request.columns.length;
          if (batch.length && bindings + size > 999) break;
          batch.push(request);
          bindings += size;
          start++;
        }
        const params: SqlValue[] = [];
        const statements = batch.map((request, index) => {
          const pairs = request.columns
            .map((column) => {
              return `?, "${column.replace(/"/g, '""')}"`;
            })
            .join(',');
          // Parameters in the object expression precede the subquery's parameters.
          params.push(...request.columns, ...request.params);
          return `SELECT ${index} AS slot, CASE WHEN length(CAST(payload AS BLOB)) <= 1048576 THEN payload END AS payload
            FROM (SELECT json_group_array(json_object(${pairs})) AS payload FROM (${request.statement.replace(/;\s*$/, '')}))`;
        });
        let rows: { slot: number; payload: string | null }[];
        try {
          rows = await sql.query<{ slot: number; payload: string | null }>(
            statements.join(' UNION ALL '),
            params,
          );
        } catch {
          // Arbitrary readers can return BLOBs or use non-subquery statements.
          // Preserve their driver result contract when JSON transport cannot.
          for (const request of batch)
            request.resolve(await sql.query(request.statement, request.params));
          continue;
        }
        for (const row of rows) {
          const request = batch[row.slot];
          request.resolve(
            row.payload === null
              ? await sql.query(request.statement, request.params)
              : JSON.parse(row.payload),
          );
        }
      }
    } catch (error) {
      for (const request of requests) request.reject(error);
    }
  }
  return {
    query: <R>(statement: string, params: SqlValue[] = [], columns?: readonly string[]) => {
      if (!columns || params.length + columns.length > 999) return sql.query<R>(statement, params);
      return new Promise<R[]>((resolve, reject) => {
        pending.push({
          statement,
          params,
          columns,
          resolve: (rows) => resolve(rows as R[]),
          reject,
        });
        if (pending.length === 1)
          queueMicrotask(() => {
            void flush();
          });
      });
    },
  };
}
