import { Injector, inject } from '@angular/core';
import { Action, Store } from '@store';
import { IMPL_NAME, settleStore } from '@impl';

export interface HarnessHook {
  impl: typeof IMPL_NAME;
  dispatch(action: Action): void;
  /** Resolves once every dispatched action is reduced and visible to selectors. */
  settle(): Promise<void>;
}

declare global {
  interface Window {
    __harness?: HarnessHook;
  }
}

/** Exposes a tiny test hook for Playwright e2e; identical surface for both implementations. */
export function installHarnessHook(): void {
  const store = inject(Store);
  const injector = inject(Injector);
  window.__harness = {
    impl: IMPL_NAME,
    dispatch: (action) => store.dispatch(action),
    settle: () => settleStore(injector),
  };
}
