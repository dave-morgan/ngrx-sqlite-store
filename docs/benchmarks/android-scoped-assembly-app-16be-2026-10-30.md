# Scoped selector assembly16be: reversed device evidence

Status: provisional, first full matched acceptance pending. Baseline is safety-fixed16aw; performance reference remains16av/16L20. No promotion or gate clearance.

Independently verified6guards,4distinct workload boots,480finite emit/DOM actions and480atomic native UPDATE calls, actual installed APK/session/source/tool/archive hashes, five genuine reboot exits and genuine parent exit0. Native method restored before5001flat-row and target proof in every report. All raw data are retained in the companion JSON.

| Scenario/channel | B1−A1 mean(ms) | B2−A2 mean(ms) | B1−A1 P95(ms) | B2−A2 P95(ms) |
|---|---:|---:|---:|---:|
| flatSetKey/emit | -0.905000 | -0.387500 | -3.000000 | -1.700000 |
| flatSetKey/dom | -0.940000 | -0.322500 | -4.200000 | -2.000000 |
| flatSetKey/native | -1.237500 | -0.062500 | -3.300000 | -2.900000 |
| flatSetKey/residual | +0.332500 | -0.325000 | +1.500000 | -5.900000 |
| flatSetKeys/emit | +0.267500 | -1.130000 | +5.800000 | -4.100000 |
| flatSetKeys/dom | +0.655000 | -0.880000 | +6.300000 | -4.000000 |
| flatSetKeys/native | +0.385000 | -0.617500 | +2.500000 | -2.400000 |
| flatSetKeys/residual | -0.117500 | -0.512500 | +3.900000 | -5.300000 |
| flatReplace/emit | -0.272500 | -0.397500 | +2.000000 | -5.000000 |
| flatReplace/dom | -0.120000 | -0.517500 | +1.800000 | -4.900000 |
| flatReplace/native | -0.287500 | -0.477500 | +2.800000 | -2.900000 |
| flatReplace/residual | +0.015000 | +0.080000 | +3.200000 | +1.700000 |

50k guard15aa mean 1406.166667 SD8.146369ms; candidate mean1348.966667 SD49.812080ms. Delta-57.200000ms, SD sum57.958450ms. One guard boot/n=3 per side; no causal startup win or equivalence.

Single and replacement emit/DOM means lower both orders, with native means also lower: source causality is unestablished. Ten-key residual mean lower both orders(-.1175/-.5125ms), while ten-key total/DOM means and P95 are mixed. Replacement residual means+.015/+.08ms, residual P95+3.2/+1.7ms, emit maxima+4.3/+3.5ms and DOM maxima+4.4/+3.4ms are adverse both orders. All channels/statistics, including mixed and adverse pairs, remain in JSON.

The narrow ten-key residual direction plus the proven removal of19intermediate frozen scopes warrants the first full candidate acceptance as a guard, not retention or a general win. Full fresh matched shapes/lists, DOM, all means and heap controls remain mandatory. No unchanged acceptance rerun.

Spans include wrapper/scheduling/native wall and overlap; not additive CPU/SQL CPU, paint, floors or exact store CPU. Percentiles keep the existing project convention sorted[floor(n*p)], including upper median for even n. Timing-only probes capture no GC/heap/PSS/CPU. Standard approved full-acceptance controls remain unchanged.

Post-device444library/40tools/1harness/30E2E/librarybuild PASS; source bytes match archive and frozen APK not rebuilt. Verifier provenance gaps were repaired after the completed runner; original verifier preserved. All recorded helper/archive hashes and reboot stdout IDs match.
