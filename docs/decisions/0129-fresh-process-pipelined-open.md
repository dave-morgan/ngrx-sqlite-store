# ADR-0129: Fresh-process pipelined native open; 16av/16L20 is the isolated-environment baseline

Status: Accepted (Agent, 2026-10-29).

## Context
ADR-0126's gated open (16aq2) waits for create's acknowledgement before sending the native open. This stops a native open from replacing a database owned by a wrapper that survived a WebView reload. It added a startup round trip on every launch, and uninstrumented relaunch was adverse in16aq3 and16aq6/16L19. Instrumented16at instead had lower relaunch times in both orders and higher fresh-seed times; those conflicting results remain preserved and do not establish causal attribution.

The hazard needs a surviving native wrapper. That only exists after a WebView reload inside the same process.

## Decision
`CapacitorSqliteDriver.open` writes a `sessionStorage` marker (`ngrx-sqlite-store:native-open:<db>:<rw|ro>`) before any native open is sent. `sessionStorage` survives a WebView reload but not process death, and the plugin's native connections behave the same way.

| Marker state | Open path |
|---|---|
| Absent | Fresh process: create, open and the catalog prefetch are pipelined without waiting for create (ADR-0073). |
| Present, storage missing, or read failure | ADR-0126 gate: open only after a successful create. |

Recovery after a failed create is always gated.

The one unprotected case: the app clears `sessionStorage` and the WebView then reloads. The previous retained 16r driver had no protection at all.

16av/16L20 becomes the retained baseline on the isolated emulator-5556 (ADR-0128). Earlier references (16r/16L8 and 15aa) were measured on shared 5554. Classic moved by similar amounts between the two environments, so cross-environment mean guards are confounded.

## Evidence
16au diagnostic (docs/benchmarks/android-fresh-process-open-16au-2026-10-29.md):
- 50k guard: 15aa 1306.5 ms vs 16au 1303.7 ms. The gated build had been 1857.8 ms.
- Reversed relaunch: −56.5 / −168.3 ms against gated 16aq2.

Full acceptance 16av/16L20 (docs/benchmarks/android-acceptance-16av-2026-10-29.json):

| Suite | 16av/16L20 | Gated 16aq6/16L19 (same environment) | Retained 16r/16L8 (old 5554) |
|---|---|---|---|
| Shapes | 3 PASS / 54 PB / 0 CB / 29 FAIL | 2 / 54 / 0 / 30 | 1 / 48 / 0 / 37 |
| Lists | 12 PASS / 16 PB / 3 CB / 2 FAIL | 13 / 15 / 3 / 2 | 14 / 14 / 3 / 2 |

Against the gated run in the same environment:
- No sqlite mean is adverse beyond the sum of SDs.
- sqlite firstReady changed by −15 / −24 / −70 ms.
- Relaunch changed by −24 / −66 / +50 ms.

Against 16L8, 7 sqlite means rose beyond the sum of SDs. The classic means moved by similar amounts in the same rows: relaunch +162 to +241 ms and firstReady −121 to −398 ms. This is recorded as an environment confound, not as a claim that the code caused or did not cause the change.

Remaining list FAILs:
- 10k relaunch: excess 217.9 against allowance 169.8.
- 50k emitP95: excess 5.00 against allowance 4.82.

Both goals remain unmet.


2026-10-30 safety qualification: [ADR0130](0130-native-marker-recording.md) reproduces failed marker-write and native-name-alias gaps in16au.16av/16L20 remains the measured performance reference, not an unconditional native ownership guarantee.16aw repair is provisional pending new guards/acceptance; no historical sample/verdict is changed.


2026-10-30 full evidence qualification: prior16au MD selected6of11metrics; all11are now preserved in android-fresh-process-open-16au-audit-2026-10-30.json. Additional both-order adverse channels are heapNotes/relaunchPSS/toggleP95. lp28 pairedguards2of3adverse/meanwithincombinedSD does not establish equivalence. Offline raw recheck confirms16av/16L20stats and all119 comparisons to16aq6/16L19; none exceedcombinedSD, although47shape+18listmeansincrease. Cross-environment16r/16L8 has21shape+7listincreasesbeyondcombinedSD; classicfirstReady movedoppositelyin1k/50krows, so previousblanket"classicmovedsimilarly" is too strong. Environmentconfounding remains, not sourcecausalproof/guarddismissal.
