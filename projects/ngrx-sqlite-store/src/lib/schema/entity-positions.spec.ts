import { describe, expect, it } from 'vitest';
import { EntityPositions } from './entity-positions';
describe('compact entity positions', () => {
  it('looks up typed ids, arbitrary fractional positions and missing ids', () => {
    const index = new EntityPositions([
      ['1', 3.5],
      [1, 2],
      ['a/b', -8],
      [99, 100],
    ]);
    expect(index.size).toBe(4);
    expect(index.get('1')).toBe(3.5);
    expect(index.get(1)).toBe(2);
    expect(index.get('a/b')).toBe(-8);
    expect(index.get(99)).toBe(100);
    expect(index.get('99')).toBeUndefined();
    expect([...index.values()]).toEqual([2, 100, 3.5, -8]);
  });
});
