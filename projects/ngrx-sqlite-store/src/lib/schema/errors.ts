export class NonSerializableStateError extends Error {
  constructor(readonly path: string) {
    super(`Non-serializable state at ${path || '<root>'}`);
    this.name = 'NonSerializableStateError';
  }
}

export class RowCapExceededError extends Error {
  constructor(
    readonly path: string,
    readonly bytes: number,
    readonly cap: number,
  ) {
    super(`Row cap exceeded at ${path}: ${bytes} UTF-8 bytes > ${cap}`);
    this.name = 'RowCapExceededError';
  }
}
