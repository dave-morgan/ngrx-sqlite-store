import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeHeap } from './heap-summary.mjs';

test('groups shallow object sizes and shapes using metadata strides, excluding weak edge names', () => {
  const snapshot = {
    snapshot: { meta: {
      node_fields: ['type', 'name', 'id', 'self_size', 'edge_count'],
      node_types: [['object', 'string', 'closure']],
      edge_fields: ['type', 'name_or_index', 'to_node'], edge_types: [['property', 'weak']],
    } },
    strings: ['Object', 'name', 'label', 'run'],
    nodes: [0, 0, 1, 24, 1, 1, 2, 2, 20, 0, 2, 3, 3, 32, 0],
    edges: [0, 1, 5],
  };
  const result = summarizeHeap(snapshot);
  assert.equal(result.totalShallowBytes, 76);
  assert.equal(result.nodeCount, 3);
  assert.deepEqual(result.byType.find((row) => row.name === 'object'), { name: 'object', count: 1, shallowBytes: 24 });
  assert.equal(result.objectShapes[0].name, 'Object {name}');
  assert.equal(result.functions[0].name, 'run');
});
