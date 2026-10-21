# ADR-0031: Entity element invalidation and granular refresh

Status: Accepted. Date: 2026-10-21. Authority: Phase 12 brief.

Node reproduction before library changes: 50k toggle 1312.361 ms,
unrelated UI 136.790 ms, post-commit 84.182 ms. CPU profiling with
`node projects/ngrx-sqlite-store/spikes/run.mjs --scale-only --profile`
shows full `assemble`, `share` and `freezeTree` walks; the unchanged-reference
branch of `share` calls `freezeTree` again during both view publications.

Record data mutations at `coll/<escaped typed id>`, and membership/order
mutations additionally at `coll/#order`. EntityTx invalidates transaction
identities without broadening the RowWriter's ChangeSet. Query invalidation
continues to overlap the collection. A data-only refresh batches indexed entity
reads, copies the entities dictionary once, reuses ids/order/unchanged values,
and copies only the containing object spine. Order or whole-collection changes
use the existing complete reader. Promoted entities retain subtree fallback.
ChangeSet also retains transient physical-node-write provenance, so extra
properties with names such as `s:t1` cannot masquerade as entity updates, including
new keys in branded replacements. Physical changes use the complete reader;
data-only entity changes remain granular even beside such extras. Unchanged sort keys
are not rewritten or marked as order changes. Batch upserts report order only
for membership, position or key changes.

The former ChangeSet scanned all recorded paths for every insertion. Recording
individual ids exposed quadratic batch work (manual reproduction: 1k 15.7 ms,
5k 314.7 ms, 10k 801.4 ms). Use a segment trie for ancestor/overlap lookup and
descendant collapse; preserve defensive snapshots and insertion ordering.

Do not reconcile or recursively freeze identical references. Newly assembled
objects are frozen once; ordinary view construction shares the authoritative
cache values. Reference replacement hints still apply to reread branches
(ADR-0021). No schema or NgRx token/transaction changes.
Static selectors receive views containing only their declared path sources and
query values; unchanged scoped views skip source evaluation entirely. Foreign
selectors keep dynamic feature tracking. The compatibility State view remains
the union of loaded paths, with the same authoritative values, including when
devtools is attached.
