import { describe, expect, it } from 'vitest';
import { getNodeMeta, setNodeMeta } from '../schema/meta';
import { NodeKind } from '../schema/kinds';
import { put, putMany } from './view-state';
import type { PutUpdate } from './view-state';

describe('putMany', () => {
  it('preserves a proxy input own symbols and values during a wide update', () => {
    const symbols = [Symbol('a'), Symbol('b'), Symbol('c')];
    const target: Record<PropertyKey, unknown> = {};
    for (let i = 0; i < 5000; i++) target[`k${i}`] = i;
    symbols.forEach((symbol, i) => { target[symbol] = i; });
    Object.freeze(target);
    let calls = 0;
    const root = new Proxy(target, { ownKeys: () => {
      const offset = calls++ % symbols.length;
      return [...Object.keys(target), ...symbols.slice(offset), ...symbols.slice(0, offset)];
    } });
    setNodeMeta(root, { path: 'feature', kind: NodeKind.Obj, childPos: new Map(Object.keys(target).map((key, i) => [key, i + 1])) });
    const result = put(root, ['k1'], 'changed') as Record<PropertyKey, unknown>;
    expect(new Set(Reflect.ownKeys(result).filter((key) => typeof key === 'symbol'))).toEqual(new Set(symbols));
    symbols.forEach((symbol, i) => { expect(result[symbol]).toBe(i); });
    expect(result['k1']).toBe('changed');
    expect(root['k1']).toBe(1);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([4000, 4096, 5000])('preserves wide frozen object copy semantics with %i base keys', (size) => {
    const root: Record<string | symbol, unknown> = Object.create(null);
    const sibling = Object.freeze({ value: 'stable' });
    for (let i = 0; i < size; i++) root[`k${i}`] = i;
    root['sibling'] = sibling;
    Object.defineProperty(root, '__proto__', { value: 'own data', enumerable: true });
    Object.defineProperty(root, 'hidden', { value: 'not copied' });
    const symbol = Symbol('visible');
    root[symbol] = sibling;
    let reads = 0;
    Object.defineProperty(root, 'read', { get: () => { reads++; return 8; }, enumerable: true });
    const meta = { path: 'feature', kind: NodeKind.Obj, childPos: new Map(Object.keys(root).map((key, i) => [key, i + 1])) };
    setNodeMeta(root, meta);
    Object.freeze(root);
    const expected = { ...root, k1: 'changed' };
    reads = 0;
    const single = put(root, ['k1'], 'changed') as typeof root;
    expect(reads).toBe(1);
    expect(Object.getPrototypeOf(single)).toBe(Object.prototype);
    expect(Reflect.ownKeys(single)).toEqual(Reflect.ownKeys(expected));
    expect(Object.getOwnPropertyDescriptors(single)).toEqual(Object.getOwnPropertyDescriptors(Object.freeze(expected)));
    expect(single[symbol]).toBe(sibling);
    expect(single['__proto__']).toBe('own data');
    expect(getNodeMeta(single)).toBe(meta);
    expect(root['k1']).toBe(1);
    expect(put(root, ['k1'], 1)).toBe(root);
    const expectedBatch: Record<string | symbol, unknown> = { ...root, k1: 'changed' };
    delete expectedBatch['k2'];
    Object.defineProperty(expectedBatch, '__proto__', { value: 'replacement', enumerable: true, configurable: true, writable: true });
    reads = 0;
    const batch = putMany(root, [{ segments: ['k1'], next: 'changed' }, { segments: ['k2'], next: undefined, remove: true }, { segments: ['__proto__'], next: 'replacement' }]);
    expect(reads).toBe(1);
    expect(Object.getOwnPropertyDescriptors(batch)).toEqual(Object.getOwnPropertyDescriptors(Object.freeze(expectedBatch)));
    expect(Object.getPrototypeOf(batch)).toBe(Object.prototype);
    expect(getNodeMeta(batch)).toBe(meta);
    expect(root['__proto__']).toBe('own data');
  });

  it('equals sequential put for random disjoint updates, copying each touched container once', () => {
    let seed = 0x16b;
    const random = (n: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return Math.floor((seed / 0x100000000) * n);
    };
    for (let round = 0; round < 50; round++) {
      const root: Record<string, unknown> = {};
      for (let i = 0; i < 30; i++)
        root[`k${i}`] = random(3) === 0 ? { a: i, b: { c: i, d: [i] }, e: `x${i}` } : i;
      setNodeMeta(root, { path: 'feature', kind: NodeKind.Obj });
      Object.freeze(root);
      // Disjoint targets: each top-level key is updated at most once, at one depth.
      const updates: PutUpdate[] = [];
      for (const key of Object.keys(root)) {
        const pick = random(5);
        if (pick === 0) updates.push({ segments: [key], next: `new ${key}` });
        else if (pick === 1 && typeof root[key] === 'object') updates.push({ segments: [key, 'b', 'c'], next: round });
        else if (pick === 2 && typeof root[key] === 'object') updates.push({ segments: [key, 'e'], next: undefined, remove: true });
      }
      if (random(4) === 0) updates.push({ segments: ['added~1key'], next: { fresh: true } });
      const sequential = updates.reduce<unknown>((value, u) => put(value, u.segments, u.next, u.remove), root);
      const batched = putMany(root, updates);
      expect(batched).toEqual(sequential);
      expect(getNodeMeta(batched)).toEqual(getNodeMeta(root));
      expect(Object.isFrozen(batched)).toBe(true);
      // Untouched siblings keep their references.
      for (const key of Object.keys(root))
        if (!updates.some((u) => u.segments[0] === key))
          expect((batched as Record<string, unknown>)[key]).toBe(root[key]);
    }
  });

  it('keeps the original containers when every update is a no-op', () => {
    const leaf = Object.freeze({ deep: 1 });
    const value = Object.freeze({ a: 1, b: Object.freeze({ c: leaf, d: 'x' }) });
    expect(put(value, ['a'], 1)).toBe(value);
    expect(put(value, ['b', 'c'], leaf)).toBe(value);
    expect(put(value, ['missing'], undefined, true)).toBe(value);
    expect(putMany(value, [{ segments: ['a'], next: 1 }, { segments: ['b', 'd'], next: 'x' }])).toBe(value);
    const changed = putMany(value, [{ segments: ['a'], next: 1 }, { segments: ['b', 'd'], next: 'y' }]) as typeof value;
    expect(changed).not.toBe(value);
    expect(changed.b.c).toBe(leaf);
    expect(changed).toEqual({ a: 1, b: { c: leaf, d: 'y' } });
  });

  it('returns the value unchanged for no updates and the replacement for a root update', () => {
    const value = Object.freeze({ a: 1 });
    expect(putMany(value, [])).toBe(value);
    expect(putMany(value, [{ segments: [], next: 7 }])).toBe(7);
  });
});

