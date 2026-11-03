import { describe, expect, it } from 'vitest';
import { ChangeSet } from './change-set';
import { disjointPaths, escapeSegment, firstSegment, splitPath, unescapeSegment } from './path';

describe('path fast paths', () => {
  it('disjointPaths equals the ChangeSet cover for random path sets, in first-occurrence order', () => {
    let seed = 0x5eed;
    const random = (n: number) => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return Math.floor((seed / 0x100000000) * n);
    };
    const segments = ['a', 'b', 'a-b', 'a~1b', 'c', '0', '#x'];
    for (let round = 0; round < 300; round++) {
      const paths = Array.from({ length: 1 + random(8) }, () =>
        random(20) === 0 ? '' : Array.from({ length: 1 + random(4) }, () => segments[random(segments.length)]).join('/'));
      const changes = new ChangeSet();
      for (const path of paths) changes.add(path);
      expect(disjointPaths(paths)).toEqual(changes.paths().filter(() => true).sort((x, y) => paths.indexOf(x) - paths.indexOf(y)));
    }
  });

  it('escapes and unescapes segments exactly, including the no-escape fast path', () => {
    for (const raw of ['plain', '', 'a/b', '~', '~1', 'x~0/~1y', 'k0001']) {
      expect(unescapeSegment(escapeSegment(raw))).toBe(raw);
      expect(escapeSegment(raw)).toBe(raw.replace(/~/g, '~0').replace(/\//g, '~1'));
    }
    expect(firstSegment('feature~1x/child/leaf')).toBe(splitPath('feature~1x/child/leaf')[0]);
    expect(firstSegment('todos')).toBe('todos');
  });
});
