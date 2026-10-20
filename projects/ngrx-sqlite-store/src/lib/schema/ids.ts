let counter = 0;
const processId = Date.now().toString(36) + Math.random().toString(36).slice(2);

export function newElementId(): string {
  return `#${processId}${(counter++).toString(36)}`;
}

export function encodeEntityId(id: string | number): string {
  return typeof id === 'number' ? `n:${id}` : `s:${id}`;
}

export function decodeEntityId(id: string): string | number {
  return id.startsWith('n:') ? Number(id.slice(2)) : id.slice(2);
}
