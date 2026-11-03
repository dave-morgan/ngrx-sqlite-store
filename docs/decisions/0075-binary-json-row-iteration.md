# ADR-0075: Capability-gated binary JSON iteration for bulk inserts

Status: Rejected application integration (Agent, 2026-10-24; native scratch result retained)

## Located cost

The 50k seed still misses parity. An isolated scratch-table experiment compares
the same production key, order/query indexes, payloads and 256 KiB transport cap,
changing only `json_each` to `jsonb_each` in the bulk INSERT source. Six alternating
samples on SQLite 3.53.3 measure **1317.867 ± 19.212 ms** versus
**1236.283 ± 9.053 ms** (mean ± sample SD). The binary iterator is faster in all
six paired samples, by 60.5–99.5 ms. Both variants use 36 calls and 9,330,855
parameter bytes. Representation checks confirm 50,000 valid JSON text rows.
Raw data: [native ladder](../benchmarks/android-jsonb-ladder-15m-2026-10-24.json).

[SQLite's documentation](https://www.sqlite.org/json1.html) describes `jsonb_each`
as returning JSONB rather than rendered text for array/object values, starting in
3.51.0. The INSERT can extract tuple columns from that parsed representation while
its existing `->` expression still writes JSON text. This changes intermediate
iteration, not the database format.

## Candidate and compatibility

- Add an optional readonly `jsonbEach` driver/executor capability. Default/absent
  is false, preserving existing and custom drivers.
- On writable Android open, issue a tiny capability query alongside existing
  initialization work. Verify its result before the first following operation
  resolves. A missing table/function means unsupported and uses `json_each`;
  unexpected database errors remain errors. Reset the capability on close.
- RowWriter selects the binary iterator only when the executor advertises support.
  It retains the same data expressions, values, schema, indexes, conflict handling,
  row cap, statement byte budgeting, transaction boundary and notification timing.
- Other platforms retain their existing path. No required configuration, SQLite
  minimum-version change, migration or native-plugin fork is introduced.

## Validation and retention

Run the complete RowWriter suite with the capability false and true, including
Unicode/escaping, deep/canonical JSON, exact stored data, duplicate/conflict order,
atomicity and byte/parameter caps. Driver regressions cover detection, expected
unsupported fallback, close reset and unexpected error propagation. The initial
regressions fail before implementation. A reversed APK comparison at 10k and 50k
must demonstrate application benefit before a full acceptance claim.

All 363 library tests and 26 e2e tests pass; library and SQLite APK builds pass.
The actual candidate APK verification (`.tmp/15m-candidate-proof.json`) records
36 binary-iterator bulk batches and confirms 50,000 valid JSON text rows in the
harness store. Its seed timing is diagnostic and not a comparative speed claim.

## First application A/B: inconclusive

The first shared-boot A1/B1/B2/A2 run completed without measurement errors, but
the candidate did not improve startup in both directions. The unchanged baseline
also drifted sharply: 10k first-ready 862.4 -> 1442.6 ms, relaunch 1877.9 ->
3399.0 ms, emission p50 5.7 -> 10.4 ms. All original observations are retained in
`.tmp/15m-ab-{A1,B1,B2,A2}.json`; they are not acceptance results.

A post-run snapshot found one emulator, normal process priority, available host
RAM and no host paging at that instant; the Android guest had 566 MiB in swap.
This does not prove the cause of the timed-run drift. The emulator log confirms
this run did cold-boot after an attempted snapshot load failed, so snapshot
restoration is not claimed as the cause. The reboot helper now explicitly uses
`-no-snapshot` to guarantee both load and save are disabled for future runs.

To control cumulative guest/session effects, the next reversed comparison uses
50k only and a separate verified cold boot plus the same 60-second settle before
each A/B leg. It records guest memory/CPU snapshots outside the timed measurement.
No device configuration, hardware, floor or pass criterion changes. This is an
explicit investigation of observed baseline drift, not replacement of unfavorable
samples or repeated unchanged acceptance runs to hunt variance.

## Fresh-boot outcome

Four distinct cold boots and matching APK/session/sample provenance verified; runner exit0. Startup effect remains mixed (+34.1/-58.0ms in reversed pairs), while toggle p95 worsens1.7/14.6ms and PSS rises both directions. Relaunch improves42.0/129.6ms but no causal link to the write-only iterator is established. No full acceptance is justified. Remove the capability/probe/iterator integration and its experiment-only tests; keep all raw observations, candidate APK/source archive and scratch prototype. After removal345 library tests pass. Full comparison: [15m evidence](../benchmarks/android-ladders-15m-2026-10-24.md). Continue investigating remaining measured costs; no floor or success criterion changed.
