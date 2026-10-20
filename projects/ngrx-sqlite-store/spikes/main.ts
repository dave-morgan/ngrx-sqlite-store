import '@angular/compiler';
import { enableProdMode } from '@angular/core';
import { q1 } from './q1';
import { q2 } from './q2';
import { q3 } from './q3';

enableProdMode();
await q1();
await q2();
await q3();
