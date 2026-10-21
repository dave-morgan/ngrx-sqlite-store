# Phase 12 execution plan

Scope and targets: [approved brief](phase-12-scale.md). No harness edits or commits.

1. Read state, Android evidence and referenced ADRs; reproduce Node workload and
   preserve baseline JSON. Profile before changing production code.
2. Add failing regressions for indexed refresh/reference identities, unchanged
   subtree enumeration/projectors, and default/configurable byte eviction.
3. Record ADR-0031/0032 and register entries before implementation. Implement
   element invalidation, batched indexed refresh and unchanged-reference fast paths.
4. Compact metadata; estimate immutable retained sizes and enforce inactive bytes.
5. Run focused and full tests; fix regressions preserving ADR-0021 and NgRx timing.
6. Run scale spike until all numeric targets hold, then all spikes, library build,
   harness development/sqlite build and spike strict type check. Record evidence.
7. Review diff and untouched harness. Tick Phase 12 in CLAUDE.md as final edit.

## Verification (2026-10-21)

- `npx.cmd ng test ngrx-sqlite-store --watch=false`: 211 tests, 21 files pass.
- `npx.cmd ng build ngrx-sqlite-store`: both entry points pass.
- `npx.cmd ng build harness -c development,sqlite`: passes; no harness source edits.
- `npx.cmd tsc -p projects/ngrx-sqlite-store/spikes/tsconfig.json`: passes.
- `npm.cmd run spikes`: passes in 126.26 seconds, including every 50k target.
- Final 50k: toggle 128.995 ms (classic 37.793 ms, bound 386.935 ms), UI
  19.261 ms, post-commit 0.347 ms, one entity row/three refresh statements,
  zero todos statements on UI, loaded heap 9.28 MiB vs classic 8.72 MiB,
  released heap 0.36 MiB above baseline. Full before/after: docs/spikes/scale.md.
- Code review edge cases have regressions: typed-id/scalar collision provenance,
  deferred/deduplicated selector cleanup, cyclic Map budgets and unchanged sort keys.
- ADR-0031/0032 and register rows recorded. No git commit.
