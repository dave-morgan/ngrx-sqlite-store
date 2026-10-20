import { describe, expect, it } from 'vitest';

import {
  escapeSegment,
  isAncestorOrSelf,
  joinPath,
  parentPath,
  pathsOverlap,
  splitPath,
  subtreeRange,
  unescapeSegment,
} from './path';

describe('paths', () => {
  it('escapes segments and round trips special characters', () => {
    for (const segment of ['todos', 'a/b', '~1/~0', '', '日本語']) {
      expect(unescapeSegment(escapeSegment(segment))).toBe(segment);
    }
    expect(escapeSegment('a~/b')).toBe('a~0~1b');
    expect(unescapeSegment('~01')).toBe('~1');
  });

  it('joins, splits and finds parents using escaped segments', () => {
    expect(joinPath('todos', 'a/b', '~')).toBe('todos/a~1b/~0');
    expect(splitPath('todos/a~1b/~0')).toEqual(['todos', 'a/b', '~']);
    expect(joinPath()).toBe('');
    expect(splitPath('')).toEqual([]);
    expect(parentPath('todos/a~1b')).toBe('todos');
    expect(parentPath('todos')).toBe('');
    expect(parentPath('')).toBe('');
  });

  it('compares on segment boundaries in both directions', () => {
    expect(isAncestorOrSelf('todos', 'todos/items')).toBe(true);
    expect(isAncestorOrSelf('todos/items', 'todos')).toBe(false);
    expect(pathsOverlap('todos/items', 'todos')).toBe(true);
    expect(pathsOverlap('todos', 'todos')).toBe(true);
    expect(pathsOverlap('todos', 'todos2')).toBe(false);
    expect(pathsOverlap('todos/a~1b', 'todos/a/b')).toBe(false);
  });

  it('treats root as an ancestor of every path', () => {
    expect(pathsOverlap('', 'todos')).toBe(true);
    expect(pathsOverlap('todos', '')).toBe(true);
    expect(pathsOverlap('', '')).toBe(true);
    expect(isAncestorOrSelf('todos', '')).toBe(false);
  });

  it('returns exclusive descendant scan bounds', () => {
    expect(subtreeRange('todos')).toEqual(['todos/', 'todos0']);
    expect(subtreeRange('')).toEqual(['/', '0']);
  });
});
