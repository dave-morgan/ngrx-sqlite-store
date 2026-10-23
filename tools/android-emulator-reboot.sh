#!/usr/bin/env bash
# Verified cold reboot of the single benchmark emulator (Phase 15f).
# `adb emu kill` can silently leave the qemu process alive; a later launch of the same
# AVD then starts a SECOND instance on another port while benchmarks keep using the old,
# degraded one. Kill every emulator/qemu process, verify none remain, boot one instance
# on the fixed port and settle.
set -euo pipefail
ADB="${BENCH_ADB:-$ANDROID_HOME/platform-tools/adb.exe}"
AVD="${BENCH_AVD:-Pixel_9_Pro}"
for serial in $("$ADB" devices | awk '/^emulator-/{print $1}'); do "$ADB" -s "$serial" emu kill || true; done
sleep 5
powershell.exe -NoProfile -Command "Get-Process qemu-system-x86_64-headless,qemu-system-x86_64,emulator -ErrorAction SilentlyContinue | Stop-Process -Force" || true
for i in $(seq 1 30); do
  left=$(powershell.exe -NoProfile -Command "(Get-Process qemu-system-x86_64-headless,qemu-system-x86_64,emulator -ErrorAction SilentlyContinue | Measure-Object).Count" | tr -d '\r')
  [ "$left" = "0" ] && break
  sleep 2
done
[ "$left" = "0" ] || { echo "emulator processes still alive" >&2; exit 1; }
"$ADB" kill-server || true
"$ANDROID_HOME/emulator/emulator.exe" -avd "$AVD" -port 5554 -no-window -no-audio -no-boot-anim -no-snapshot-save > /tmp/emu.log 2>&1 &
"$ADB" start-server
for i in $(seq 1 120); do
  b=$("$ADB" -s emulator-5554 shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
  [ "$b" = "1" ] && break
  sleep 5
done
[ "$b" = "1" ] || { echo "emulator did not boot" >&2; exit 1; }
sleep 60
count=$("$ADB" devices | grep -c '^emulator-' || true)
[ "$count" = "1" ] || { echo "expected exactly one emulator, found $count" >&2; exit 1; }
echo "EMULATOR_READY boot=$("$ADB" -s emulator-5554 shell cat /proc/sys/kernel/random/boot_id | tr -d '\r')"
