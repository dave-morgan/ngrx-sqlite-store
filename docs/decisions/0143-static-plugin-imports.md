# ADR-0143: Static Capacitor plugin imports in the driver, rejected at validation (16bu)

Status: Rejected (Agent, 2026-11-03).

## Evidence that motivated it (16bt)
One instrumented cold relaunch at 10k on the retained 16au APK (`.tmp/16bt-relaunch-T1.json`) shows the following:

| Event | Time |
|---|---|
| main.js long task starts | 1611 ms |
| main.js long task ends | 1677 ms |
| First native call (prewarm `createConnection`) | 1766 ms |
| Ready | 2443 ms |

`main.ts` starts prewarm immediately, but `CapacitorSqliteDriver.open` first awaits dynamic imports of `@capacitor/core` and `@capacitor-community/sqlite`. These are lazy chunks, not modulepreloaded, and they load alongside the app chunks. The whole SQLite startup path sits behind this gap. The 10k relaunch FAIL is 48 ms over its allowance.

## Candidate
Import both packages statically in `capacitor-sqlite-driver.ts`, which moves about 13 KB into the initial graph.

## Outcome
The library suite failed in the full run:
- First run: 6 spec files failed to load. The driver spec's `vi.mock` factories ran during eager evaluation, before the hoisted `native` fixture existed.
- With a lazy proxy in the mock: all 35 driver tests timed out. Angular's Vitest bundling shares the driver module across spec files, so a statically bound import cannot be intercepted per file. The dynamic import worked because it resolved through the mock registry at call time.

Each spec passed on its own (driver 35/35, store 3/3).

Making this work needs an injectable plugin seam in the driver, a larger API and test refactor with an unproven device gain. Rejected without device work.

`capacitor-sqlite-driver.ts` and its spec are restored byte-for-byte from `.tmp/16bu-source-baseline`. The candidate is archived in `.tmp/16bu-rejected-source`, and the logs are in `.tmp/16bu-*.log`. 478 library tests pass after restoration.

## Future options
- **Preload in the app.** An app-level static or side-effect import of the plugin in `main.ts` puts the module in the initial graph, so the library's dynamic import resolves from the module cache. This is adoption guidance, not a library change, and it needs a decision on whether a harness change is fair.
- **Inject the plugin.** An optional `plugin` driver option would allow a static import with explicit test injection.
