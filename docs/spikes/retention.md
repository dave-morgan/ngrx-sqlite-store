# Phase 13 retention regression

Node --expose-gc; 50k seed rows, count query subscribed. The last seed action keeps its sample alive. After a small tick action replaces ActionsSubject._value, five event-loop turns and forced GCs collect the sample, StoreTx and ChangeSet (including the write-through journal). No manual selector release or action subject mutation.
