// Phase 16 workloads: large flat objects and hybrid workflow state. Shared by both
// implementations (ADR-0011); only the reducers in store-impl/* differ.
import { createAction, createActionGroup, emptyProps, props } from '@store';
import { EntityState, createEntityAdapter } from '@store/entity';

// ── Flat: one feature, K top-level keys (localStorage 'harness:flatKeys', default 500) ──

export type FlatValue = string | number | boolean;
export type FlatState = Record<string, FlatValue>;

export function flatKeyCount(): number {
  const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem('harness:flatKeys');
  const n = raw === null ? NaN : Number(raw);
  return Number.isInteger(n) && n > 0 ? n : 500;
}

export const flatKey = (i: number) => `k${String(i).padStart(4, '0')}`;

/** Deterministic mixed scalars: every 3rd numeric, every 7th boolean, rest short strings. */
export function initialFlat(k = flatKeyCount()): FlatState {
  const state: FlatState = {};
  for (let i = 0; i < k; i++) state[flatKey(i)] = i % 7 === 0 ? i % 2 === 0 : i % 3 === 0 ? i : `value ${i}`;
  return state;
}

export const FlatActions = createActionGroup({
  source: 'Flat',
  events: {
    'Key Set': props<{ key: string; value: FlatValue }>(),
    'Keys Set': props<{ patch: FlatState }>(),
    Replaced: props<{ profile: FlatState }>(),
  },
});

// ── Hybrid workflow: status/loading/step + nested form (to depth 10) + validation + events + drafts ──

export interface WorkflowEvent {
  id: string;
  type: string;
  at: number;
}

export interface Draft {
  id: string;
  title: string;
  updatedAt: number;
}

/** Nested object used for the form: plain JSON, depth counted from `form` = depth 1. */
export type FormNode = { [key: string]: string | number | boolean | null | FormNode };

export interface WorkflowState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  loading: boolean;
  error: string | null;
  step: number;
  form: FormNode;
  validation: Record<string, string | null>;
  events: WorkflowEvent[];
  drafts: EntityState<Draft>;
}

export const draftAdapter = createEntityAdapter<Draft>();

/** Field paths at form depths 1, 4 and 10 (path length = depth). */
export const FIELD_PATHS = {
  d1: ['name'],
  d4: ['contact', 'address', 'street', 'line1'],
  d10: ['deep', 'l2', 'l3', 'l4', 'l5', 'l6', 'l7', 'l8', 'l9', 'value'],
} as const;

function deepBranch(): FormNode {
  let node: FormNode = { value: 'deep', note: 'level 10' };
  for (let level = 9; level >= 2; level--) node = { [`l${level}`]: node, [`meta${level}`]: level };
  return node;
}

export function initialForm(): FormNode {
  const group = (prefix: string, n: number): FormNode =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => [`${prefix}${i}`, `${prefix} ${i}`]));
  return {
    name: 'Ada Lovelace',
    email: 'ada@example.dev',
    agree: false,
    contact: {
      phone: '+61 400 000 000',
      address: { street: { line1: '1 Analytical St', line2: '' }, city: 'London', postcode: 'N1' },
    },
    preferences: { theme: 'light', notifications: { email: true, sms: false }, ...group('pref', 8) },
    employment: { company: 'Engines Ltd', role: { title: 'Programmer', level: 3 }, ...group('job', 10) },
    deep: deepBranch(),
    ...group('extra', 20),
  };
}

export function initialWorkflow(): WorkflowState {
  return {
    status: 'idle',
    loading: false,
    error: null,
    step: 1,
    form: initialForm(),
    validation: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`field${i}`, null])),
    events: [],
    drafts: draftAdapter.getInitialState(),
  };
}

export const WorkflowActions = createActionGroup({
  source: 'Workflow',
  events: {
    'Field Edited': props<{ path: readonly string[]; value: string }>(),
    'Load Started': emptyProps(),
    'Load Succeeded': props<{ at: number }>(),
    'Step Changed': props<{ step: number }>(),
    'Form Reset': emptyProps(),
    'Events Appended': props<{ events: WorkflowEvent[] }>(),
    'Draft Saved': props<{ draft: Draft }>(),
  },
});

/** Immutable set-in for the form: copies only the path, siblings keep their references. */
export function setIn(node: FormNode, path: readonly string[], value: string): FormNode {
  const [head, ...rest] = path;
  if (rest.length === 0) return { ...node, [head]: value };
  return { ...node, [head]: setIn(node[head] as FormNode, rest, value) };
}

export function getIn(node: FormNode, path: readonly string[]): unknown {
  return path.reduce<unknown>((n, key) => (n as FormNode | undefined)?.[key], node);
}

/** Not part of a group: covers the plain createAction style in this workload too. */
export const workflowNoop = createAction('[Workflow] Noop');
