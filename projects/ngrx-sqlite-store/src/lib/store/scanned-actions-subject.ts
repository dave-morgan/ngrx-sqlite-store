import { Injectable, isDevMode } from '@angular/core';
import { ScannedActionsSubject } from '@ngrx/store';
import type { Action } from '@ngrx/store';
import type { Observer } from 'rxjs';

/** Internal capability: only the committed dispatch pipeline may publish actions. */
export const NSS_EMIT = Symbol('NSS committed action');
export const NSS_CAPTURE = Symbol('NSS lifecycle audience');

@Injectable()
export class NssScannedActionsSubject extends ScannedActionsSubject {
  override next(_action: Action): void {
    if (isDevMode()) console.debug('SQLite store ignored a foreign scanned-action emission');
  }

  [NSS_CAPTURE](): readonly Observer<Action>[] {
    // RxJS 7 exposes the current subscribers. Lifecycle delivery must not replay
    // old bootstrap/registration events to effects attached during SQLite I/O.
    return this.observers.slice();
  }

  [NSS_EMIT](action: Action, audience?: readonly Observer<Action>[]): void {
    if (audience) {
      if (!this.isStopped) for (const observer of audience) observer.next(action);
    } else super.next(action);
  }
}
