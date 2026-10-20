# Brief: Phase 3 — Schema engine

Repo `C:\Development\ngrx-sqlite-store`. Read `CLAUDE.md`, `docs/architecture.md` §4, and ADR-0004, 0006, 0007, 0008, 0009, 0015 first. Phase 2 (driver, `StorageEngine`, `ChangeSet`, path utils, `WriteQueue`) already exists in `projects/ngrx-sqlite-store/src/lib/{driver,storage}`. Reuse it and don't rewrite it.

## Scope
Map JSON-shaped values to and from the v1 schema. Provide **read**, **full write**, **diff write**, and **delete** of subtrees. This phase has no Store, no reducers, and no selectors, and implements no entity *adapter* ops (only round-trip of an EntityState value).

## 1. DDL: internal migration v2 (`schema/migrations.ts`, registered with StorageEngine)
Implement exactly the schema in architecture §4.1: `nss_node`, `nss_node_parent` index, `nss_chunk`, `nss_entity`, `nss_entity_order` index. `nss_meta` already exists (v1). Use `WITHOUT ROWID` as specified.

## 2. Modules (`projects/ngrx-sqlite-store/src/lib/schema/`)
- `kinds.ts`: `enum NodeKind { Null=0, Bool=1, Num=2, Str=3, Json=4, Obj=5, Arr=6, Chunked=7, Entity=8 }`.
- `utf8.ts`: `utf8ByteLength(s: string): number`, fast and allocation-free (charCode loop that handles surrogate pairs).
- `size.ts`: `serializedSize(value): number` is the UTF-8 byte length of `JSON.stringify(value)`, computed by a single recursive walk without building the string. Memoize per object in a `WeakMap`, so promotion decisions over a tree are O(n) total. It must equal `utf8ByteLength(JSON.stringify(v))` exactly (property-test this).
- `policy.ts`: `StoragePolicy { rowCap = 1_048_576; promotionThreshold = 16_384; hints: Record<string /*feature-relative path pattern*/, 'collection' | 'inline'> }`. `decideKind(path, value, depth)` follows these rules:
  - null/bool/number/string → scalar kinds. A string whose `utf8ByteLength(JSON.stringify(s))` exceeds `rowCap` → `Chunked`.
  - Non-finite numbers and non-plain values (Date, Map, Set, class instances, functions, undefined inside arrays) throw `NonSerializableStateError` with the path.
  - Values branded as EntityState (see §4) → `Entity`.
  - Depth 0 (feature root) → always `Obj`. Depth 1 (top-level props): objects/arrays → `Obj`/`Arr` (always rows). This is the notification granularity unit (§6 of the architecture).
  - Deeper objects/arrays → `Json` unless the hint is `collection`, or `serializedSize > promotionThreshold`, or (hard) `serializedSize > rowCap` → `Obj`/`Arr`.
  - A hint of `inline` forces `Json` unless the size is over `rowCap`. The cap always wins (ADR-0008).
- `row-writer.ts`: **the only module that issues INSERT/UPDATE/DELETE on nss_node / nss_chunk / nss_entity.** Every value written is size-checked: assert `utf8ByteLength(valueText) <= rowCap` and throw `RowCapExceededError` otherwise. That throw is a bug guard, because the policy should have prevented it. Every write and delete records its path in the `ChangeSet` (prefix deletes record the prefix; entity writes record `coll` path). Batch statements where possible, using multi-row INSERT with chunked parameter lists (≤ 999 params).
- `positions.ts`: fractional positions. Use `between(a?: number, b?: number): number` and `initial(n): number[]` (1, 2, 3, ...). When `between` loses precision (`b - a < 1e-9`), the caller renormalises that parent's children to integers. Provide `needsRenormalise`.
- `ids.ts`: hidden array element segment `#` + base36 id, unique per process (timestamp plus counter plus random). Entity ids are stored as text with a type prefix (`s:` string, `n:` number), so `1` and `'1'` stay distinct and round-trip with their type.
- `meta.ts`: `WeakMap<object, NodeMeta>`, where `NodeMeta = { path; kind; elementIds?: string[] /* array: index → hidden segment */; childPos?: Map<string, number>; entityPos?: Map<string, number> }`. The reader attaches meta to every object/array it produces (Obj/Arr/Entity kinds; Json-kind values get `{path, kind: Json}`). The diff writer uses it to find the existing rows for `prev`.
- `node-reader.ts`: `readSubtree(exec, path): Promise<unknown | undefined>`:
  - one prefix range query `WHERE path = ? OR (path >= ? AND path < ?) ORDER BY parent, pos`, using `subtreeRange` from `storage/path.ts`;
  - plus a `nss_entity` query for Entity nodes in range (`WHERE coll >= ? AND coll < ? OR coll = ?`, ordered by `coll, pos`);
  - plus a `nss_chunk` query for Chunked nodes in range.
  - Reassemble in a single pass. Object key order follows `pos` (object children get positions too, preserving insertion order). Arrays follow `pos`.
  - An EntityState is reassembled as `{ ids, entities, ...extraProps }`. Extra props are child nodes of the Entity pointer row with normal kinds.
  - Return `undefined` if the path doesn't exist. Freeze results in dev mode (`ngDevMode`) and attach meta. Also implement `readSubtreeCte(...)` using a recursive CTE over `parent` with the same output, for the Q3 spike comparison.
