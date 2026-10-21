# Library retention regressions

Run: node projects/ngrx-sqlite-store/spikes/run.mjs --retention-only

Node --expose-gc; 50k seed rows, count query subscribed. The last seed action keeps its sample alive. After a small tick action replaces ActionsSubject._value, five event-loop turns and forced GCs collect the sample, StoreTx and ChangeSet (including the write-through journal).

ADR-0035: load a 50k query page, then subscribe to a derived count. Unsubscribe the page with cacheBudgetBytes=0 and verify eviction. Five event-loop turns and forced GCs collect the page sample while the derived count selector, its memo and subscription remain alive. Before the fix this assertion fails: the count memo's queryViews map retains the page. No manual selector release or action subject mutation.
