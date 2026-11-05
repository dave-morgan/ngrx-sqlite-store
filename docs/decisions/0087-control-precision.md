# ADR-0087: Control sample counts for precision (user approved)

Status: Accepted (User approved, 2026-10-25). Recorded by the agent.

## Context
ADR-0086 showed that the sqlite means in 15x matched or improved on 15w, yet three verdicts flipped because the same-session controls were imprecise:
- **F_commit p50** came from 20 samples and ranged 3.1–4.4 ms between sessions.
- **F_open mean** came from 5 samples and ranged 83–143 ms.
- **The seed-memory growth** came from a single bracket and ranged 10.8–19.3 MiB.

## Decision
The estimators and floor definitions stay the same. Only the sample counts change:

| Control | Before | After |
|---|---|---|
| F_commit (unpaced, back-to-back) | 20 samples | 100 samples |
| F_open | 5 fresh-process trials | 10 fresh-process trials |
| Real-row seed-memory bracket (ADR-0070) | 1 bracket | 3 independent brackets, each in its own fresh floor process, averaged |

The paced F_commit (30), F_seed (5), render-commit controls (3 trials × 30) and the acceptance trial count (5 paired) are unchanged.

## Consequences
- Verdicts at the boundary depend less on control sampling noise, and can move in either direction.
- Floor-control runs take about 10–15 minutes longer.
- Older reports remain valid under the counts they were measured with.
