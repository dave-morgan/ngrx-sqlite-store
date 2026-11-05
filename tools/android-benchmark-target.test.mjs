import test from 'node:test';
import assert from 'node:assert/strict';
import * as target from './android-benchmark-target.mjs';
const isolated={serial:'emulator-5556',userAuthorizedIsolation:true};
test('uses the configured isolated serial and rejects another device',()=>{
 assert.equal(target.benchmarkSerial(undefined,isolated,{}),'emulator-5556');
 assert.equal(target.benchmarkSerial('emulator-5556',isolated,{}),'emulator-5556');
 assert.throws(()=>target.benchmarkSerial('emulator-5554',isolated,{}),/isolated benchmark/i);
 assert.throws(()=>target.benchmarkSerial(undefined,isolated,{BENCH_SERIAL:'emulator-5554'}),/isolated benchmark/i);
});
test('legacy unconfigured tools retain explicit serial and default behavior',()=>{
 assert.equal(target.benchmarkSerial('emulator-5560',null,{}),'emulator-5560');
 assert.equal(target.benchmarkSerial(undefined,null,{}),'emulator-5554');
});

test('isolated CDP ports do not reuse legacy defaults',()=>{
 assert.equal(target.benchmarkPort(9333,undefined,isolated),19333);
 assert.equal(target.benchmarkPort(9343,'19343',isolated),19343);
 assert.throws(()=>target.benchmarkPort(9333,'9333',isolated),/isolated/i);
 assert.equal(target.benchmarkPort(9333,undefined,null),9333);
});


test('acceptance controls never bind a literal shared legacy CDP endpoint',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const name of ['android-parity-profile.mjs','android-bench-shapes.mjs','android-heap-diff.mjs','android-floor-controls.mjs','android-render-commit-control.mjs']){
  const source=await readFile(new URL(name,import.meta.url),'utf8');
  assert.doesNotMatch(source,/(?:tcp:|localhost:)9\d{3}/,name+' bypasses isolated CDP port selection');
 }
});
