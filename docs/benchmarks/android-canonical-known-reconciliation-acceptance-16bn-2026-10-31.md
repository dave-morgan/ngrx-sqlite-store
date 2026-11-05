# Canonical known reconciliation: full16bn/16L24 acceptance

Full acceptance failed. Lists:12PASS/14PB/0BB/3CB/4FAIL(29/33). Shapes:1PASS/52PB/0CB/33FAIL(53/86). Retained reference16av/16L20 remains unchanged. Both goals and all mean/heap debt stay open.

Both parent and list runner genuinely exited0 at10:50Brisbane. All37 live source/tool/helper/environment hashes match their prelaunch archived bytes;11 frozen contexts and APK/session/boot/control journals are bound. Existing summaries were independently verified once and not overwritten. Postchecks:465library,40tools,1harness,30E2E and librarybuild PASS; frozen APK was not rebuilt.

| List FAIL | SQLite mean | Classic mean | Excess | Allowance | Over allowance |
|---|---:|---:|---:|---:|---:|
| 1000 pssTotalMb | 234.278906250 | 222.078125000 | 12.200781250 | 12.008795086 | 0.191986164 |
| 1000 pssRelaunchTotalMb | 221.035742188 | 217.067382812 | 3.968359375 | 3.645886312 | 0.322473063 |
| 10000 pssTotalMb | 242.459960938 | 228.787695313 | 13.672265625 | 6.949624245 | 6.722641380 |
| 50000 relaunchReadyMs | 1821.240000000 | 1489.240000000 | 332.000000000 | 285.321714722 | 46.678285278 |

Units are ms for relaunch, MiB for PSS. Every one of the119 comparisons, adverse mean, raw/control scalar and source hash is retained in the paired JSON and existing shapes-components evidence.

| lists comparison | SQLite means increased | Above summed SD |
|---|---:|---:|
| rejected16L23 | 15/33 | 1 |
| historical16L5 | 27/33 | 13 |
| rejected16L22 | 17/33 | 1 |
| provisional16L21 | 26/33 | 2 |
| retained16L20 | 24/33 | 1 |
| retained16L8 | 27/33 | 8 |
| rejectedGated16L19 | 23/33 | 5 |
| rejected16L14 | 16/33 | 0 |
| rejected16L13 | 18/33 | 3 |
| rejected16L12 | 17/33 | 0 |
| reference15aa | 17/33 | 8 |

| shapes comparison | SQLite means increased | Above summed SD |
|---|---:|---:|
| rejected16bj | 56/86 | 2 |
| rejected16bf | 48/86 | 1 |
| provisional16ay | 31/86 | 7 |
| retained16av | 41/86 | 5 |
| retained16r | 73/86 | 29 |
| historical16k | 72/86 | 24 |
| rejected16ai | 44/86 | 4 |
| rejectedGated16aq6 | 48/86 | 4 |

The retained16L20 comparison includes1k emitP50+0.14ms versus summedSD0.138438258ms. Its small margin does not dismiss the guard. Shape comparison with16av has three flat heaps, workflow heap and K5000 lagP50 above summedSD; all five heap data-parity checks fail.

Current list empty-plugin PSS allowance2.5935546875MiB versus retained2.848046875. Current seed PSS controls at1k/10k/50k are7.8271484375/3.5146484375/3.5478515625MiB versus retained13.036458333/14.6796875/9.860026042. For10k, SQLite PSS increased0.3234375MiB within summedSD1.954666658, while allowance fell18.441569504 to6.949624245MiB. For50k relaunch, SQLite increased77.88ms within summedSD316.1027 while classic decreased29.86ms. The classic1k firstReady fifth trial1307.3ms differs from the other360.7–428.7ms trials and inflates its408.493ms SD. These control movements qualify cross-session comparisons, without erasing FAILs or proving equivalence/source cause. No samples were discarded.

The independent audit completed current and historical arithmetic checks, then ended with a usage-limit error before its final recommendation. That failure is preserved; no final completed child review is claimed and no provider/model fallback was used. Root verified genuine exits, existing summaries, comparator, source bookends and postchecks.

Decision:16bm is unaccepted for retention. Its correctness tests remain valid. A new16bo containment experiment may restore ordinary sharing byte-for-byte and put canonical complete-known-object sharing behind a dedicated helper. Extra helper code/entry/fallback costs and footprint remain unmeasured. This is a source-supported scope change, not causal attribution of the0.14ms increase. No unchanged acceptance rerun, floor expansion, extra capture or commit.
