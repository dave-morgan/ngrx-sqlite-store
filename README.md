# NgrxSqliteStore

Native apps can start SQLite recovery and schema checks before Angular bootstrap
with `prewarmSqliteStore`; see the [startup API and adoption rules](projects/ngrx-sqlite-store/README.md#early-native-startup).

## Performance (Phase 16 work in progress)

Latest verified acceptance: **16av (shapes) / 16L20 (lists)**, 2026-10-29. Full data is in [android-acceptance-16av-2026-10-29.json](docs/benchmarks/android-acceptance-16av-2026-10-29.json) and the decision is [ADR-0129](docs/decisions/0129-fresh-process-pipelined-open.md).

### Method
- **Device:** isolated Android 35 emulator (`emulator-5556`, WebView 154), release APKs.
- **Pairing:** classic `@ngrx/store` and `ngrx-sqlite-store` run the same harness app. There are 5 paired, alternating trials per metric, with fresh matched controls in each session (ADR-0038, ADR-0128).
- **Values:** each cell is a mean of trial medians/percentiles. Latency is in ms and memory in MB.

Verdicts:
- **PASS:** sqlite is within classic's mean + 1 SD.
- **PLATFORM-BOUND (PB):** the extra cost fits within a measured store-free platform floor, such as the Capacitor bridge round trip plus repaint, or a SQLite commit (ADR-0084 / ADR-0093).
- **CODE-BOUND (CB):** heap only; the extra is the library's own compiled code, measured with an empty-store control (ADR-0062).
- **FAIL:** none of the above.

### Large entity lists (todos), classic vs sqlite

| Metric | 1k classic | 1k sqlite | 10k classic | 10k sqlite | 50k classic | 50k sqlite |
|---|---:|---:|---:|---:|---:|---:|
| First ready (ms) | 387 | 476 PB | 321 | 600 PB | 409 | 1278 PB |
| Relaunch ready (ms) | 1498 | 1702 PB | 1398 | 1616 **FAIL** | 1519 | 1743 PB |
| Toggle p50 (ms) | 4.2 | 16.4 PB | 7.7 | 16.9 PB | 30.4 | 16.5 PASS |
| Toggle p95 (ms) | 11.9 | 64.7 PB | 17.4 | 69.2 PB | 54.0 | 62.3 PASS |
| Emit p50 (ms) | 0.1 | 3.4 PB | 0.1 | 3.5 PB | 0.1 | 3.5 PB |
| Emit p95 (ms) | 0.4 | 5.3 PB | 0.4 | 5.4 PB | 0.5 | 5.5 **FAIL** |
| JS heap, loaded (MB) | 4.6 | 5.5 CB | 7.1 | 5.5 PASS | 18.5 | 5.5 PASS |
| JS heap, after relaunch (MB) | 4.6 | 5.0 CB | 7.0 | 5.0 PASS | 18.5 | 5.0 PASS |
| PSS total, loaded (MB) | 222 | 234 PB | 229 | 242 PB | 241 | 239 PASS |
| PSS total, after relaunch (MB) | 221 | 221 PASS | 225 | 221 PASS | 237 | 222 PASS |

Lists overall: **12 PASS / 16 PLATFORM-BOUND / 3 CODE-BOUND / 2 FAIL** of 33 metrics.

Remaining list FAILs:
- 10k relaunch is 48 ms over its allowance.
- 50k emit p95 is 0.18 ms over.

At 10k and 50k items, sqlite keeps the JS heap flat (about 5 MB, against classic's 7–19 MB), because only the visible page is held in memory.

### Flat objects and workflow state (shapes)

These workloads use flat objects of 50 / 500 / 5000 keys and a nested workflow form with drafts and events. Values are emit p50 in ms.

| Workload | classic | sqlite | Verdict |
|---|---:|---:|---|
| Single key write, K=50 / 500 / 5000 | 0.4 / 0.4 / 1.6 | 10.3 / 9.2 / 11.1 | FAIL |
| 10-key write, K=50 / 500 / 5000 | 0.4 / 0.5 / 1.5 | 9.4 / 10.5 / 11.5 | FAIL |
| Replace 1% of keys, K=50 / 500 / 5000 | 0.4 / 0.4 / 0.4 | 7.7 / 9.5 / 13.9 | PB / PB / FAIL |
| Workflow field edit, depth 1 / 4 / 10 | 0.4 / 0.4 / 0.5 | 8.6 / 8.7 / 8.5 | FAIL / FAIL / PB |
| Workflow step change | 0.3 | 9.4 | FAIL |
| Workflow form reset | 0.3 | 31.3 | FAIL |
| Append 100 events | 0.4 | 12.6 | FAIL |
| Load cycle (with simulated API) | 8.4 | 15.1 | PASS |
| Relaunch ready | 1470 ms | 921 ms | PASS |

Shapes overall: **3 PASS / 54 PLATFORM-BOUND / 0 CODE-BOUND / 29 FAIL** of 86 metrics.

The p95 latencies are mostly PLATFORM-BOUND. The remaining FAILs are:
- median single writes, about 1–3 ms above the store-free commit+render floor;
- reset and append100;
- burst backlog (1–2 pending emissions against classic's 0; see ADR-0105);
- heap and PSS at small state sizes.

Every write is persisted and committed before subscribers are notified. Classic keeps state only in memory, so its sub-millisecond emits have no durability cost.

### Status
Phase 16 is still in progress. The goals are:
- every large-list metric PASS / PB / BB / CB in a full verified acceptance;
- every shapes metric PASS / PB / BB, or recorded in an ADR as an evidenced limit.

Neither goal is met yet. The per-run history is in [docs/decisions/README.md](docs/decisions/README.md), and the evidence is under [docs/benchmarks](docs/benchmarks).

---

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
