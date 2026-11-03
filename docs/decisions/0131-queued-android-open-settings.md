# ADR0131: Queue Android WAL/cache settings after create success, before open acknowledgement

Status: Rejected16az; actual queue order improved but target application gain did not repeat; restored16aw production driver.

16ax actual10k relaunch traces show WAL sent at1444.3/1281.0ms, following open completion1444.2/1280.7ms. Existing driver schedules WAL/cache only after awaiting native-open acknowledgement. Catalog is already sent after open in the native FIFO without waiting for its response. WAL/cache can use the same ordering while preserving create-success gating.

Candidate moves the exact existing SDK query calls into a local configure(connection) helper. On optimistic Android create/recovery, the create promise schedules configuration only after successful creation. The open send is registered first, then catalog, then WAL/cache. Open still awaits its own acknowledgement; first operation still verifies WAL, with the same cache and durability values. Reused handles retain their existing open/transaction-recovery probes and configure afterward. readonly/iOS/web skip Android settings. No plugin bypass/fork, new SQL, successful-path native-call count, schema/cache/API/FIFO/persistence/notify change.

Failed creation queues no new configuration. Failed native open may now have configuration queries queued behind it; their promise errors are handled and the original open failure still closes the connection and permits retry. Host tests cover failed open/retry and invalid WAL first-use. No claim of a device failure simulation.

New held-open-ack tests for fresh/gated creation fail against16aw (2fail/35pass); a positive pending-WAL test requires first-use waiting. Initial implementation passes the new tests but two old assertions demanded no settings before held open/sweep acknowledgements. Those exact old tests/source and failed log are preserved. Their expected call sequences were explicitly updated to include WAL/cache while keeping catalog ordering and registry/close assertions; before-create-ack tests now also require no WAL/cache.37driver tests genuinely pass in16az-settings-green2.log. No silent weakening of create-success, readonly, WAL verification or recovery contracts.

Baseline/source archives16az-source-baseline and16az-source. This removes a demonstrated dependency in the host model, not a measured application latency win. New APK/full checks/mandatory50kguardvs15aa/reversedworkloads against16aw/actual10ktraces/fullfreshmatchedacceptance required. All adverse outcomes must be kept. No new floor, readiness semantics, code gain/CPU claim, extraCPU/heap capture or commit.


16AZ_VALIDATION_DONE:443lib40tools1harness30e2e/library+APKbuildPASS. FrozenAPKh4e52f51c30c8c62388b65fae8e0d46e69925e6fcf303db9bfbc398864200b929/sourcebyte-matcharchive16az-source. [Host evidence](../benchmarks/android-queued-open-settings-16az-2026-10-30.json). New scoped16azdiagnostic launched:6lp30guardsvs15aa/4reversed50kworkloadsagainst16aw/2tenktraces16ba. No devicegain, retention, metriclimit or floor claim yet.


16AZ_DONE independently verified6guards/4reports/2tenktraces/allraw/hashes. Relaunch+138.5/-43.4ms and firstReady+91.7/-53.1 mixed; toggleP50+1.1/+5 and relaunchPSS+.546875/+.902344MiBadverseboth. ActualWALqueuingbeforeopenACKconfirmedbutno repeatedtargetbenefit. [Complete evidence](../benchmarks/android-queued-open-settings-app-16az-2026-10-30.md). Restoreexact16awdriver/keepgenericverificationtest/nounchangedfullacceptanceretry/no causalCPUclaim.


Restore verified:441library/40tools/1harness/30E2E/librarybuild PASS; production driver exactly matches16aw baseline bytes, measured16awAPK restored to benchmark cache without rebuilding. Generic pending-WAL first-use test and strengthened before-create absence assertions retained. Candidate-only held-open-ack optimization assertions archived and removed. No unchanged full acceptance rerun. Finalization: `.tmp/16az-revert-finalization.json`. Both goal and mean/heap guards remain open.
