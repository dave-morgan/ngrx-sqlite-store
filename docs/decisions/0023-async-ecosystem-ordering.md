# ADR-0023: Async ecosystem ordering

Status: Accepted (Agent, 2026-10-20)

Phase 7 parity tests exposed two assumptions made by synchronous NgRx consumers.

Each action's transaction, selector refresh and scanned emission finishes before
the next transaction starts. This preserves intermediate selector values and
latest-state effect joins even when an effect dispatches several actions at once.
INIT, UPDATE and ROOT_EFFECTS_INIT lifecycle actions capture the scanned subject's
current subscribers at dispatch time and deliver only to those subscribers after
commit. This avoids replaying bootstrap lifecycle work to effects attached later
while retaining lazy registration updates during slow startup. The internal
audience snapshot uses RxJS 7's exposed Subject observers (the library peers on
RxJS 7); it needs revisiting if RxJS 8 support is added. ActionsSubject still begins
with INIT. NgModule root/feature constructors
resolve their registration providers before effects modules initialize, matching
classic NgRx's dependency ordering.

Router-store prevents store-to-router feedback with a synchronous dispatch guard.
That guard has expired by the time SQLite publishes a preactivation snapshot.
Publishing that snapshot through the whole-store transport can restart a canceled
or failed navigation. Therefore whole-store subscriptions defer publications from
ROUTER_REQUEST/ROUTER_NAVIGATION until the latest requested navigation's
ROUTER_NAVIGATED, ROUTER_CANCEL or ROUTER_ERROR commits. The request ID is recorded
synchronously on dispatch so a superseded navigation's late cancellation cannot
publish an old URL and interrupt the newer navigation.
Normal selectors and effects still observe every committed intermediate snapshot.
The terminal action releases the latest whole-state view even when its reducer
does not change the router slice. No router package dependency or schema change
is required. Whole-store consumers intentionally omit transient preactivation
views (including superseded terminal snapshots); use store.select for every
intermediate committed router value.
