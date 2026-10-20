# ADR-0028: Query filter semantics and classic ordering metadata

Status: Accepted (Agent, 2026-10-20). Implements ADR-0027 and ADR-0024.

## Context

SQL NULL logic, JSON booleans, binary string comparisons and NgRx's sorted
batch merge do not automatically agree with JS predicates or insertion ties.
The Phase 10 brief requires parity, parameter safety and lazy query sources.

## Decision

- Filters use scalar string/finite number/boolean/null values. Equality is strict
  across scalar types; missing fields are equivalent to null. Objects and arrays
  do not equal scalar values. `ne` is the complement of `eq`, including missing
  fields. Ordered comparisons require matching non-null scalar types. Field
  traversal visits only JSON object properties; arrays are terminal values
  (no synthetic `.length` property). Strings
  compare in binary UTF-8 order. `in` is a disjunction of strict equality tests.
  `and: []` is true and `or: []` is false. An object combines its fields/operators
  with AND; `and`, `or`, `not` are reserved combinators. Empty filters match all.
- SQL predicates use COALESCE to make every clause two-valued; `not` therefore
  means the same thing in both evaluators. Both JSON paths and values are bound.
  `like` follows SQLite's default ASCII-insensitive `%` and `_` matching, without
  an escape character; NUL terminates either LIKE operand, as in SQLite.
  Invalid fields, operators, operands and pages throw at
  selector creation. Where objects should be treated as immutable definitions.
- `query(selectState)` resolves precise source metadata or traces an ordinary
  accessor (`state => state.feature.collection`) to find the collection path.
  Arbitrary transformations are not collection accessors. Relative `query()`
  selectors work directly on EntityState and with classic Store/MockStore;
  SQLite Store needs a collection accessor. Generic createQuerySelector supplies
  path explicitly and exposes only SqlReader.query to its reader. Direct generic
  evaluation returns initial, since arbitrary async SQL has no synchronous JS
  equivalent; entity query selectors supply their matching classic evaluator.
- Cache identities encode the path/key pair without concatenation ambiguity.
  Query entries share the existing path LRU budget but never own path entries.
  Query metadata propagates through our createSelector wrappers. JSON results
  use structural sharing; generic Map, Date, typed-array or cyclic results are
  preserved by type/reference rather than JSON reconciliation.
- For promoted rows, count/exists still aggregate inline rows in SQL. Page reads
  fetch only the required prefix before merging matching promoted entities.
  Promoted values are read individually, never through the collection path.
- Classic adapter outputs retain their non-enumerable entity brand. A separate
  WeakMap records insertion positions and encoded keys for keyed collections;
  node readers restore it and node full/diff writers consume it. This preserves
  tie positions when classic reducers are persisted through the bridge.

## Consequences

SQL and JS filters have one explicit contract, including null and mixed scalar
edge cases. A count query does not pin collection data. Advanced generic readers
own their SQL/schema dependencies and result equality for non-JSON values.
Accessor-based collection queries remain normal MemoizedSelectors and support
MockStore overrideSelector. No changes are made to harness or NgRx DI tokens.
