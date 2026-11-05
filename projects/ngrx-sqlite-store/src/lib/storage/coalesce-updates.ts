import type { SqlValue } from '../driver/sql-driver';

const VALUE_UPDATE = 'UPDATE nss_node SET value = ? WHERE path = ?';
const KIND_VALUE_UPDATE = 'UPDATE nss_node SET kind = ?, value = ? WHERE path = ?';
/** One statement for a run of single-row node updates (SQLite UPDATE ... FROM, 3.33+). */
export const COALESCED_NODE_UPDATE =
  'UPDATE nss_node SET kind = COALESCE(u.kind, nss_node.kind), value = u.value FROM ' +
  "(SELECT json_extract(value,'$[0]') AS path, json_extract(value,'$[1]') AS kind, json_extract(value,'$[2]') AS value FROM json_each(?)) AS u " +
  'WHERE nss_node.path = u.path';

type Statement = { sql: string; params?: SqlValue[] };
type Update = [path: string, kind: number | null, value: string | null];

function asUpdate(statement: Statement): Update | undefined {
  const p = statement.params ?? [];
  if (statement.sql === VALUE_UPDATE && p.length === 2 && typeof p[1] === 'string' && (p[0] === null || typeof p[0] === 'string'))
    return [p[1], null, p[0] as string | null];
  if (statement.sql === KIND_VALUE_UPDATE && p.length === 3 && typeof p[0] === 'number' && typeof p[2] === 'string' &&
      (p[1] === null || typeof p[1] === 'string'))
    return [p[2], p[0], p[1] as string | null];
  return undefined;
}

/**
 * Replace each run of two or more consecutive single-row node value updates with one
 * statement. Only adjacent statements merge, so the order against every other write is
 * unchanged; within a run the last update of a path wins, exactly as sequential updates.
 */
export function coalesceNodeUpdates(statements: Statement[]): Statement[] {
  if (statements.length < 2) return statements;
  const out: Statement[] = [];
  let run: Map<string, Update> | undefined;
  let first: Statement | undefined;
  let count = 0;
  const close = () => {
    if (!run) return;
    if (count === 1 && first) out.push(first);
    else out.push({ sql: COALESCED_NODE_UPDATE, params: [JSON.stringify([...run.values()])] });
    run = undefined;
    first = undefined;
    count = 0;
  };
  for (const statement of statements) {
    const update = asUpdate(statement);
    if (!update) {
      close();
      out.push(statement);
      continue;
    }
    if (!run) {
      run = new Map();
      first = statement;
    }
    count++;
    // A later update of the same path replaces the earlier one; kind-only info carries over.
    const previous = run.get(update[0]);
    run.delete(update[0]);
    run.set(update[0], update[1] === null && previous ? [update[0], previous[1], update[2]] : update);
  }
  close();
  return out;
}
