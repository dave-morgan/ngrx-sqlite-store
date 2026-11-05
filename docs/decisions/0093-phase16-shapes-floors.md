# ADR-0093: Shapes latency floor (commit+render control) and shapes memory controls

Status: Accepted (User decision, 2026-10-27; recorded by the agent).

## Context
Shapes run 16d added a store-free control. It does one durable single-row commit through the plugin, then makes a visible DOM text change, sampled exactly like the single-key workload (dispatch → emit → DOM, 15 ms gap).

| | emit p50 | dom p50 |
|---|---:|---:|
| Control | 8.0–8.7 ms | 8.3–9.1 ms |
| Back-to-back F_commit | 3.6 ms | – |
| sqlite single write | 10.2–13.1 ms | – |

The roughly 4–5 ms gap between the control and F_commit is the bridge round trip blocked by WebView repaint, the same mechanism as ADR-0083/0084.

The shapes memory rows had no control at all.

## Decision (user approved both recommendations)
1. **Latency floor.** The same-session store-free commit+render control is the shapes latency floor. It mirrors ADR-0084 for list toggles.
   - It is measured per flat K and on the workflow page.
   - Emit/DOM and p50/p95 each use their matching control statistic, multiplied by the action's commit count.
   - PLATFORM-BOUND applies when the excess ≤ classic SD + control × commits + sqlite SD.
2. **Memory controls (list method).**
   - Heap uses the ADR-0067 method: a paired post-GC snapshot at the same point, split into V8 code and data. A row is CODE-BOUND when the excess ≤ classic SD + code-space difference and the store data is at parity.
   - PSS uses the ADR-0070 method: the same-session empty-plugin control (`android-parity-profile --empty`). A row is PLATFORM-BOUND when the excess ≤ classic SD + plugin baseline + sqlite SD.
3. **Unchanged.**
   - Burst `maxBacklog` keeps no floor.
   - The list acceptance rules are untouched.
   - The store's own excess above these controls must still fit within the SDs, and reducing it remains the work.

## Consequences
`tools/android-bench-shapes.mjs` implements these controls (`--platform-json`) and reports them per row, with their notes.
