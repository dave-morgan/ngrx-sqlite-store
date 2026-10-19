# ADR-0008: Hard 1 MB per-row cap

Status: Accepted

## Context
Android's `CursorWindow` limits a row to roughly **2 MB on read**. The limit does not apply on insert, so an oversized row can be written but then crashes on read-back.

## Decision
- No single row may exceed **1 MB**, regardless of type. This leaves headroom.
- Size is measured as **serialized UTF-8 bytes**, not string length.
- Oversized objects and arrays are promoted to child rows (ADR-0007). A single scalar that is still oversized (e.g. base64) is split into numbered chunk rows (`nss_chunk`) and reassembled on read.
- All writes go through one `RowWriter`, which enforces the cap.

## Consequences
- Size measurement adds a CPU cost on writes, using a fast UTF-8 length function rather than `TextEncoder` allocation.
- Entities over 1 MB are promoted too.
