# Phase15p single-statement native transport diagnostic

Compared atomic run versus one-element executeSet for identical production todo UPDATEs, alternating order and toggling data each call after warmup.120 samples per method with gap0 and gap20ms. Raw `.tmp/15p-single-write-gap{0,20}.json`, corresponding logs and `.tmp/15p-single-write-probe.mjs` retained.

Back-to-back executeSet/run:p50 3.4/3.4ms,p95 4.6/4.5ms,means3.47/3.75ms. Paced:p50 4.0/3.9ms,p95 4.8/5.1ms,means4.04/4.65ms. No repeatable benefit. Reject this route before changing production driver code. This diagnostic changes no floor/acceptance rule or APK. Continue investigating selector/signal work.
