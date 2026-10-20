# ADR-0024: Optional declarative entity sort keys

Status: Accepted (Phase 10 brief / Agent, 2026-10-20). Resolves Q1.

## Context

The [Q1 report](../spikes/q1.md) now measures the real implementation. Indexed
OFFSET comparator probes grow with collection size; a scalar key removes those
probes while retaining ordered SQL pages. Arbitrary comparers remain supported.

## Decision

- `createEntityAdapter<T>({ selectId?, sortKey?: (entity: T) => string | number })`
  opts into key ordering. Supplying both a truthy sortComparer and sortKey throws
  in development. With neither option, insertion ordering is unchanged.
- Strings use binary UTF-8 code-point order, **not locale order**. Encoding is an
  `s` prefix followed by UTF-8 bytes rendered as hex. TextEncoder normalizes lone
  UTF-16 surrogates to the replacement character.
- Numbers use an `n` prefix plus 16 hex digits. Negative IEEE-754 bits are inverted;
  nonnegative bits have the sign bit flipped. This orders negatives, fractions,
  subnormals and both infinities correctly. Negative zero is normalized to zero.
  NaN and non-string/non-number keys throw. JSON entity payloads retain their
  existing JSON serialization contract; infinite keys can be computed from finite
  stored fields rather than persisting a non-JSON infinite payload.
- A nonempty collection cannot mix string and numeric keys in development.
  The resulting collection is checked with two index endpoint probes after each
  adapter operation, so replacing every key's type in one operation is allowed.
  Emptying a collection also permits changing its key type. Production still rejects
  invalid keys; callers must preserve homogeneous types themselves.
- `pos` records insertion order independently of sortkey. Updates and replacements
  retain the original position, including ID changes; new rows append. Equal keys
  sort by pos, including when an existing key moves into a tie. setAll starts a
  new insertion sequence. Removal and re-addition creates a new position.
- Classic operations use the real unsorted NgRx operation, then key-sort with
  insertion-order ties. Transient WeakMap metadata retains insertion order across
  classic operations and full/diff persistence. Reads reconstruct this metadata.
  Classic results retain the entity brand. Existing arbitrary sortComparer
  behavior and the ADR-0019 ID-collision exception are unchanged.
- Internal migration v3 adds `nss_entity_sortkey(coll, sortkey, pos)`. It changes
  no rows. Existing collections have NULL sortkeys and preserve pos order.
  A sortKey adapter backfills unkeyed rows on its first write, using the supplied
  transaction executor and RowWriter. Every data/key write remains capped and
  invalidates the collection and transaction identity cache.
- Reads order by sortkey, pos. Collections with all NULL keys retain insertion or
  comparer-maintained pos order. Do not mix keyed and non-keyed adapters on the
  same collection. Switching an existing collection to keyed mode is explicit
  through the first write with a sortKey adapter.

## Consequences

Numeric and string ordering agree across classic and transaction forms, IDs,
selectAll, pages and query selectors. Stable insertion ties deliberately differ
from NgRx's arbitrary-comparer lower-bound merge; parity uses an equivalent
comparer with insertion order as its secondary key. Keyed writes avoid comparator
probes and use the v3 index for ordered pages. Device performance validation
remains Phase 9; it does not block the accepted API and migration.
