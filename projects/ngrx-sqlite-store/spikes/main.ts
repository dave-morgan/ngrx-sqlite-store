import '@angular/compiler';
import { enableProdMode } from '@angular/core';
import { retention } from './retention';
import { bridgeCost } from './bridge-cost';
import { q1 } from './q1';
import { q2 } from './q2';
import { q3 } from './q3';
import { scale, scaleWorker } from './scale';

enableProdMode();
if (process.argv.includes('--scale-worker')) {
  await scaleWorker();
} else {
  await retention();
  await scale();
  if (!process.argv.includes('--scale-only')) {
    await bridgeCost();
    await q1();
    await q2();
    await q3();
  }
}
