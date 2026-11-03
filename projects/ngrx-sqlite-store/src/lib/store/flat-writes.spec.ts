// Phase 16: flat-object writes touch one row per changed key, with no location reads.
import { TestBed } from '@angular/core/testing';
import { createAction, props } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';
import { countingDriver } from '../../../spikes/bridge-cost-workload';
import { createReducer, on } from '../reducer/reducer';
import { NodeStore } from '../schema/node-store';
import { createFeatureSelector, createSelector } from '../selectors/selectors';
import { StorageEngine } from '../storage/storage-engine';
import { COALESCED_NODE_UPDATE } from '../storage/coalesce-updates';
import { provideStore } from './provide';
import { Store } from './store';

type Flat = Record<string, string | number | boolean | null | { nested: number }>;
const keySet = createAction('[Flat] key', props<{ key: string; value: Flat[string] | undefined }>());
const keysSet = createAction('[Flat] keys', props<{ patch: Flat }>());
const replaced = createAction('[Flat] replace', props<{ profile: Flat }>());
const key = (i: number) => `k${String(i).padStart(4, '0')}`;
afterEach(async () => {
  await TestBed.inject(StorageEngine).close();
  TestBed.resetTestingModule();
});

async function setup(k: number) {
  const { driver, counts } = countingDriver();
  const initial: Flat = {};
  for (let i = 0; i < k; i++) initial[key(i)] = i % 7 === 0 ? i % 2 === 0 : i % 3 === 0 ? i : `value ${i}`;
  TestBed.configureTestingModule({
    providers: [provideStore({
      flat: createReducer<Flat>(initial,
        on(keySet, (tx, { key, value }) => tx.set(key, value)),
        on(keysSet, async (_tx, { patch }) => patch),
        on(replaced, async (_tx, { profile }) => profile),
      ),
    }, { sqlite: { driver } })],
  });
  const store = TestBed.inject(Store);
  await store.settle();
  const flat = createFeatureSelector<Flat>('flat');
  const subs = [
    store.select(createSelector(flat, (s) => s[key(1)])).subscribe(),
    store.select(createSelector(flat, (s) => Object.keys(s).length)).subscribe(),
  ];
  await firstValueFrom(store.select(flat));
  const run = async (action: object) => {
    counts.trace.length = 0;
    await store.dispatchAsync(action as never);
    return [...counts.trace];
  };
  const stored = () => TestBed.inject(StorageEngine).read((sql) => new NodeStore().read(sql, 'flat')) as Promise<Flat>;
  return { initial, run, stored, store, flat, stop: () => subs.forEach((s) => s.unsubscribe()) };
}

describe('flat object writes', () => {
  it('persists fifty coalesced scalar changes without mutating the initial object', async () => {
    const { initial, run, stored, stop } = await setup(500);
    const patch = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [key(i), `changed ${i}`]));
    try {
      expect(await run(keysSet({ patch }))).toEqual([COALESCED_NODE_UPDATE]);
      expect(await stored()).toEqual({ ...initial, ...patch });
      expect(initial[key(1)]).toBe('value 1');
    } finally {
      stop();
    }
  });

  it.each([50, 500])('K=%i: multi-key partials and percent replacements send one coalesced row update, types included', async (k) => {
    const { initial, run, stored, store, flat, stop } = await setup(k);
    // Ten keys, several changing type (boolean/number -> string) or becoming null.
    const patch: Flat = {};
    for (let i = 0; i < 10; i++) patch[key(i * 3)] = i === 9 ? null : `p${i}`;
    const partial = await run(keysSet({ patch }));
    // One statement for the whole run of row updates (no per-key statements or reads).
    expect(partial).toEqual([COALESCED_NODE_UPDATE]);
    const profile = { ...initial };
    const changed = Math.max(1, k / 100);
    for (let i = 0; i < changed; i++) profile[key(i * 7 + 1)] = i;
    const replacement = await run(replaced({ profile }));
    // The replacement also reverts the ten patched keys: still one statement.
    expect(replacement).toEqual([COALESCED_NODE_UPDATE]);
    expect(await stored()).toEqual(profile);
    expect(await firstValueFrom(store.select(flat))).toEqual(profile);
    stop();
  });

  it('keeps sibling rows correct when keys change type, are promoted to objects and flattened again', async () => {
    const { initial, run, stored, stop } = await setup(50);
    await run(keySet({ key: key(2), value: 'back' }));
    await run(keysSet({ patch: { [key(3)]: { nested: 1 }, [key(4)]: 'four' } }));
    await run(keysSet({ patch: { [key(3)]: 'flat again', [key(5)]: false } }));
    const expected = { ...initial, [key(2)]: 'back', [key(3)]: 'flat again', [key(4)]: 'four', [key(5)]: false };
    expect(await stored()).toEqual(expected);
    stop();
  });
});
