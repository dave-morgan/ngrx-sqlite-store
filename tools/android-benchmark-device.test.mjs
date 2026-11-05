import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import * as device from './android-benchmark-device.mjs';
const config={avd:'Ngrx_SQLite_Benchmark_API35',serial:'emulator-5556',port:5556,dataDir:'C:/Development/benchmark'};
test('process selection requires exact AVD, emulator executable and port',()=>{
 const target={pid:12,name:'qemu-system-x86_64-headless.exe',commandLine:'qemu -avd Ngrx_SQLite_Benchmark_API35 -port 5556'};
 const other={pid:13,name:'qemu-system-x86_64-headless.exe',commandLine:'qemu -avd Pixel_9_Pro -port 5554'};
 const suffix={...target,pid:14,commandLine:'qemu -avd Ngrx_SQLite_Benchmark_API35_other -port 5556'};
 const shell={...target,pid:15,name:'powershell.exe'};
 assert.deepEqual(device.benchmarkProcesses([target,other,suffix,shell],config),[target]);
});
test('configuration rejects an inconsistent port and serial before device operations',()=>{
 assert.throws(()=>device.validateDeviceConfig({...config,serial:'emulator-5554'}),/serial.*port/i);
 assert.throws(()=>device.validateDeviceConfig({...config,avd:'Pixel_9_Pro'}),/dedicated/i);
 assert.throws(()=>device.validateDeviceConfig({...config,avd:'Ngrx_SQLite_Benchmark_API35.*'}),/dedicated/i);
 assert.deepEqual(device.validateDeviceConfig(config),config);
});
test('reboot leaves another emulator and shared ADB server alone',async()=>{
 const commands=[],stopped=[],launched=[];
 const target={pid:12,name:'emulator.exe',commandLine:'emulator -avd Ngrx_SQLite_Benchmark_API35 -port 5556'};
 const other={pid:13,name:'emulator.exe',commandLine:'emulator -avd Pixel_9_Pro -port 5554'};
 let alive=true;
 const boot=await device.rebootDevice(config,{
  adb:async(...args)=>{commands.push(args);if(args[0]==='devices')return 'emulator-5554\tdevice\nemulator-5556\tdevice';if(args.includes('name'))return config.avd+'\r\r\nOK\r\r\n';if(args.includes('kill'))return 'OK';if(args.includes('sys.boot_completed'))return '1';if(args.includes('/proc/sys/kernel/random/boot_id'))return 'new-boot';throw Error('Unexpected ADB command '+args);},
  processes:async()=>alive?[target,other]:[other],
  stop:async process=>{stopped.push(process.pid);alive=false;},launch:async c=>{launched.push(c);},pause:async()=>{},log:()=>{}
 });
 assert.equal(boot,'new-boot');assert.deepEqual(stopped,[12]);assert.deepEqual(launched,[config]);
 assert(!commands.some(args=>args.includes('emulator-5554')||args.includes('kill-server')||args.includes('start-server')));
});
test('mismatched device identity aborts without stopping or launching anything',async()=>{
 let changed=false;
 await assert.rejects(device.rebootDevice(config,{adb:async(...args)=>args[0]==='devices'?'emulator-5556\tdevice':'Pixel_9_Pro\nOK',processes:async()=>[],stop:async()=>{changed=true;},launch:async()=>{changed=true;},pause:async()=>{},log:()=>{}}),/identity/i);
 assert.equal(changed,false);
});

 test('native stop tolerates an exited process and rejects a reused identity', {skip:process.platform!=='win32'},()=>{
  const run=script=>execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-OutputFormat','Text','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{stdio:['ignore','pipe','pipe'],timeout:10000});
  assert.doesNotThrow(()=>run(device.benchmarkStopScript({pid:2147483646,commandLine:'missing benchmark process'})));
  assert.throws(()=>run(device.benchmarkStopScript({pid:process.pid,commandLine:'not this Node process'})));
  assert.doesNotThrow(()=>process.kill(process.pid,0));
});
