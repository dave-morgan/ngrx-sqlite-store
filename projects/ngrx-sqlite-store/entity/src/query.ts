import { isDevMode } from '@angular/core';
import type { EntityState } from '@ngrx/entity';
import type { MemoizedSelector } from '@ngrx/store';
import {
  ɵdecodeEntityId,
  ɵdependencies,
  ɵentityValuePath,
  ɵquerySelector,
  ɵreadSubtree,
} from 'ngrx-sqlite-store';
import type { SqlReader, SqlValue } from 'ngrx-sqlite-store';

export type QueryValue = string | number | boolean | null;
export interface QueryOperators {
  eq?: QueryValue;
  ne?: QueryValue;
  lt?: QueryValue;
  lte?: QueryValue;
  gt?: QueryValue;
  gte?: QueryValue;
  in?: readonly QueryValue[];
  like?: string;
}
export interface Where {
  [field: string]: QueryValue | QueryOperators | readonly Where[] | Where | undefined;
  and?: readonly Where[];
  or?: readonly Where[];
  not?: Where;
}
export interface QueryPage {
  where?: Where;
  offset: number;
  limit: number;
}
export interface EntityQueries<S, T, Id = string | number> {
  count(where?: Where): MemoizedSelector<S, number>;
  ids(where?: Where): MemoizedSelector<S, Id[]>;
  exists(where?: Where): MemoizedSelector<S, boolean>;
  page(options: QueryPage): MemoizedSelector<S, T[]>;
}

function scalar(value: unknown): asserts value is QueryValue {
  if (
    value !== null &&
    typeof value !== 'string' &&
    typeof value !== 'boolean' &&
    !(typeof value === 'number' && Number.isFinite(value))
  )
    throw new TypeError('Invalid query value');
}
function binaryCompare(a: string, b: string): number {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  for (let i = 0; i < Math.min(left.length, right.length); i++)
    if (left[i] !== right[i]) return left[i] - right[i];
  return left.length - right.length;
}
function like(value: string, pattern: string): boolean {
  // SQLite LIKE treats the first NUL as the end of either operand.
  value = value.split('\0')[0];
  pattern = pattern.split('\0')[0];
  const fold = (s: string) => s.replace(/[A-Z]/g, (c) => c.toLowerCase());
  const regex = [...fold(pattern)]
    .map((c) =>
      c === '%' ? '[\\s\\S]*' : c === '_' ? '[\\s\\S]' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    )
    .join('');
  return new RegExp('^' + regex + '$', 'u').test(fold(value));
}

