import { describe, expect, it } from 'vitest';

import { ChangeSet } from './change-set';

describe('ChangeSet', () => {
  it('retains physical write provenance when a scalar path collides with an entity id', () => {
    const changes = new ChangeSet();
    changes.addEntity('todos', 's:t1');
    expect(changes.paths()).toEqual(['todos/s:t1']);
    expect(changes.physicalOverlaps('todos')).toBe(false);
    const physical = new ChangeSet();
    physical.add('todos/s:t1');
    changes.merge(physical);
    expect(changes.paths()).toEqual(['todos/s:t1']);
    expect(changes.physicalOverlaps('todos')).toBe(true);
  });
  it('handles a wide entity change batch and collapses it without losing siblings', () => {
    const changes = new ChangeSet();
    for (let i = 0; i < 50000; i++) changes.add(`todos/s:${i}`);
    changes.add('todos/#order');
    changes.add('todos2/s:0');
    expect(changes.paths()).toHaveLength(50002);
    expect(changes.overlaps('todos/s:missing')).toBe(false);
    changes.add('todos');
    expect(changes.paths()).toEqual(['todos2/s:0', 'todos']);
  }, 1000);
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
