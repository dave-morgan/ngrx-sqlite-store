#!/usr/bin/env bash
# Reboot only the dedicated benchmark AVD; never restart shared ADB or stop other emulators.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE="${BENCH_NODE:-$(node -p 'process.execPath')}"
exec "$NODE" "$ROOT/tools/android-benchmark-device.mjs"