/** Compile once to parameterized SQL and the exact same two-valued JS predicate. */
export function compileWhere(where: Where = {}): {
  sql: string;
  params: SqlValue[];
  test: (entity: unknown) => boolean;
  fields: ReadonlySet<string>;
} {
  const params: SqlValue[] = [];
  const fields = new Set<string>();
  const bind = (v: SqlValue) => {
    params.push(v);
    return '?';
  };
  type Predicate = (entity: unknown) => boolean;
  function compile(tree: Where): { sql: string; test: Predicate } {
    if (!tree || typeof tree !== 'object' || Array.isArray(tree))
      throw new TypeError('Invalid where tree');
    const clauses: string[] = [];
    const tests: Predicate[] = [];
    for (const [field, condition] of Object.entries(tree)) {
      if (field === 'and' || field === 'or') {
        if (!Array.isArray(condition)) throw new TypeError('Invalid query combinator');
        const children = condition.map((child) => compile(child as Where));
        clauses.push(
          children.length
            ? '(' + children.map((c) => c.sql).join(field === 'and' ? ' AND ' : ' OR ') + ')'
            : field === 'and'
              ? '1'
              : '0',
        );
        tests.push((e) =>
          field === 'and' ? children.every((c) => c.test(e)) : children.some((c) => c.test(e)),
        );
        continue;
      }
      if (field === 'not') {
        const child = compile(condition as Where);
        clauses.push(`NOT (${child.sql})`);
        tests.push((e) => !child.test(e));
        continue;
      }
      if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(field))
        throw new TypeError('Invalid query field: ' + field);
      fields.add(field.split('.')[0]);
      const get = (entity: unknown): unknown => {
        let value = entity;
        for (const key of field.split('.'))
          value =
            value && typeof value === 'object' && !Array.isArray(value) && Object.hasOwn(value, key)
              ? (value as Record<string, unknown>)[key]
              : null;
        return value ?? null;
      };
      const ops =
        condition !== null && typeof condition === 'object' && !Array.isArray(condition)
          ? condition
          : { eq: condition };
      for (const [op, operand] of Object.entries(ops)) {
        if (!['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'in', 'like'].includes(op))
          throw new TypeError('Invalid query operator: ' + op);
        const values = op === 'in' ? operand : [operand];
        if (!Array.isArray(values)) throw new TypeError('in expects an array');
        if (op === 'like' && typeof operand !== 'string')
          throw new TypeError('like expects a string');
        const comparisons = values.map((value: unknown) => {
          scalar(value);
          if (value === null && !['eq', 'ne', 'in'].includes(op)) return '0';
          // The validated path is a SQL literal so SQLite can match expression indexes.
          const path = "'$." + field + "'";
          const json = () => `json_extract(data, ${path})`;
          const type = () => `json_type(data, ${path})`;
          const guard =
            value === null
              ? `${json()} IS NULL`
              : typeof value === 'number'
                ? `${type()} IN ('integer','real')`
                : typeof value === 'boolean'
                  ? `${type()} IN ('true','false')`
                  : `${type()} = 'text'`;
          const operator = (
            {
              eq: '=',
              ne: '=',
              in: '=',
              lt: '<',
              lte: '<=',
              gt: '>',
              gte: '>=',
              like: 'LIKE',
            } as Record<string, string>
          )[op];
          if (value !== null && ['eq', 'ne', 'in'].includes(op))
            return `(COALESCE(${guard}, 0) AND ${json()} IS ${bind(typeof value === 'boolean' ? Number(value) : value)})`;
          const expression =
            value === null
              ? ['eq', 'ne', 'in'].includes(op)
                ? guard
                : '0'
              : `(${guard} AND ${json()} ${operator} ${bind(typeof value === 'boolean' ? Number(value) : value)})`;
          if (value === null) return expression;
          return `COALESCE(${expression}, 0)`;
        });
        const expression = comparisons.length ? '(' + comparisons.join(' OR ') + ')' : '0';
        clauses.push(op === 'ne' ? `NOT ${expression}` : expression);
        tests.push((e) => {
          const actual = get(e);
          const equal = (v: unknown) => actual === v;
          if (op === 'eq') return equal(operand);
          if (op === 'ne') return !equal(operand);
          if (op === 'in') return values.some(equal);
          if (op === 'like') return typeof actual === 'string' && like(actual, operand as string);
          if (actual === null || operand === null || typeof actual !== typeof operand) return false;
          const comparison =
            typeof actual === 'string'
              ? binaryCompare(actual, operand as string)
              : typeof actual === 'number'
                ? actual - (operand as number)
                : typeof actual === 'boolean'
                  ? Number(actual) - Number(operand)
                  : NaN;
          return op === 'lt'
            ? comparison < 0
            : op === 'lte'
              ? comparison <= 0
              : op === 'gt'
                ? comparison > 0
                : comparison >= 0;
        });
      }
    }
    return {
      sql: clauses.length ? '(' + clauses.join(' AND ') + ')' : '1',
      test: (e) => tests.every((test) => test(e)),
    };
  }
  const result = compile(where);
  return { ...result, params, fields };
}

export function entityQueries<S, T, Id = string | number>(
  selectState?: (state: S) => EntityState<T>,
  selectId: (entity: T) => string | number = (entity) => (entity as { id: string | number }).id,
  sorted = false,
): EntityQueries<S, T, Id> {
  const deps = selectState ? ɵdependencies(selectState) : [];
  let path = deps !== 'dynamic' && deps.length === 1 ? deps[0] : '';
  if (selectState) {
    // Ordinary accessor lambdas and foreign NgRx selectors stay useful as inputs.
    const paths = new WeakMap<object, string>();
    const trace = (segments: string[]): object => {
      const proxy = new Proxy(
        {},
        {
          get: (_, key) =>
            typeof key === 'string'
              ? trace([...segments, key.replace(/~/g, '~0').replace(/\//g, '~1')])
              : undefined,
        },
      );
      paths.set(proxy, segments.join('/'));
      return proxy;
    };
    try {
      path = paths.get(selectState(trace([]) as S)) ?? path;
    } catch {
      /* Precise source metadata remains authoritative. */
    }
  }
  let warned = false;
  function make<R>(
    kind: 'count' | 'ids' | 'exists' | 'page',
    initial: R,
    where?: Where,
    page?: QueryPage,
  ): MemoizedSelector<S, R> {
    const filter = compileWhere(where);
    if (
      page &&
      (!Number.isSafeInteger(page.offset) ||
        page.offset < 0 ||
        !Number.isSafeInteger(page.limit) ||
        page.limit < 0)
    )
      throw new RangeError('Invalid entity page');
    return ɵquerySelector(
      { path, key: JSON.stringify([kind, where ?? {}, page?.offset, page?.limit]), initial },
      async (sql: SqlReader) => {
        if (!path)
          throw new Error(
            'SQLite entity queries require a selectState selector with a single collection path',
          );
        const predicate = `coll = ? AND data != '' AND json_valid(data) AND ${filter.sql}`;
        if (kind === 'count' || kind === 'exists') {
          // Transport aggregate and promoted-row fallbacks in one bridge call.
          const transport = await sql.query<{ id: string | null; value: number | null }>(
            `SELECT id, NULL AS value FROM nss_entity WHERE coll = ? AND data = ''
             UNION ALL SELECT NULL, COUNT(*) FROM nss_entity WHERE ${predicate}`,
            [path, path, ...filter.params],
            ['id', 'value'],
          );
          let value = transport.find((row) => row.id === null)!.value!;
          for (const row of transport)
            if (row.id !== null) {
              if (filter.test(await ɵreadSubtree(sql, ɵentityValuePath(path, row.id)))) value++;
            }
          return (kind === 'exists' ? !!value : value) as R;
        }
        const transport = await sql.query<{
          id: string;
          pos: number;
          sortkey: string | null;
          data?: string;
          promoted: number;
          entity?: unknown;
        }>(
          `WITH promoted AS (
            SELECT id,pos,sortkey${kind === 'page' ? ',data' : ''},1 AS promoted
            FROM nss_entity WHERE coll = ? AND data = ''
          ), inline AS (
            SELECT id,pos,sortkey${kind === 'page' ? ',data' : ''},0 AS promoted
            FROM nss_entity WHERE ${predicate} ORDER BY sortkey,pos
            ${
              kind === 'page'
                ? `LIMIT CASE WHEN EXISTS(SELECT 1 FROM promoted) THEN ? ELSE ? END
              OFFSET CASE WHEN EXISTS(SELECT 1 FROM promoted) THEN 0 ELSE ? END`
                : ''
            }
          ) SELECT * FROM inline UNION ALL SELECT * FROM promoted ORDER BY sortkey,pos`,
          [
            path,
            path,
            ...filter.params,
            ...(kind === 'page' ? [page!.offset + page!.limit, page!.limit, page!.offset] : []),
          ],
          kind === 'page'
            ? ['id', 'pos', 'sortkey', 'data', 'promoted']
            : ['id', 'pos', 'sortkey', 'promoted'],
        );
        const promoted = transport.filter((row) => row.promoted);
        const rows = transport.filter((row) => !row.promoted);
        if (promoted.length && isDevMode() && !warned) {
          console.warn('ngrx-sqlite-store/entity: query evaluates promoted entities in JS.');
          warned = true;
        }
        for (const row of promoted) {
          const entity = await ɵreadSubtree(sql, ɵentityValuePath(path, row.id));
          if (filter.test(entity)) rows.push({ ...row, data: undefined, entity });
        }
        if (promoted.length)
          rows.sort((a, b) =>
            (a.sortkey ?? '') < (b.sortkey ?? '')
              ? -1
              : (a.sortkey ?? '') > (b.sortkey ?? '')
                ? 1
                : a.pos - b.pos,
          );
        if (kind === 'ids') return rows.map((r) => ɵdecodeEntityId(r.id)) as R;
        const selected = promoted.length
          ? rows.slice(page!.offset, page!.offset + page!.limit)
          : rows;
        return selected.map((r) => (r.data === undefined ? r.entity : JSON.parse(r.data))) as R;
      },
      (state: S) => {
        const collection = selectState ? selectState(state) : (state as EntityState<T>);
        const ids = collection.ids.filter((id) => filter.test(collection.entities[id]));
        return (
          kind === 'count'
            ? ids.length
            : kind === 'exists'
              ? !!ids.length
              : kind === 'ids'
                ? ids
                : ids
                    .slice(page!.offset, page!.offset + page!.limit)
                    .map((id) => collection.entities[id]!)
        ) as R;
      },
      {
        kind,
        test: filter.test,
        fields: filter.fields,
        selectId: (entity) => selectId(entity as T),
        sorted,
      },
    );
  }
  return {
    count: (where) => make('count', 0, where),
    ids: (where) => make('ids', [] as Id[], where),
    exists: (where) => make('exists', false, where),
    page: (page) => make('page', [] as T[], page.where, page),
  };
}
