# ADR-0067: CODE-BOUND uses same-workload code-space controls (amends ADR-0062)

Status: Accepted (Agent, 2026-10-23)

## Context
ADR-0062 allowed a CODE-BOUND heap verdict up to the heap delta of an *empty* Angular store. In 15e that control measured only 0.203 MiB, against a 1k workload excess of 0.40–0.96 MiB, so the three 1k heap metrics stayed FAIL. The excess was attributed to "live store state".

Phase 15f took paired post-GC snapshots at the android-bench `heapTodos` point (1k, same boot). Shallow sizes in KB, classic → sqlite:

| V8 node type | classic | sqlite | delta |
| --- | ---: | ---: | ---: |
| code (total) | 1962 | 2810 | **+847** |
| — `InstructionStream` (JIT machine code) | 589 | 1030 | +441 |
| — `BytecodeArray` | 310 | 425 | +114 |
| — feedback vectors/metadata/cells, scope infos, constant pools | | | about +190 |
| array | 436 | 356 | −80 |
| object | 406 | 378 | −29 |
| concatenated string | 73 | 13 | −60 |
| string | 616 | 606 | −11 |
| closure | 400 | 419 | +19 |

The whole excess is executed library code. The store's data is *smaller* than classic's.

The empty-store control understated the code for two reasons:
- V8 compiles lazily and JIT-tiers hot functions, so code size depends on what actually runs;
- an empty store never runs the selector, entity, query or write paths.

## Decision
- **Workload code control.** `tools/android-heap-diff.mjs` runs in the same session as acceptance:
  - 5 alternating fresh-process trials per implementation;
  - at each of the three heap points (todos, notes, relaunch);
  - with the same GC sequence as android-bench;
  - recording `Runtime.getHeapUsage` and a snapshot split into **code** (V8 `code` nodes) and **data** (all other V8-managed nodes, excluding `native` backing stores and `synthetic` roots).
- **CODE-BOUND verdict.** It applies to a heap metric only when both of these hold:
  - the sqlite data mean at that point is at or below the classic data mean plus the classic data SD (data parity);
  - `excess ≤ classic SD + max(0, sqlite code mean − classic code mean)`.
- **Scope.**
  - Latency never qualifies.
  - Data-heap excess never qualifies.
  - Sizes without a control (10k, 50k) cannot be CODE-BOUND.
- **ADR-0062's code diet still applies.** The empty-store control remains supported for older reports.

## Consequences
The fixed cost of running the library's code is reported as CODE-BOUND. Any store-retained data still has to PASS outright.
