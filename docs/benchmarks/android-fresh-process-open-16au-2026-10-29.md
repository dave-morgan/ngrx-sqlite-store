# 16au fresh-process pipelined open (ADR-0126 follow-up), 2026-10-29

The candidate is the 16aq2 gated driver plus a `sessionStorage` marker. It was measured on emulator-5556.
- Candidate APK: `70988b25...`.
- Validation: 436 lib tests, tools, harness, 30 e2e, library build and APK build all pass.

## Mandatory 50k guard vs 15aa (.tmp/lp28-*.json)
| Side | Runs (ready ms) | Mean | Native calls |
|---|---|---:|---|
| 15aa | 1299.4 / 1287.2 / 1333.0 | 1306.5 | 68 / 68 / 68 |
| 16au | 1256.1 / 1296.3 / 1358.6 | 1303.7 | 67 / 67 / 73 |

No regression; the gated 16aq2 build was 1857.8 ms (SD 753) in 16aq3.

## Reversed one-trial 50k workloads (A = gated 16aq2, B = 16au; .tmp/16au-fresh-*)
| Metric | Pair B1 − A1 | Pair B2 − A2 | Direction |
|---|---:|---:|---|
| relaunch | −56.5 ms | −168.3 ms | better both ways |
| firstReady | +35.8 ms | −0.7 ms | mixed |
| emitP95 | +1.1 ms | +0.3 ms | worse both ways |
| toggleP50 | −1.1 ms | +8.1 ms | mixed |
| heapTodos | +0.02 MB | +0.03 MB | worse both ways |
| PSS total | −1.7 MB | −2.6 MB | better both ways |

One-trial verdicts are not acceptance. A full matched acceptance (16av shapes / 16L20 lists) follows. Raw table: .tmp/16au-legs.txt.


2026-10-30 independent full audit: original table above selected6of11metrics. Additional both-order adverse channels: heapNotes +0.013180/+0.009945MiB, relaunch PSS +2.184570/+0.106445MiB, toggleP95 +3.7/+1.4ms. Five metrics adverse both orders, two lower both, four mixed. All11 raw metric pairs/hashes: android-fresh-process-open-16au-audit-2026-10-30.json. Guard15aa1306.5333 SD23.7186 ->16au1303.6667 SD51.6456; paired -43.3/+9.1/+25.6ms (2of3 adverse). WithincombinedSD75.3642 is not equivalence or a causal startup win. No sample/verdict overwritten.
