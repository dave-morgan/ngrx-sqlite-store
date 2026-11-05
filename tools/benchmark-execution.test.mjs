import test from 'node:test';
import assert from 'node:assert/strict';
import * as execution from './benchmark-execution.mjs';
test('measurement failure checkpoints once and never retries',async()=>{
 const error=new Error('device lost');let calls=0,saved;
 await assert.rejects(execution.measureOnce(async()=>{calls++;if(calls===1)throw error;return 'retry would hide failure';},async failure=>{saved=failure;}),value=>value===error);
 assert.equal(calls,1);assert.equal(saved,error);
});
test('successful measurement returns its raw result without failure handling',async()=>{
 const raw={samples:[1,2,3]};let failed=false;
 assert.equal(await execution.measureOnce(async()=>raw,async()=>{failed=true;}),raw);assert.equal(failed,false);
});
