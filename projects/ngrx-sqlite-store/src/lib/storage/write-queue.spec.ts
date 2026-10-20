import { describe, expect, it } from 'vitest';

import { WriteQueue } from './write-queue';

describe('WriteQueue', () => {
  it('runs concurrent enqueues in FIFO order with at most one active task', async () => {
    const queue = new WriteQueue();
    const log: number[] = [];
    let active = 0;
    const tasks = Array.from({ length: 20 }, (_, index) =>
      queue.enqueue(async () => {
        expect(++active).toBe(1);
        log.push(index);
        await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5)));
        expect(active--).toBe(1);
        return index;
      }),
    );
    expect(queue.size).toBe(20);
    expect(await Promise.all(tasks)).toEqual(Array.from({ length: 20 }, (_, index) => index));
    expect(log).toEqual(Array.from({ length: 20 }, (_, index) => index));
    expect(queue.size).toBe(0);
  });

  it('isolates failures and waits until tasks added while busy drain', async () => {
    const queue = new WriteQueue();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const failure = queue.enqueue(async () => {
      await gate;
      throw new Error('failed');
    });
    const rejected = expect(failure).rejects.toThrow('failed');
    let drained = false;
    const idle = queue.idle().then(() => {
      drained = true;
    });
    const next = queue.enqueue(async () => 42);
    await Promise.resolve();
    expect(drained).toBe(false);
    release();
    await rejected;
    expect(await next).toBe(42);
    await idle;
    expect(drained).toBe(true);
    expect(queue.size).toBe(0);
    await queue.idle();
  });
});
