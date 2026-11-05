# ADR-0091: Phase 16 start, and a guard on the large-list profile

Status: Accepted (User direction, 2026-10-26; recorded by the agent).

## Context
ADR-0090 met the large-list goal (15aa: 16 PASS / 14 PB / 3 CB / 0 FAIL). Phase 16 now addresses large flat objects and hybrid workflow state (brief `docs/briefs/phase-16-flat-and-hybrid.md`).

The user's constraint: changes made for flat structures must not change the list profile.

## Decision
1. **Isolated workloads.** The Phase 16 harness workloads come from `phase16-baseline` (`824414b`). They are mounted only through one lazy route group, `/shapes/flat` and `/shapes/workflow` (`shapes.routes.ts`). The group's route providers register:
   - the `flat` and `workflow` features (`provideShapesState` from the new `@impl/shapes` alias);
   - the simulated-load effect;
   - the `window.__shapes` bench hook.

   The list app's root providers, boot seeding and effects are unchanged. The only list-visible effects:
   - two nav links;
   - the shared library code moves from `main` into a second initial chunk (initial JS bytes unchanged, about 416 KB).

   That effect is checked on device (below).
2. **List reference.** The 15aa APKs (`.tmp/15aa-apks/`) and `docs/benchmarks/android-parity-15aa-2026-10-25.*` are the list profile reference.
3. **Guard for every Phase 16 change**, harness or library:
   - All library tests pass, including the list-specific specs (streaming, recount, plan, catalog).
   - Prefer code paths that the entity-list path does not execute, such as node/flat writes and nested inline promotion. Changes to shared paths (engine, commit, PathCache, selection) need an explicit list check.
   - **On-device list probe:** a 50k first-ready diagnostic A/B (`.tmp/ab-first-ready.ps1`) against the current list reference. It must show no regression beyond run noise in the phase breakdown (boot, JS gap, transaction, post-commit).
   - **Before Phase 16 is ticked**, and after any shared-path change, a full list acceptance (the 15aa pipeline) must still be 0 FAIL. Its sqlite means must not be worse than 15aa beyond noise. A regression is fixed or reverted, never re-floored.
4. **Shapes measurement.** `tools/android-bench-shapes.mjs` runs alone on `emulator-5554`. With `--apks .tmp/benchmark-apks` it uses the same APKs as the list runs. It has the ADR-0038 alternating 5-trial statistics and a same-session commit floor.

## Consequences
- The list profile has an explicit, repeatable regression gate throughout Phase 16.
- Phase 16 optimisations land behind on-device evidence for both shapes and lists.
