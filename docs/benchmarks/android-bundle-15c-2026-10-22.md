# Phase 15c Android bundle audit

Emitted JavaScript bytes, uncompressed; static imports define initial reachability. Todos-ready additionally includes the lazy /todos route static closure. Lazy web and benchmark chunks are not charged to startup. These bytes do not measure live heap.

| JavaScript graph | Classic bytes | SQLite bytes | Delta |
| --- | ---: | ---: | ---: |
| Initial static imports | 310508 | 411581 | 101073 |
| Initial /todos route included | 359383 | 460557 | 101174 |

| SQLite module group | Initial bytes | /todos ready bytes | All emitted bytes |
| --- | ---: | ---: | ---: |
| nss | 116375 | 116375 | 116375 |
| sqlJsDriver | 0 | 0 | 0 |
| sqlJs | 0 | 0 | 40197 |
| jeepSqlite | 0 | 0 | 419968 |
| webDriver | 0 | 0 | 11086 |
| devtools | 0 | 0 | 15996 |
| spikes | 0 | 0 | 0 |

Groups overlap: sqlJsDriver and spikes, if present, are also part of NSS. Module byte sums exclude emitted glue and therefore differ from total output bytes. Dynamic entry closures overlap and must not be summed.

The /todos route is loaded by initial navigation after bootstrap; it is reported separately from static application startup. Optional web drivers, jeep-sqlite and sql.js require their dynamic import branches to execute. File presence in the APK does not demonstrate loading into the Android JavaScript heap.

The JSON sidecar contains every dynamic entry point, output closure and the largest module deltas. Reproduce with `node tools/bundle-audit.mjs` after both APK statistics have been generated. Live heap attribution requires a same-session post-GC heap snapshot comparison; retained input data, compiled code, native contexts and selector/DI objects are different categories. Bundle byte deltas cannot be converted into retained heap bytes.
