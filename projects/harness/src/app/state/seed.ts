import { Folder, Priority, SeedData, Todo, User } from './models';

/** Mulberry32: tiny deterministic PRNG so both store implementations get identical data. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Ada', 'Grace', 'Alan', 'Linus', 'Barbara', 'Ken', 'Margaret', 'Dennis', 'Radia', 'Edsger'];
const LAST = ['Lovelace', 'Hopper', 'Turing', 'Torvalds', 'Liskov', 'Thompson', 'Hamilton', 'Ritchie', 'Perlman', 'Dijkstra'];
const VERBS = ['Refactor', 'Review', 'Ship', 'Profile', 'Document', 'Benchmark', 'Migrate', 'Test', 'Design', 'Fix'];
const NOUNS = ['reducer', 'selector', 'effect', 'entity adapter', 'router state', 'devtools bridge', 'write queue', 'schema', 'CTE reader', 'row cap'];
const TAGS = ['perf', 'ux', 'android', 'web', 'infra', 'docs', 'bug', 'spike'];

export const SEED_VERSION = 1;
export const DEFAULT_SEED_SIZE = 500;

export function generateSeed(todoCount = DEFAULT_SEED_SIZE, seed = 42): SeedData {
  const r = rng(seed);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)];

  const users: User[] = Array.from({ length: 12 }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 3 + Math.floor(i / FIRST.length)) % LAST.length]}`;
    return {
      id: `u${i + 1}`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@example.dev`,
      hue: Math.floor(r() * 360),
    };
  });

  const base = Date.UTC(2026, 0, 1);
  const todos: Todo[] = Array.from({ length: todoCount }, (_, i) => ({
    id: `t${i + 1}`,
    title: `${pick(VERBS)} the ${pick(NOUNS)} #${i + 1}`,
    done: r() < 0.35,
    userId: pick(users).id,
    tags: TAGS.filter(() => r() < 0.2),
    priority: (1 + Math.floor(r() * 3)) as Priority,
    createdAt: base + i * 3_600_000,
  }));

  const folders: Folder[] = ['Inbox', 'Design', 'Research'].map((name, f) => ({
    id: `f${f + 1}`,
    name,
    notes: Array.from({ length: 4 }, (_, n) => ({
      id: `f${f + 1}n${n + 1}`,
      title: `${name} note ${n + 1}`,
      body: `Notes about ${pick(NOUNS)}. `.repeat(1 + Math.floor(r() * 5)),
      checklist: Array.from({ length: 3 }, (_, c) => ({ text: `Step ${c + 1}`, done: r() < 0.5 })),
    })),
  }));

  return { todos, users, folders };
}

/** Deterministic base64 payload of roughly `sizeKb` kilobytes. */
export function makeAttachmentData(sizeKb: number): string {
  const chunk = 'TkdSWC1TUUxJVEUtU1RPUkUtSEFSTkVTUy1BVFRBQ0hNRU5ULURBVEEtQkxPQi0';
  const target = sizeKb * 1024;
  return chunk.repeat(Math.ceil(target / chunk.length)).slice(0, target);
}
