import type { SqlExecutor } from '../storage/storage-engine';
import { getQueryIndexes, isBrandedEntity, validateQueryIndexes } from './entity-brand';

/** Registration-time upgrade, including databases created before query indexes existed. */
export async function ensureQueryIndexes(sql: SqlExecutor, initial: unknown): Promise<void> {
  const fields = new Set<string>();
  const visited = new WeakSet<object>();
  function visit(value: unknown): void {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    if (isBrandedEntity(value)) {
      for (const field of validateQueryIndexes(getQueryIndexes(value))) fields.add(field);
      for (const [key, child] of Object.entries(value))
        if (key !== 'ids' && key !== 'entities') visit(child);
      return;
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(initial);
  if (!fields.size) return;
  const existing = await sql.query<{ name: string; tbl_name: string; sql: string }>(
    "SELECT name,tbl_name,sql FROM sqlite_master WHERE type = 'index' AND name GLOB 'nss_query_*'",
  );
  const names = new Set(existing.map((row) => row.name));
  const declarations = [...fields].map((field) => ({
    field,
    name:
      'nss_query_' +
      [...field].map((char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
  }));
  const definition = (name: string, field: string) =>
    `CREATE INDEX ${name} ON nss_entity(coll,json_extract(data,'$.${field}')) WHERE data != '' AND json_valid(data)`;
  const normalize = (value: string) =>
    value
      .replace(/\bIF NOT EXISTS\s+/i, '')
      .replace(/;\s*$/, '')
      .trim();
  for (const { field, name } of declarations) {
    const persisted = existing.find((index) => index.name === name);
    if (
      persisted &&
      (persisted.tbl_name !== 'nss_entity' || normalize(persisted.sql) !== definition(name, field))
    )
      throw new Error('Conflicting query index: ' + name);
  }
  const missing = declarations.filter((index) => !names.has(index.name));
  if (names.size + missing.length > 32)
    throw new RangeError('At most 32 persisted query indexes per database');
  if (missing.length)
    await sql.exec(
      missing
        .map(
          ({ field, name }) =>
            `CREATE INDEX IF NOT EXISTS ${name} ON nss_entity(coll,json_extract(data,'$.${field}')) WHERE data != '' AND json_valid(data);`,
        )
        .join('\n'),
    );
}
