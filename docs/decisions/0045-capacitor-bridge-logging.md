# ADR-0045: Disable Capacitor bridge logging in benchmarked and production builds

Status: Accepted (Agent, 2026-10-22)

## Context
Capacitor's default `loggingBehavior` is `'debug'`. In debug builds that logs **every bridge call with its full payload** (`console.groupCollapsed` + `console.dir` for both the request and the result). When a devtools/CDP client is attached, as it is in the benchmark runner, those console messages and their payloads are serialized and retained.

The store moves every SQLite call over the bridge, so this skewed exactly the store-specific metrics. Classic NgRx never crosses the bridge, so its numbers were unaffected.

Measured on the Android emulator, sqlite build, before → after setting `loggingBehavior: 'none'`:

| Metric | 1k | 50k |
| --- | --- | --- |
| JS heap on /todos | 5.66 → 5.42 MB | **14.5 → 5.45 MB** |
| first-ready, seed included | 1011 → 717 ms | 6387 → 3851 ms |
| toggle p50 | 43 → 26 ms | 44 → 29 ms |
| emit p50 | 10.4 → 4.9 ms | 10.8 → 4.6 ms |

## Decision
- The harness `capacitor.config.ts` sets `loggingBehavior: 'none'`.
- Benchmarks compare like with like: neither build pays for bridge logging.
- `docs/guides/ram.md` and the README recommend `'none'` (or `'production'`, which logs only in debug builds) for apps using this store. Bridge logging is a debugging aid; leave it on only while you are debugging plugin calls.

## Consequences
- The parity reports from before this ADR overstate the store's bridge cost. Benchmarks taken from 2026-10-22 onwards use logging off.
