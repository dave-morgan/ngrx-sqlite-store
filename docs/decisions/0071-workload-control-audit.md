# ADR-0071: Match the notes code control to acceptance; retain repaint pairs as diagnostics

Status: Accepted (Agent, 2026-10-24)

## Evidence

The Phase 15f through 15h acceptance runner executes 30 paced todo toggles between
the todos heap measurement and navigation to notes. The workload code-space control
previously navigated directly to notes. V8 compiles code lazily, so those controls
did not execute the same paths. A remaining notes-heap excess cannot be attributed
to retained store data from those mismatched measurements alone.

The later toggle experiment records two MutationObserver batches for SQLite and one
for classic. One batch updates the todo count; the other updates the persisted effect
observation. The raw two-commit reproduction produces similar long tails. This supports
investigating effects, bridge scheduling and rendering together. MutationObserver batches
do not establish distinct rendered frames, nor prove the second repaint is unavoidable.
The candidate control changes the observation by trailing whitespace, whose visual paint
behavior need not match a changed visible count.

## Decision

- Share the existing 30-toggle, 20 ms paced routine between acceptance and the code
  control. Execute it after the todos snapshot and before notes navigation in both.
  Record the control workload in its provenance. Rerun controls rather than relabeling
  earlier measurements as equivalent.
- Keep `pairSamples` in diagnostic output, but do not use them to increase the accepted
  toggle floor. ADR-0069's single-commit control remains the comparison input.
- Require at least three distinct render-control trial identifiers, with at least
  30 finite samples in every trial. Pooled samples cannot compensate for incomplete
  or duplicated trials.
- Preserve prior raw reports. Document any resulting reclassification separately
  from actual latency or retained-memory improvements.

## Validation and next experiment

The shared toggle regression checks that unrelated DOM changes do not complete a
measurement, all 30 count changes are observed, and the even toggle count restores
the original count. Statistics regressions reject duplicated/incomplete controls and
verify that supplying pair diagnostics does not change the accepted floor. All 20 tool
tests pass. The next paired on-device control must establish whether matching paths
explains the notes code-space gap; it is not yet a parity result.

## Paired control result

Session `15i-audit-1792807443` completed five paired trials at all three heap
points (30 observations). Its APK hashes match the Phase 15h binaries and the
same-session floor controls. The corrected notes control measures a SQLite-minus-
classic code delta of **0.999946 MiB**, compared with **0.886026 MiB** in 15h's
control without toggles. Notes data means are **2.266772 MiB classic** and
**2.140227 MiB SQLite**. The todos and relaunch code deltas are 0.840803 and
0.550913 MiB, respectively.

This supports the workload-mismatch explanation: running the toggle paths changes
compiled code retained at the notes point. It does not demonstrate a library memory
reduction, nor assign an acceptance verdict. The fresh 15i acceptance must still
satisfy the existing code-delta and data-parity conditions. Raw source:
[corrected paired controls](../benchmarks/android-code-control-15i-2026-10-24.json).
