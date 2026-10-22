# Harness

This is an Angular 22 + Capacitor (Android) app that exercises the full NgRx integration surface. The same app runs against **classic `@ngrx/store`** and against **`ngrx-sqlite-store`**, so their behaviour can be compared end to end (ADR-0011).

## What it covers

| Integration | Where |
| --- | --- |
| `provideStore`, `provideState`, `createFeature` + `extraSelectors` | `store-impl/*/index.ts`, `features.ts` |
| `createActionGroup`, `createAction`, `props`, `emptyProps` | `state/actions.ts` |
| Entity adapter: `setAll`, `addOne`, `mapOne`, `updateOne`, `removeOne`, `removeMany(predicate)`, `sortComparer`, `getSelectors` | todos / users features |
| Nested arrays-in-objects-in-arrays, reorder, and a >1 MB scalar (chunking) | notes feature, `/notes` |
| `store.select` + `async` pipe, `selectSignal`, derived `createSelector` | pages |
| `@ngrx/effects`: class-based plus functional; dispatching and non-dispatching; `withLatestFrom` post-commit check; `ROOT_EFFECTS_INIT` | `state/effects.ts` |
| `@ngrx/router-store`: `provideRouterStore`, `getRouterSelectors` (foreign selectors), `routerNavigatedAction` effect | `state/selectors.ts`, `/todos/:id` |
| `@ngrx/store-devtools`: `provideStoreDevtools` | `app.config.ts` |
| `provideMockStore` + `overrideSelector` | `app.spec.ts` |
| sqlite only: tx handlers, returned partials, `onState` bridge, foreign `routerReducer`, persistence across reload | `store-impl/sqlite/features.ts` |

## How the swap works

App code imports from three aliases. Each build configuration points them at a different tsconfig:

| Alias | classic (`tsconfig.app.classic.json`) | sqlite (`tsconfig.app.sqlite.json`) |
| --- | --- | --- |
| `@store` | `@ngrx/store` | `ngrx-sqlite-store` (library source) |
| `@store/entity` | `@ngrx/entity` | `ngrx-sqlite-store/entity` |
| `@impl` | classic reducers + `provideStore` | tx reducers + `provideStore({ sqlite })` |

Reducers are the accepted migration point, so they are the only code that exists twice. Everything else is shared, including all effects, selectors, components, router-store and devtools.

## Run

```bash
npm run harness:classic      # http://localhost:4301
npm run harness:sqlite       # http://localhost:4302 (jeep-sqlite web store, IndexedDB-backed)
npm run e2e                  # same Playwright suite against both
npm run e2e:sqlite           # just one implementation
npm run test:harness         # unit tests (provideMockStore)
```

Query params: `?seed=<n>` sets the number of seeded todos (default 500). Seeding happens only on first boot for the sqlite store, because its data persists. Use Diagnostics → *Reset & reload* to start over.

On web, `window.__harness` exposes `{ impl, dispatch, settle }` for tests.

Private Android diagnostics: set `localStorage['harness:profile']='true'` and
restart to collect `window.__startupTrace` (method timestamps, SQL prefixes,
encoded bytes; no retained payloads). `harness:empty=classic|sqlite` bypasses
Angular bootstrap and opens either no database or an empty native SQLite
database, without store/schema/data. Remove these keys to restore the app.
`node tools/android-parity-profile.mjs --empty` measures five alternating
paired controls in each APK; without `--empty` it records a persisted boot.
Run these separately from statistical benchmarks. See ADR-0048.

## Android

```bash
npm run android:sqlite       # build web bundle (sqlite) + cap sync
npm run android:run          # deploy to a connected device / emulator
# or open android/ in Android Studio
```

The Gradle build needs JDK 21 (Android Studio's bundled JBR works: `JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"`).

The Diagnostics page shows the JS heap (Chromium WebView) and a dispatch → emission latency benchmark. Those numbers feed Q14 and phase 9.
