# NgrxSqliteStore

Native apps can start SQLite recovery and schema checks before Angular bootstrap
with `prewarmSqliteStore`; see the [startup API and adoption rules](projects/ngrx-sqlite-store/README.md#early-native-startup).

## Performance (this version: Phase 15f)

These numbers are the verified acceptance run for the code on `main`: **session 15f, 2026-10-23**. Full data is in [android-parity-15f-2026-10-23.md](docs/benchmarks/android-parity-15f-2026-10-23.md) and the outcome is [ADR-0068](docs/decisions/0068-phase15f-measured-outcomes.md).

### Method
- **Device:** Android 35 emulator (Pixel 9 Pro image, WebView 154), release APKs.
- **Pairing:** classic `@ngrx/store` and `ngrx-sqlite-store` run the same harness app.
- **Trials:** 5 independent trials per implementation and list size. Each one starts from a cleared app and a fresh process, and the implementation order alternates (ADR-0038).
- **Values:** each cell is a mean over the 5 trials. Latency is in ms and memory in MB.

Verdicts:
- **PASS:** sqlite is within classic's mean + 1 SD.
- **PLATFORM-BOUND (PB):** the extra cost fits within a measured store-free platform floor, such as the Capacitor bridge round trip or a SQLite commit.
- **CODE-BOUND (CB):** heap only; the extra is the library's own compiled code, measured with an empty-store control (ADR-0062).
- **FAIL:** none of the above.

### Large entity lists (todos), classic vs sqlite

| Metric | 1k classic | 1k sqlite | 10k classic | 10k sqlite | 50k classic | 50k sqlite |
|---|---:|---:|---:|---:|---:|---:|
| First ready (ms) | 371 | 613 PB | 598 | 807 PASS | 394 | 1831 PB |
| Relaunch ready (ms) | 1391 | 1667 PB | 1470 | 1690 PB | 1519 | 1886 PB |
| Toggle p50 (ms) | 3.2 | 19.8 **FAIL** | 8.1 | 19.1 PB | 31.5 | 19.0 PASS |
| Toggle p95 (ms) | 9.3 | 62.8 **FAIL** | 17.2 | 55.4 **FAIL** | 54.1 | 59.6 PASS |
| Emit p50 (ms) | 0.1 | 4.9 PB | 0.1 | 4.6 PB | 0.1 | 4.7 PB |
| Emit p95 (ms) | 0.5 | 8.8 PB | 0.4 | 7.6 PB | 0.4 | 8.1 PB |
| JS heap, todos loaded (MB) | 4.6 | 5.4 CB | 7.0 | 5.4 PASS | 18.5 | 5.4 PASS |
| JS heap, notes loaded (MB) | 5.2 | 6.1 **FAIL** | 7.6 | 6.1 PASS | 19.0 | 6.1 PASS |
| JS heap, after relaunch (MB) | 4.6 | 5.0 CB | 7.0 | 5.0 PASS | 18.4 | 5.0 PASS |
| PSS total, loaded (MB) | 225 | 239 **FAIL** | 231 | 246 **FAIL** | 243 | 243 PASS |
| PSS total, after relaunch (MB) | 222 | 224 PASS | 226 | 225 PASS | 240 | 226 PASS |

Overall: **13 PASS / 12 PLATFORM-BOUND / 2 CODE-BOUND / 6 FAIL** of 33 metrics.

The six FAILs are:
- 1k notes heap: 0.06 MB over its allowance.
- 1k and 10k loaded PSS.
- 1k toggle p50 and p95.
- 10k toggle p95.

The sqlite JS heap stays flat at about 5–6 MB as the list grows; classic grows to 19 MB at 50k.

Every write is persisted and committed before subscribers are notified. Classic keeps state only in memory, so its sub-millisecond emits have no durability cost.

### Later work
Later rounds have not been merged to `main`:
- **15y–15aa:** large-list parity, 16 PASS / 14 PB / 3 CB / 0 FAIL under the user-approved toggle floor (ADR-0090).
- **Phase 16:** flat-object and workflow workloads.

Both are on the [`phase16-wip`](https://github.com/dave-morgan/ngrx-sqlite-store/tree/phase16-wip) branch, together with their benchmark results.

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
