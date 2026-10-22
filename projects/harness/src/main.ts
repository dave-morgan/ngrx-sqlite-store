import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { emptyBenchmark, traceStartup } from './benchmark-startup';

traceStartup();
const emptyMode = localStorage.getItem('harness:empty');
(emptyMode ? emptyBenchmark(emptyMode) : bootstrapApplication(App, appConfig)).catch((err) => console.error(err));
