# ADR-0152: 50k emitP95 accepted as a limitation (user decision)

Status: Accepted (User, 2026-11-05).

## Context
In the retained acceptance 16L20 (ADR-0129), 50k emitP95 is the last list FAIL:

| sqlite | classic | Excess | Allowance | Over |
|---:|---:|---:|---:|---:|
| 5.46 ms | 0.46 ms | 5.00 ms | 4.82 ms | 0.18 ms |

The emit path has had many optimisation rounds; ADR-0149 lists the rejected series. None gave a repeatable gain that also passed the guards.

## Decision
The user accepts the 0.18 ms excess as a limitation, and the row counts as closed for the large-list goal. With ADR-0145 (10k relaunch), every large-list metric in 16L20 is now PASS, PB, BB or CB, or accepted by the user.

Together with ADR-0146 to ADR-0151, which cover all 29 shapes FAIL rows, both Phase 16 goals are met as defined.

No floors, allowances or raw verdicts change.