- `node-writer.ts`:
  - `writeSubtree(exec, path, value, changes, policy)`: delete whatever exists at path (prefix), then insert fresh rows. Positions start at `initial(n)`.
  - `diffWrite(exec, path, prev, next, changes, policy)` (ADR-0009):
    - If `prev === next` → no-op.
    - If `prev` is undefined or has no meta → `writeSubtree`.
    - If the decided kind changed vs the meta kind → `writeSubtree` (promotion/demotion).
    - Scalars/Json/Chunked → rewrite that row only if the value differs (deep-equal for Json is NOT needed: a new reference means rewrite).
    - Obj → for each key: unchanged ref skip; changed → recurse; added → insert after the last pos; removed → prefix delete. Key order changes are ignored (no reposition) unless keys were added.
    - Arr → match next elements to prev elements **by reference first** (objects), then primitives by value in order (greedy). Matched elements keep their hidden id. Compute the LIS of matched prev indices. Elements in the LIS keep their pos; other matched elements get repositioned via `between`; new elements are inserted with `between`; unmatched prev elements are deleted. Matched elements whose reference is the same skip recursion; matched-by-value primitives have nothing to write.
    - Entity → diff `ids` order (LIS on ids, same as arrays) and `entities` by id: same ref skip; changed ref → `UPDATE data`; new → insert; missing → delete. Extra props are diffed like Obj children.
    - After the diff, if `needsRenormalise` for a parent, renormalise its children's pos to integers.
  - `deleteSubtree(exec, path, changes)`: deletes from all three tables (nss_entity by coll prefix, nss_chunk by path prefix).
- `node-store.ts`: facade `NodeStore` with `read`, `write`, `diffWrite`, and `delete`, taking a `SqlExecutor` plus `ChangeSet`. Phase 4 builds `tx` on top of it.

## 4. EntityState brand
Export `const NSS_ENTITY_BRAND = Symbol.for('ngrx-sqlite-store/entity')` and `brandEntityState(obj)`, which defines a non-enumerable symbol property on the object. Phase 6's `getInitialState` will brand. Also detect structurally (an object with exactly `ids: array` + `entities: object` + other keys) **only** when the policy hint says `'entity'`, which you also add to the hint union. The reader brands the EntityState values it reassembles.

## 5. Tests (Vitest, in-memory SqlJsDriver via StorageEngine)
- Round-trip property tests: generate random JSON trees (depth ≤ 6, arrays in objects in arrays, empty objects/arrays, unicode, duplicate primitives, strings with `/` and `~` keys, keys starting with `#`). Assert `read(write(v))` deep-equals `v` with key order preserved, for different thresholds (tiny threshold forces promotion everywhere).
- `serializedSize` equals stringify byte length (property test, including emoji/surrogates).
- 1 MB cap: a 3 MB string round-trips via chunks; an array of 3000 objects × 1 KB is promoted to rows (no row > cap); `RowCapExceededError` can't be triggered through the public write paths (try many shapes).
- diffWrite minimality, asserted by spying on executed SQL (wrap the executor):
  - unchanged reference produces zero statements;
  - changing one leaf in a promoted object updates exactly one row;
  - an array append is one insert, a prepend is one insert, a move of one element is one pos update, and remove-middle is one delete;
  - an entity update of one entity is one UPDATE.
- The ChangeSet contains the right paths for each operation.
- Renormalisation after 60 inserts at the same spot.
- The CTE reader and the range reader return identical results.
- A NonSerializable error names the path.

## Done when
- Tests and the library build pass. Update `CLAUDE.md` (tick phase 3 and add notes) and architecture §4 if anything deviated (e.g. object-child pos). Commit with a Conventional Commit plus `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Return a summary of 15 lines or fewer.
