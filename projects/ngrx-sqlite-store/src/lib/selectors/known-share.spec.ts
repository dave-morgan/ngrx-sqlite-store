import { describe, expect, it } from 'vitest';
import { NodeKind } from '../schema/kinds';
import { getNodeMeta, setNodeMeta } from '../schema/meta';
import { share } from './view-state';
import { shareKnown } from './share-known';

function pointer<T extends object>(value: T, path: string, positions: [string, number][]): T {
  setNodeMeta(value, { path, kind: NodeKind.Obj, childPos: new Map(positions) });
  return value;
}

describe('complete known pointer reconciliation', () => {
  for (const previous of [null, 42]) {
    it(`canonicalizes and deeply freezes nested pointers after ${previous}`, () => {
      const inner = pointer({ last: 0, first: { x: 1 } }, 'flow/form/a', [['first', 1], ['last', 2]]);
      const next = pointer({ b: 0, a: inner }, 'flow/form', [['a', 1], ['b', 2]]);
      const result = shareKnown(previous, next, new Set(), 'flow/form') as typeof next;

      expect(Object.keys(result)).toEqual(['a', 'b']);
      expect(Object.keys(result.a)).toEqual(['first', 'last']);
      expect(Reflect.set(result.a.first, 'x', 99)).toBe(false);
      expect(result.a.first.x).toBe(1);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.a)).toBe(true);
      expect(Object.keys(next)).toEqual(['b', 'a']);
      expect(Object.keys(inner)).toEqual(['last', 'first']);
    });
  }

  it('isolates equal-valued prior metadata when physical positions change', () => {
    const previous = pointer({ a: 1, b: 2 }, 'flow/form', [['a', 1], ['b', 2]]);
    const oldMeta = getNodeMeta(previous);
    const next = pointer({ a: 1, b: 2 }, 'flow/form', [['b', 1], ['a', 2]]);
    const result = shareKnown(previous, next, new Set(), 'flow/form');

    expect(result).not.toBe(previous);
    expect(result).toEqual(previous);
    expect(Object.keys(result as object)).toEqual(['b', 'a']);
    expect(getNodeMeta(result)).toBe(getNodeMeta(next));
    expect(getNodeMeta(previous)).toBe(oldMeta);
    expect([...oldMeta!.childPos!]).toEqual([['a', 1], ['b', 2]]);
    expect(Object.keys(previous)).toEqual(['a', 'b']);
  });

  it('retains unchanged sibling identity while ordering a changed parent', () => {
    const kept = Object.freeze(pointer({ x: 1 }, 'flow/form/kept', [['x', 1]]));
    const previous = pointer({ kept, changed: 0 }, 'flow/form', [['kept', 1], ['changed', 2]]);
    const next = pointer({ changed: 1, kept }, 'flow/form', [['kept', 1], ['changed', 2]]);
    const result = shareKnown(previous, next, new Set(), 'flow/form') as typeof next;

    expect(Object.keys(result)).toEqual(['kept', 'changed']);
    expect(result.kept).toBe(kept);
    expect(result.changed).toBe(1);
    expect(previous.changed).toBe(0);
  });

  it('does not trust child metadata belonging to a different physical path', () => {
    const aliased = pointer({ b: 0, a: 1 }, 'elsewhere', [['a', 1], ['b', 2]]);
    const previous = pointer({ child: null }, 'flow/form', [['child', 1]]);
    const next = pointer({ child: aliased }, 'flow/form', [['child', 1]]);
    const result = shareKnown(previous, next, new Set(), 'flow/form') as typeof next;

    expect(Object.keys(result.child)).toEqual(['b', 'a']);
    expect(result.child).toBe(aliased);
    expect(Object.isFrozen(result.child)).toBe(true);
    expect(getNodeMeta(result.child)?.path).toBe('elsewhere');
  });

  it('preserves ordinary sharing behavior when canonical known mode is absent', () => {
    const next = pointer({ b: { x: 1 }, a: 0 }, 'flow/form', [['a', 1], ['b', 2]]);
    const result = share(null, next, new Set(), 'flow/form');

    expect(result).toBe(next);
    expect(Object.keys(next)).toEqual(['b', 'a']);
    expect(Object.isFrozen(next.b)).toBe(true);
  });

  it('isolates changed position values even when key order and data stay equal', () => {
    const previous = pointer({ a: 1, b: 2 }, 'flow/form', [['a', 1], ['b', 2]]);
    const oldMeta = getNodeMeta(previous);
    const next = pointer({ a: 1, b: 2 }, 'flow/form', [['a', 3], ['b', 4]]);
    const result = shareKnown(previous, next, new Set(), 'flow/form');

    expect(result).not.toBe(previous);
    expect(result).toEqual(previous);
    expect(getNodeMeta(result)).toBe(getNodeMeta(next));
    expect(getNodeMeta(previous)).toBe(oldMeta);
    expect([...oldMeta!.childPos!]).toEqual([['a', 1], ['b', 2]]);
  });

  it('delegates array reconciliation while retaining hidden element identities', () => {
    const kept = Object.freeze({ x: 1 });
    const changed = Object.freeze({ x: 2 });
    const previous = [kept, changed];
    setNodeMeta(previous, { path: 'flow/items', kind: NodeKind.Arr, elementIds: ['#a', '#b'] });
    const next = [{ x: 3 }, kept];
    setNodeMeta(next, { path: 'flow/items', kind: NodeKind.Arr, elementIds: ['#b', '#a'] });
    const result = shareKnown(previous, next, new Set(), 'flow/items') as typeof next;

    expect(result[1]).toBe(kept);
    expect(result[0]).toEqual({ x: 3 });
    expect(getNodeMeta(result)?.elementIds).toEqual(['#b', '#a']);
    expect(getNodeMeta(previous)?.elementIds).toEqual(['#a', '#b']);
    expect(Object.isFrozen(result[0])).toBe(true);
  });

  it('normalizes integer keys and safely assigns escaped and own __proto__ keys', () => {
    const next = pointer(Object.fromEntries([
      ['z', 0], ['__proto__', { x: 1 }], ['2', 'two'], ['a/b', 'slash'], ['1', 'one'],
    ]), 'flow/form', [['z', 1], ['a~1b', 2], ['__proto__', 3], ['2', 4], ['1', 5]]);
    const result = shareKnown(null, next, new Set(), 'flow/form') as Record<string, unknown>;

    expect(Object.keys(result)).toEqual(['1', '2', 'z', 'a/b', '__proto__']);
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.hasOwn(result, '__proto__')).toBe(true);
    expect(result['__proto__']).toEqual({ x: 1 });
    expect(Object.isFrozen(result['__proto__'])).toBe(true);
    expect(result['a/b']).toBe('slash');
  });
});
