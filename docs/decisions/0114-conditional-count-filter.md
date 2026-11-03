# ADR0114: measure conditional COUNT without argument construction

Status: Rejected16ae, production SQL unchanged.

Captured16ac VDBE materializes1/NULL for each conditional COUNT argument, and constructs1 even for unfiltered COUNT. SQLite conditional `COUNT(*) FILTER(WHERE predicate)` counts exactly those rows for which the predicate is true; plain COUNT(*) is equivalent when predicate is1. The existing invalidJSON/promotion/collection WHERE and exact bound compiled predicates remain unchanged. No index, schema, API or notification change is needed.

Before implementation, compare exact retained16r production shared count CTE against this aggregate-only rewrite using60alternatingpairs+2warmups on normalized50000todos after fresh verifiedcoldboot+60settle. Preserve plans/VDBE, every finite nativewall observation, expected responses, actualinstalledhash-boot-session and original/final indexDDL/tablecounts. No DDL/writes/CPUprofiler/heapcapture/floor change. SQLsyntax support and scalar semantics must pass regression/full library tests if evidence warrants implementation. SQLfallback on unsupported drivers must stay valid.

Nativewall is not SQLCPU or application gain. A small instruction reduction without repeatable native benefit does not warrant full unchanged acceptance variance hunting. If worthwhile, implement minimally with regression/allchecks/mandatory50kguard/reversedAPKs/fullfreshmatchedshapes+list acceptance before retention. No final guard closure presumed.


16AE_DONE verified124observations/60pairedorders/actualhash-boot-session/50000todos/unchangedindexDDL+tablecounts/exacttwocountrewrite/countresponses32487open50000total. Baseline53.621667SD3.955262 vsFILTER58.905SD4.384697ms,pairedcandidate+4.943333/+5.623333bothorders,only3/60wins. StaticVDBE153->147/countarguments1->0doesNOTprovefasterexecution;regressioncauseunestablished/nativewallnotSQLCPU. Rejected/no productionchange/no unchangedfullacceptancererun. Durableandroid-count-filter-16ae-2026-10-28.md/json/-analysis.
