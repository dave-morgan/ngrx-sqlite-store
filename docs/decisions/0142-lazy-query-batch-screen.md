# ADR-0142: Lazy query batch in PathCache.refresh, rejected at host screen (16bs)

Status: Rejected (Agent, 2026-11-03).

## Candidate
`PathCache.refresh` always builds `queryBatch(sql)` and an empty promise array, then awaits `Promise.all([])`, even when only physical (non-query) entries are dirty.

Candidate 16bs (31 Oct) built the batch and the array lazily, only once a dirty query entry existed. A targeted spec went RED and then GREEN (5/5; `.tmp/16bs-refresh-*.log`). The initial screen fixtures that tried to spy on modules were invalid and are preserved in `.tmp/16bs-initial-screen-invalid`.

The candidate was never recorded in state before the session ended. It was included in snapshot commit 62dcd47.

## Screen
The removed work, per physical-only refresh, is:
- one array and two closures from the unused `queryBatch` factory;
- one empty `Promise.all` microtask.

That is microseconds. On-device emission SD is 0.1–1 ms, so a reversed device diagnostic could not resolve the change. Comparable allocation and await removals were each rejected after full device campaigns: 16af (ADR-0115), 16u (ADR-0104) and 16aa (ADR-0111).

## Decision
Rejected without device work. There is no unchanged-variance hunt and no APK was built.

- `path-cache.ts` is restored byte-for-byte from `.tmp/16bs-source-baseline/path-cache.ts`.
- Only the work assertion was removed: the test asserting no empty `Promise.all`.
- The four behaviour tests are kept: physical refresh without batch transport, one shared reader across dirty queries, fallback when batch transport fails, and failure followed by later recovery.
- The candidate source and spec are archived in `.tmp/16bs-rejected-source`.

Full library suite after restoration: 478 PASS (`.tmp/16bs-restoration-library.log`).
