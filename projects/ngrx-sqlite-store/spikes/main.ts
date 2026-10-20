import '@angular/compiler';
import { enableProdMode } from '@angular/core';
import { bridgeCost } from './bridge-cost';
import { q1 } from './q1';
import { q2 } from './q2';
import { q3 } from './q3';

enableProdMode();
await bridgeCost();
await q1();
await q2();
await q3();
