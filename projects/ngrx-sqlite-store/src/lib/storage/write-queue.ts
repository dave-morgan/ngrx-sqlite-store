/** Strict FIFO executor. Size includes the running task. */
export class WriteQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;

  get size(): number {
    return this.pending;
  }

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    this.pending++;
    const result = this.tail.then(task);
    // Both paths settle the queue tail; only the caller receives task errors.
    const finish = () => {
      this.pending--;
    };
    this.tail = result.then(finish, finish);
    return result;
  }

  async idle(): Promise<void> {
    while (this.pending > 0) await this.tail;
  }
}
