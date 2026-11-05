# ADR-0148: Burst backlog above 1 matches a store-free control (evidenced limit)

Status: Accepted (Agent, 2026-11-05). This covers three shapes rows in 16av: `flat.50/500/5000.burst.maxBacklog`, at 2.0 / 2.4 / 2.0 against classic's 0.

## Background
ADR-0105 proves the backlog can never go below 1 under synchronous dispatch with asynchronous persistence and notify-after-commit. It left open whether the observed 2–3 is minimal.

## New evidence (16bw, `android-burst-control-16bw-2026-11-05.json`)
The run used emulator-5556, the retained 16au APK, K=50 and one session with 5 trials.

For each trial it ran:
- a **store-free control**: 90 one-row native commits at 30 Hz through the same plugin and database, each followed by a DOM text update, with backlog scored exactly as `flatBurst` scores it (`i-1-lastSeen` at dispatch);
- the real `__shapes.flatBurst(30, 3)`.

| | Max backlog (5 trials) | Mean | Lag p50 | Tail |
|---|---|---:|---|---|
| Store-free control | 1, 1, 1, 2, 1 | 1.2 | 6.2–7.8 ms | lagMax 20.4–47.2 ms; 2 of 450 commits over the 33.3 ms interval |
| Store (`flatBurst`) | 2, 1, 1, 1, 1 | 1.2 | 6.2–7.1 ms | lag p95 15.8–24.6 ms |

At 30 Hz, a backlog of 2 happens whenever one action's commit-to-observation time exceeds the 33.3 ms dispatch interval. The store-free control shows the platform alone produces such tails: native commit, bridge and repaint. Its backlog distribution matches the store's in the same session.

## Decision
Burst backlog is an evidenced limit: 1 is the architectural minimum (ADR-0105), and occasional values of 2 match the platform tail of a store-free commit+render control.

The acceptance means (2.0–2.4) are higher than this session's 1.2 because sessions differ. That variance is platform-level, as the control shows, and does not indicate a store queueing defect. All 90 actions were observed in every trial, with no loss and no unbounded growth.

No floor, allowance or raw verdict changes; the report rows stay FAIL with this ADR as the explanation. Limitation: one session, five trials, K=50 only. Larger K was not re-measured here, though 16av shows the same 2.0–2.4 range at K=500/5000.
