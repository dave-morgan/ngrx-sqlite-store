import { between, initial, needsRenormalise } from './positions';

/** Next-index set for the longest increasing subsequence of matched old indices. */
export function longestIncreasingSubsequence(indices: readonly number[]): Set<number> {
  const tails: number[] = [];
  const previous = new Array<number>(indices.length).fill(-1);
  for (let i = 0; i < indices.length; i++) {
    if (indices[i] < 0) continue;
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (indices[tails[mid]] < indices[i]) lo = mid + 1;
      else hi = mid;
    }
    if (lo) previous[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const result = new Set<number>();
  let index = tails.length ? tails[tails.length - 1] : -1;
  while (index >= 0) {
    result.add(index);
    index = previous[index];
  }
  return result;
}

export function reorderedPositions(
  matches: readonly number[],
  previous: readonly number[],
): number[] {
  // An unchanged old-index prefix followed by new items needs no LIS or anchor table.
  let append = matches.length >= previous.length;
  for (let index = 0; append && index < matches.length; index++)
    append = matches[index] === (index < previous.length ? index : -1);
  if (append) {
    const positions = [...previous];
    for (let index = previous.length; index < matches.length; index++)
      positions.push(between(positions.at(-1)));
    return needsRenormalise(positions) ? initial(matches.length) : positions;
  }
  const stable = longestIncreasingSubsequence(matches);
  const positions = new Array<number>(matches.length);
  let right: number | undefined;
  const nextAnchor = new Array<number | undefined>(matches.length);
  for (let i = matches.length - 1; i >= 0; i--) {
    nextAnchor[i] = right;
    if (stable.has(i)) right = previous[matches[i]];
  }
  for (let i = 0; i < matches.length; i++) {
    positions[i] = stable.has(i)
      ? previous[matches[i]]
      : between(i ? positions[i - 1] : undefined, nextAnchor[i]);
  }
  return needsRenormalise(positions) ? initial(matches.length) : positions;
}

/** Greedy identity/value matching, linear even for long duplicate runs. */
export function matchElements(prev: readonly unknown[], next: readonly unknown[]): number[] {
  // Consume an unchanged prefix with the same equality as Map (including NaN).
  // Stop at holes: forEach/map below preserve their original sparse-array behavior.
  let prefix = 0;
  while (prefix < prev.length && prefix < next.length && prefix in prev && prefix in next) {
    const before = prev[prefix];
    const after = next[prefix];
    if (before !== after && !(before !== before && after !== after)) break;
    prefix++;
  }
  if (prefix === prev.length) return next.map((_, index) => index < prefix ? index : -1);
  const buckets = new Map<unknown, { indices: number[]; offset: number }>();
  prev.forEach((value, index) => {
    if (index < prefix) return;
    let bucket = buckets.get(value);
    if (!bucket) {
      bucket = { indices: [], offset: 0 };
      buckets.set(value, bucket);
    }
    bucket.indices.push(index);
  });
  return next.map((value, index) => {
    if (index < prefix) return index;
    const bucket = buckets.get(value);
    return bucket && bucket.offset < bucket.indices.length ? bucket.indices[bucket.offset++] : -1;
  });
}
