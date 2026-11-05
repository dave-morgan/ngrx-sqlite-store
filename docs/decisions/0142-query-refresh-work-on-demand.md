# ADR0142: create refresh query work only when needed

Status:16bs host screen; no production change, APK or device benefit yet.

16bq was rejected after its completed guarded diagnostic. Preserve its source, raw data and APKs; SelectionEngine is restored exactly and seven generic behavior cases remain. Full16br/16L26 stays held.16av/16L20 remains the measured performance reference;16bo is an unaccepted isolation control only.

PathCache.refresh enters one existing FIFO read for dirty retained entries, creates an empty query promise array and queryBatch reader, refreshes physical entries, collects dirty query work, and awaits Promise.all even when that array is empty. A physical-only scalar refresh needs neither the reader factory nor that empty aggregate await. This is a separate opportunity from rejected readiness reuse, lease accounting and singleton-scope reconstruction. It does not establish the cause of historical device movements or promise the missing0.30ms.

Host screen: use actual StorageEngine/PathCache and a persisted scalar update. Count unused factory construction and empty aggregate work without timing or CPU/heap/PSS/GC capture. Cover a physical refresh with two dirty query readers sharing one batch, JSON-transport fallback, and rejected reads with explicit recovery. Preserve the existing two refresh loops, physical-before-query ordering, one reader shared by all dirty queries, Promise.all for nonempty query work, FIFO, post-commit notification, write SQL, leases and error propagation.

If the screen and review warrant implementation, keep the query array and reader local and optional, initialize once at the first dirty query, and await only a present query array. No extra traversal, retained reader/cache, SQL/API/schema change or benchmark change. Lazy allocation moves its pure setup until after the physical pass; query-side condition/code costs remain unmeasured.

Alternatives: retain unconditional query setup; pre-scan dirty queries (adds a traversal); lazily create work within the existing query loop (bounded choice if the screen passes). Any product change requires all library/tool/harness/E2E/library+APK build checks, a new frozen source/APK, independent review, six mandatory50k guards against15aa retaining300-second waits, reversed coldboot60-second-settle reports and all adverse evidence. A first full acceptance is conditional, never an unchanged variance hunt. Floors, both goals and mean/heap guards stay unchanged and open.
