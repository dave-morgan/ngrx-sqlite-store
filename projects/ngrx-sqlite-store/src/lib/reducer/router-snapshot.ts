import type { Action } from '@ngrx/store';

const snapshotActions = new Set([
  '@ngrx/router-store/navigation',
  '@ngrx/router-store/cancel',
  '@ngrx/router-store/error',
]);

/** ADR-0020: NgRx's minimal serializer still contains undefined and UrlSegments. */
export function routerSnapshot<S>(previous: S, next: S, action: Action): S {
  if (
    previous === next ||
    !snapshotActions.has(action.type) ||
    !next ||
    typeof next !== 'object' ||
    !('navigationId' in next) ||
    !('state' in next)
  )
    return next;
  return JSON.parse(JSON.stringify(next)) as S;
}
