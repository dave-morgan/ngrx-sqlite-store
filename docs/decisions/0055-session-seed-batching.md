# ADR-0055: Compare session seeds and buffer feature markers

Status: Accepted. Date: 2026-10-22. Authority: Phase 15c.

## Decision

Keep ADR-0030's SQLite-backed session features and registration barrier. For a
matching version of a session feature, read its stored value before resetting.
Skip reset and marker writes when its JSON representation already matches the
initial state (including absent state). Different property order may cause an
unnecessary reseed; it cannot incorrectly reuse a different JSON value.

Buffer registration markers using the transaction's write method, rather than
forcing the pending row writes to flush with run. The local version map still
updates sequentially. The engine owns atomic execution and rollback, and falls
back to explicit transactions for legacy drivers. A changed session slice can
now reset and record its marker in one atomic batch. No notification precedes
commit; selectors remain gated until registration completes.

TEMP or attached-memory storage would require explicit table routing for custom
queries, mixed-feature reads, query batching, purge and lazy registration. It
would introduce a much larger compatibility surface than the measured call
problem. Retain durable tables for this iteration; they still incur native write
cost when session state differs. Compare the device trace against F_open rather
than claiming those resets are an unavoidable open floor.

## Evidence and verification

ADR-0050's startup trace showed begin, delete batch, marker write and commit for
router reset. The new regression first failed because the old batch used
transaction:false. After buffering it observes one transaction:true batch, no
separate begin or metadata run, correct reset data, and no batch on an identical
session re-registration. All six core registration tests pass. Final Android
measurements and compatibility tests are recorded in the Phase 15c report.
