import { describe, expect, it, vi } from 'vitest';
import { matchElements, reorderedPositions } from './ordering';

describe('unchanged-prefix array ordering', () => {
  it('preserves greedy duplicate, NaN, signed-zero, sparse and reorder matching', () => {
    const object = {};
    const values: unknown[] = [0, -0, NaN, undefined, null, 'a', 'b', object];
    let seed = 42;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
    for (let trial = 0; trial < 500; trial++) {
      const previous = Array.from({ length: random() % 25 }, () => values[random() % values.length]);
      const next = Array.from({ length: random() % 30 }, () => values[random() % values.length]);
      if (trial % 3 === 0) next.unshift(...previous);
      if (trial % 5 === 0) delete previous[2];
      if (trial % 7 === 0) delete next[1];
      const used = new Set<number>();
      const expected = next.map((value) => {
        let match = -1;
        previous.forEach((before, index) => {
          if (match < 0 && !used.has(index) &&
            (before === value || (before !== before && value !== value))) match = index;
        });
        if (match >= 0) used.add(match);
        return match;
      });
      expect(matchElements(previous, next)).toEqual(expected);
    }
  });

  it('keeps insertion, reorder and precision renormalization semantics', () => {
    expect(reorderedPositions([0, -1, 1], [1, 2])).toEqual([1, 1.5, 2]);
    expect(reorderedPositions([1, 0], [1, 2])).toEqual([0, 1]);
    expect(reorderedPositions([0, 1, -1], [1, 1 + 1e-10])).toEqual([1, 2, 3]);
    expect(reorderedPositions([-1, -1], [])).toEqual([1, 2]);
  });
  it('matches appends without allocating identity buckets for unchanged elements', () => {
    const previous = Array.from({ length: 1000 }, (_, id) => ({ id }));
    const next = [...previous, ...Array.from({ length: 100 }, (_, id) => ({ id }))];
    const set = vi.spyOn(Map.prototype, 'set');
    let matches: number[];
    let allocations: number;
    try {
      matches = matchElements(previous, next);
      allocations = set.mock.calls.length;
    } finally {
      set.mockRestore();
    }
    expect(matches).toEqual([...previous.map((_, i) => i), ...Array<number>(100).fill(-1)]);
    expect(allocations).toBe(0);
  });

  it('positions an append with linear matched-index work', () => {
    const previous = Array.from({ length: 1000 }, (_, i) => i + 0.5);
    let reads = 0;
    const matches = new Proxy([...previous.map((_, i) => i), ...Array<number>(100).fill(-1)], {
      get(target, key, receiver) {
        if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
        return Reflect.get(target, key, receiver);
      },
    });
    expect(reorderedPositions(matches, previous)).toEqual([
      ...previous, ...Array.from({ length: 100 }, (_, i) => 1000.5 + i),
    ]);
    expect(reads).toBeLessThanOrEqual(matches.length * 4);
  });
});
