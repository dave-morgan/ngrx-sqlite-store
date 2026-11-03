# ADR-0085: Phase 15w measured outcome

Status: Accepted (Agent, 2026-10-25). Parity is still incomplete; Phase 16 remains gated.

## Changes measured
- `PathCache.owner()` no longer allocates an array per lookup (ADR-0082).
- Idle WAL maintenance debounce no longer clears and re-creates a timer on every commit. Commits stamp a time and the timer re-arms itself.
- The ADR-0084 toggle floor (store-free pair-repaint control) and accepted CODE-BOUND apply.

## Result
Session `15w-audit-1792859667`, APKs archived in `.tmp/15w-apks/` (classic `72cd2fc5…`, sqlite `7ac783a2…`).

Verification (`.tmp/15w-verify.cjs`) covers 30 observations, 66 recomputed summaries, 33 verdicts, four controls with matching session/device/APK provenance and six verified boots. Its record is `docs/benchmarks/android-session-15w-2026-10-24.json`.

**12 PASS / 15 PLATFORM-BOUND / 3 CODE-BOUND / 3 FAIL.** The 15v samples re-reported under ADR-0084 gave 11 / 15 / 3 / 4. These are independent sessions, not isolated causal estimates.

| Metric | 15v (ADR-0084) | 15w |
|---|---|---|
| 1k pssRelaunchTotalMb | PLATFORM-BOUND | PASS |
| 10k relaunchReadyMs | FAIL | PLATFORM-BOUND |
| 50k relaunchReadyMs | FAIL | PLATFORM-BOUND |
| 10k emitP50 | FAIL | PLATFORM-BOUND |
| 1k toggleP50 | PLATFORM-BOUND | FAIL |
| 10k firstReadyMs | PLATFORM-BOUND | FAIL |

## Remaining FAILs (excess / allowance)
- **1k toggleP50:** 13.82 / 12.87 ms. Store JS is under 1.5 ms per toggle (ADR-0083).
- **10k firstReadyMs:** 397.2 / 349.3 ms. Classic SD in this session is 29.9 ms.
- **50k emitP50:** 3.94 / 3.65 ms.

Heap CODE-BOUND (1k ×3) is accepted under ADR-0084.

Every other metric qualifies.
