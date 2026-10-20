export function between(a?: number, b?: number): number {
  if (a === undefined) return b === undefined ? 1 : b - 1;
  return b === undefined ? a + 1 : a + (b - a) / 2;
}

export function initial(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i + 1);
}

export function needsRenormalise(positions: readonly number[]): boolean {
  return positions.some(
    (pos, i) => !Number.isFinite(pos) || (i > 0 && pos - positions[i - 1] < 1e-9),
  );
}
