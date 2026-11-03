# Public SDK run versus singleton executeSet16bg

Status: rejected; production driver, SQL, native library and APK unchanged.

Unchanged16aw after genuine scoped cold boot+60s settling on5556. Verified actual installed APK/served SDK asset hash, boot/session/source SHA,60alternating pairs/120groups/2400finite timed calls,40warmups/two setup option calls, identical successful responses,50000filtered todos/50012entities, all table counts/indexes/current cell unchanged. Setup wrapper restored before timing; temporary reference removed before final SQL proof. All responses, raw samples and adverse pairs retained.

| Method | Calls | Mean(ms) | Sample SD | P50 | P95 | Max |
|---|---:|---:|---:|---:|---:|---:|
| set | 1200 | 3.096167 | 0.548059 | 3.000000 | 4.100000 | 9.900000 |
| run | 1200 | 3.151583 | 0.657349 | 3.000000 | 4.200000 | 11.100000 |

Run mean is adverse both call orders: +.0995ms when set first, +.011333ms when run first. Overall paired mean+.055417ms; run wins28/60means and22/60medians. Both aggregate medians3ms; runP95+0.1ms andmax+1.2ms. Less native response-aggregation code does not establish a runtime gain.

Source differences in lastId=-1 failure handling remain; successful response identity is not full production error-equivalence proof. No fast path is implemented. No new app candidate, mandatory guard or unchanged full acceptance rerun is warranted for this rejected unchanged-APK diagnostic.

Timing includes SDK/bridge/scheduling/native commit wall, not CPU or SQL CPU, store application latency, a floor or an evidenced limit. No extra CPU/heap/PSS/GC capture or native fork/SQL rewrite. Scoped reboot/root genuine0. Source/SDK asset archive:16bg-located-source.
