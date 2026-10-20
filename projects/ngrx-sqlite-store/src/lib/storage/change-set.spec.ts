import { describe, expect, it } from 'vitest';

import { ChangeSet } from './change-set';

describe('ChangeSet', () => {
  it('deduplicates and collapses descendants regardless of insertion order', () => {
    const changes = new ChangeSet();
    expect(changes.isEmpty).toBe(true);
    changes.add('todos/items/a');
    changes.add('todos/items/a');
    changes.add('todos/items');
    changes.add('todos/items/b');
    changes.add('todos2');
    expect(changes.paths()).toEqual(['todos/items', 'todos2']);
    expect(changes.isEmpty).toBe(false);
  });

  it('merges sets and detects overlap on boundaries', () => {
    const changes = new ChangeSet();
    changes.add('todos/items');
    expect(changes.overlaps('todos')).toBe(true);
    expect(changes.overlaps('todos/items/a')).toBe(true);
    expect(changes.overlaps('todos2')).toBe(false);
    const other = new ChangeSet();
    other.add('todos');
    changes.merge(other);
    expect(changes.paths()).toEqual(['todos']);
    expect(other.paths()).toEqual(['todos']);
  });

  it('collapses everything under root and returns a defensive snapshot', () => {
    const changes = new ChangeSet();
    changes.add('todos');
    const snapshot = changes.paths();
    changes.add('');
    changes.add('settings');
    expect(changes.paths()).toEqual(['']);
    expect(snapshot).toEqual(['todos']);
    expect(changes.overlaps('anything')).toBe(true);
  });
});
