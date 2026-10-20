sql-wasm.wasm is sql.js 1.12.0, the build that jeep-sqlite 2.8.0 embeds glue for (34 wasm imports).
Do NOT replace it with node_modules/sql.js (1.15.x): that fails with "LinkError ... Import #34".
