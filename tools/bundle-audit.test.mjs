import assert from 'node:assert/strict';
import test from 'node:test';
import { audit } from './bundle-audit.mjs';

test('initial graph excludes dynamic imports while the initial route includes its static dependencies', () => {
  const stats = { outputs: {
    'main.js': { entryPoint: 'projects/harness/src/main.ts', bytes: 100, inputs: { 'app.ts': { bytesInOutput: 90 } }, imports: [{ path: 'shared.js', kind: 'import-statement' }, { path: 'todos.js', kind: 'dynamic-import' }, { path: 'web.js', kind: 'dynamic-import' }] },
    'shared.js': { bytes: 20, inputs: { 'shared.ts': { bytesInOutput: 18 } }, imports: [] },
    'todos.js': { entryPoint: 'projects/harness/src/app/pages/todos.page.ts', bytes: 30, inputs: { 'todos.ts': { bytesInOutput: 29 } }, imports: [{ path: 'shared.js', kind: 'import-statement' }] },
    'web.js': { entryPoint: 'node_modules/jeep-sqlite/loader/index.js', bytes: 50, inputs: { 'node_modules/jeep-sqlite/loader/index.js': { bytesInOutput: 45 } }, imports: [] },
  } };
  const result = audit(stats);
  assert.equal(result.initial.bytes, 120);
  assert.equal(result.todosReady.bytes, 150);
  assert.equal(result.categories.jeepSqlite.initialBytes, 0);
  assert.equal(result.categories.jeepSqlite.todosReadyBytes, 0);
  assert.equal(result.categories.jeepSqlite.allOutputsBytes, 45);
  assert.equal(result.dynamicEntrypoints.find((entry) => entry.output === 'web.js').additionalBytes, 50);
  stats.outputs['app.js'] = { entryPoint: 'projects/harness/src/app/app.ts', bytes: 15, inputs: {}, imports: [] };
  stats.outputs['config.js'] = { entryPoint: 'projects/harness/src/app/app.config.ts', bytes: 25, inputs: {}, imports: [] };
  const deferredBootstrap = audit(stats);
  assert.equal(deferredBootstrap.initial.bytes, 120);
  assert.equal(deferredBootstrap.todosReady.bytes, 190);
});
