# ADR-0025: Retain a configurable 16 KiB promotion threshold

Status: Provisional (phase 8; Android workload validation remains).

## Context

[Q2 measurements](../spikes/q2.md) sweep 2, 8, 16, 64 and 256 KiB over notes-shaped data from about 50 KiB to 5 MiB, using the actual schema engine. Lower thresholds reduce logical bytes bound by a small checklist update but increase row counts and reassembly work. Higher thresholds keep more inline JSON, reducing rows while increasing leaf-update amplification. These are UTF-8 SQL bind bytes, not filesystem-page traffic.

## Decision

Retain 16,384 bytes as the configurable default, plus collection/inline hints and the mandatory 1 MiB row cap (ADR-0008). This is a conservative compromise, not an experimentally proven universal optimum. Recommend 2–8 KiB or explicit collection hints for hot tiny-leaf workloads like the measured checkbox update. The single update pattern does not justify a default change for all applications. Q2 remains Provisional until phase 9 validates access patterns and bridge/disk costs; threshold migration policy also remains part of Q10.

Keep promotion/demotion on changed writes as already implemented in ADR-0016. The shrink/grow experiment confirms that crossing the default boundary rewrites the affected representation. Do not add a background/access-frequency demoter or hysteresis controller without evidence from repeated real-workload crossings. Dynamic demotion does not need to be newly added: it already exists. A global threshold change must not be assumed to migrate untouched persisted data.

## Consequences

No library changes or schema migration are justified in phase 8. Applications retain workload-specific configuration. The report records the row/read/write tradeoff and explicit boundary-crossing costs. No Android latency or physical write-volume claim follows from this in-memory experiment.
