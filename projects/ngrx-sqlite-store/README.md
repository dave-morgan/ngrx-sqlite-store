# NgrxSqliteStore

## Early native startup

Call `prewarmSqliteStore` before `bootstrapApplication` to overlap native open,
interrupted-connection recovery, WAL verification and schema checks with app
module loading. Supply the **same driver object or factory** to `provideStore`:

```ts
import { prewarmSqliteStore, provideStore } from 'ngrx-sqlite-store';

const sqlite = { driver: createAppDriver };
void prewarmSqliteStore(sqlite);
const { App, appConfig } = await import('./app');
await bootstrapApplication(App, {
  ...appConfig,
  providers: [...appConfig.providers, provideStore({}, { sqlite })],
});
```

Alternatively, `prewarmSqliteStore(providers)` accepts the top-level provider
array containing exactly one `provideStore` result. `provideStore.prewarm` is an
alias for entrypoints shared with classic NgRx, whose function has no such
property. Driver factories used by prewarm must work outside an injection context.

The adopting store awaits the original in-flight operation. Open errors surface
through normal store initialization, including its existing production status
behavior. Prewarm observes its rejection until adoption, avoiding an unhandled
rejection during bootstrap; callers may also await/catch the returned promise.
Repeated calls before adoption reuse the operation; a separate store must use
a separate driver. Bootstrap the matching store after starting prewarm so its
normal lifecycle owns the connection. The provider-array form atomically clears
statically declared session features before DI, preserving version markers and
explicitly persistent routers. Registration then completes any initial reseed,
version checks and declared indexes before INIT, buffered actions or selectors
can see stale session data. Lazy and injection-token registrations wait for DI;
the config-only form cannot know the session-feature declarations. Use the same
feature persistence options when adopting the connection. Prewarm uses the
built-in schema migrations; applications with custom `STORAGE_ENGINE_OPTIONS`
migrations should keep normal DI initialization. Prewarm cannot discover
arbitrary provider overrides. See ADR-0063.

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.2.0.

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

To build the library, run:

```bash
ng build ngrx-sqlite-store
```

This command will compile your project, and the build artifacts will be placed in the `dist/` directory.

### Publishing the Library

Once the project is built, you can publish your library by following these steps:

1. Navigate to the `dist` directory:

   ```bash
   cd dist/ngrx-sqlite-store
   ```

2. Run the `npm publish` command to publish your library to the npm registry:
   ```bash
   npm publish
   ```

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
