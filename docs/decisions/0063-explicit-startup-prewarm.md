# ADR-0063: Explicit startup prewarm and adoption

Status: Accepted, 2026-10-23.

Start the normal StorageEngine open (recovery, WAL, schema verification/migrations)
before Angular bootstrap. Match a prewarm to provideStore by the exact driver object
or factory identity; consume it once. Preserve its original promise, including a
rejection, so bootstrap observes the same open failure without retrying it. A
prewarm rejection has an attached handler until bootstrap adopts it. There is no
background connection for classic and no change to original NgRx DI tokens.

The provider-array form also starts the session reset for statically declared
features: delete their old rows atomically after schema open, retaining version
markers. Registration completes any initial-state reseed and gates selectors,
INIT and buffered actions (ADR-0030). Never invoke reducers or initial-state
factories early just to discover a seed. An explicitly persistent router survives.
Unknown lazy or injection-token registrations wait for DI. The config-only form
cannot know registrations and overlaps native/schema work only. Adoption must
use the same feature persistence configuration as the prewarm declaration.

The caller must bootstrap the matching store so its normal lifecycle owns and
closes the connection; the public promise returns no engine. Repeated prewarms for an
unadopted driver reuse the same operation. Different driver identities are isolated.

Retain the explicit prewarm and combined version-marker/index-catalog read. The
final 1k device on/off pair improved startup 1851.1 -> 1830.8 ms, first call
1512.0 -> 1465.1 ms and calls before ready 15 -> 14. Earlier three pairs were
noisy (1859.567 -> 1833.633 ms). These are measured critical-path reductions,
not a new startup floor. Final relaunch excess at 1k/10k/50k improves
363.040 / 382.760 / 489.660 -> 316.180 / 288.100 / 415.080 ms; all remain FAIL.
See [ADR-0065](0065-phase15e-measured-outcomes.md) and its linked raw evidence.

Tests cover one open and one-time adoption, original failure propagation,
session deletion before DI, persistent-router survival and version markers.
Factories must work outside DI. Prewarm uses the built-in schema migrations;
applications requiring custom STORAGE_ENGINE_OPTIONS migrations should use
normal DI initialization instead. This opt-in API does not discover arbitrary
provider overrides, lazy declarations or injection-token registrations.
