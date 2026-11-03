# ADR0133: Batch construction of many-input static selector scopes

Status: Rejected16be after full16bf/16L22; exact baseline SelectionEngine restored.

The flat derived selector has20 disjoint physical inputs. `SqliteSelectionEngine.watch.evaluate` currently rebuilds its synthetic scope with20 sequential `put` calls, copying/freezing both the same inner object and wrapper on every input. This is distinct from copying a committed5000-key object or deferring projection: the completed scope contains only20 selected values, and projection remains eager.

Use existing `putMany` only for at least8 static, mutually disjoint physical sources. Determine disjointness once per watcher with the existing canonical `disjointPaths` cover. Smaller or overlapping source sets retain the sequential path. Keep source read order, scopedValues change detection, final structural `share`, query attachment, readiness/defaults, projector/error/equality behavior, leases, generation/publication/FIFO and notify-after-commit unchanged. No new state cache, SQL/schema/API, queue bypass, or projection deferral.

Alternatives: keep repeated construction (known work); batch every multi-source selector (local two-source result adverse); add a separate mutable scope builder (unneeded implementation/semantic surface). Existing batching with a conservative size gate is the bounded experiment. Desktop actual-helper30alternating-pair evidence is `.tmp/16be-scoped-local.json` and `16be-scoped-crossover.json`:20 sources.020476->.006904ms,50 sources.068729->.017226;1/2-source results adverse and retained.4-source benefit is tiny;8/16 lower in the local screen. These are function-target measurements, not actual engine/application gains, CPU, acceptance or floors.

Plan:

- Preserve exact baseline source/tests before editing.
- Add actual-engine regression requiring no frozen intermediate input prefixes for a20-source selector; preserve scoped values, unchanged siblings, old snapshots and no unrelated sources. Verify RED before production code.
- Cover overlapping sources through sequential fallback, escaped keys, own undefined/missing properties and `__proto__`; retain all existing query/dynamic/default/equality/error tests.
- Implement only setup gate and scoped construction; verify full library and meaningful local actual-engine work removal/timing before any APK claim.
- Run tools/harness/E2E/library+APK checks, archive immutable source/APK and provenance. Mandatory50k guard vs15aa, reversed flat emission+DOM native-wall reports, then full fresh matched shapes/lists only if target benefit repeats. Preserve all adverse channels and mean/heap guards; reject and restore on failure. No unchanged acceptance rerun, new floor, extra CPU/heap capture or commit.


Actual-engine regression RED19intermediatefrozenprefixes/42othersPASS; candidateGREEN443thenextendedspecial-keycase444PASS. Source review found no blocking difference. Actual injected-engine alternating pairs show changed publication means lower in both orders at50 and5000keys;50-key unchanged means mixed/all samples retained. [Offline raw/source/analysis](../benchmarks/android-scoped-assembly-offline-16be-2026-10-30.json). Temporary diagnostics archived and removed before final validation/APK. All preparation/type/export failures remain in original logs; unexported timings from the first successful local diagnostic are not claimed recovered. Device gain, list/DOM/meanheap guards and retention remain unestablished.


16BE_VALIDATION_DONE:444library/40tools/1harness/30E2E/library+APKbuild PASS, exact source archive16be-source. FrozenAPKfb79cd556780f9847ebb6dbbb9bb19dd812c130a1b52e5075c5fec6f45fc2d79. New device diagnostic launched on isolated5556:6lp31guardsvs15aa, then4reversed K5000flat reports againstprovisional16aw. Actual installed APK/session/boot/source/tool hashes and genuine reboot/root statuses recorded. No device benefit or retention claim until complete independently verified reports; full fresh acceptance and all mean/heap guards remain required.


16BE_DONE verified6guards4reports4boots480actions/writes/hash-session-source/archive/reboot+parent0. Ten-key residual mean lower both orders, total/DOM mixed; replacement residual mean and maxima adverse both. Native times also moved; no source-causal general win or memory clearance. [Complete raw evidence and adverse channels](../benchmarks/android-scoped-assembly-app-16be-2026-10-30.md). Post444library/40tools/1harness/30E2E/librarybuild PASS; frozen APK not rebuilt. Proceed to first full16bf/16L22 as mandatory guard on this new candidate; retain/reject only against complete matched acceptance and all mean/heap requirements.


Firstfull16bf/16L22 launched17:31local; session `16bf-accept-1793345479`, Node35968. New matched empty/platform, code/data, floor and render controls;5pairedshapes followed by5pairedlists with verified cold reboots. Independent raw audit reproduces288per-leg statistic fields and120deltas with the established floor(n*p) convention, agreeing only that first full acceptance is warranted. All reference/provisional/rejected contexts remain distinct; no retention, limit or guard clearance.


Full16bf/16L22 genuineparent+list0 and independent verification:12PASS15PB3CB3FAIL lists30/33,shapes53/86. One list mean exceeds summedSD vsretained16L20; three shape heap means do likewise vs16av. Cross-session controls/classic also moved; no source-causal regression claim or guard dismissal. [Complete evidence/all119comparisons](../benchmarks/android-scoped-assembly-acceptance-16bf-2026-10-30.md). Exact SelectionEngine baseline restored in place/no gitcheckout; candidate/APKs/raw preserved. Removed only prefix-freeze performance assertions/spy, retaining three generic correctness cases. Revert checks pending; no unchanged full acceptance rerun or APK rebuild.
