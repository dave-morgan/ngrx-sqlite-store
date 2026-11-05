# Transient selector watch wall attribution16bd2

Unchanged16aw APK; isolated emulator5556; 50,000 todos. Verified201 watch lifetimes,200 timed actions,401 callback emits,200 atomic native updates, source/session/boot/APK identity, wrapper restoration before persisted counter/table-count proof.

Instrumented emission mean 6.0340ms/p95 7.7000ms; native mean 3.3310ms.

| Method | Calls in200 actions | Mean inclusive wall/action(ms) | P95(ms) |
|---|---:|---:|---:|
| watch.setup | 200 | 0.3185 | 0.6000 |
| watch.stop | 200 | 0.2050 | 0.4000 |
| cache.retain | 200 | 0.0505 | 0.1000 |
| cache.release | 200 | 0.0860 | 0.2000 |
| cache.recount | 400 | 0.0490 | 0.2000 |
| cache.evict | 400 | 0.0330 | 0.1000 |
| cleanup.register | 200 | 0.0160 | 0.1000 |
| selection.refresh | 200 | 2.4950 | 3.2000 |
| core.selectionFeatures | 200 | 0.0170 | 0.1000 |
| cache.publish | 200 | 1.7750 | 2.3000 |
| native.executeSet | 200 | 3.3310 | 4.5000 |

All raw spans, initial untimed watch, callback sources, nesting, table counts and adverse timings are retained. Synchronous parent indices distinguish release eviction from notification eviction. Spans overlap and wrappers add work/microtasks; durations are wall observations, not CPU or SQL CPU, independent additive phases, acceptance or floors. No production change or new memory/CPU capture.

Original16bd preflight used an incorrect core source path and failed before device work/samples; archived16bd-preparation-failure. Corrected16bd2 is a new label, no samples merged.
