# ADR-0005: Entity is folded into the store as a first-party primitive

Status: Accepted (`sortComparer` is Q1)

## Context
`@ngrx/entity`'s `{ ids, entities }` structure maps naturally onto a table. Doing the bookkeeping in JS would defeat the RAM goal.

## Decision
An entity collection is a table: `selectId` gives the primary key, `entities` are the rows, and `ids` comes from an `ORDER BY pos`. We re-export a compatible `createEntityAdapter` (`addOne`, `addMany`, `setAll`, `setOne`, `setMany`, `removeOne`, `removeMany`, `removeAll`, `updateOne`, `updateMany`, `upsertOne`, `upsertMany`, `mapOne`, `map`, `getInitialState`, `getSelectors`). Its operations run against the `tx` and compile to SQL inside the reducer's transaction (e.g. `upsertMany` becomes `INSERT ... ON CONFLICT DO UPDATE`). `ngrx-sqlite-store/entity` serves as the alias target for `@ngrx/entity`.

## Consequences
- Adapter calls inside `tx` reducers take the transaction instead of `state`. This is part of the accepted reducer migration, and the exact form is Q6.
- `getSelectors()` returns source selectors over the table.
- A `sortComparer` function cannot run in SQLite (Q1).
