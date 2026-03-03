export class Semaphore {
  private queue: { slots: number; resolve: () => void }[] = [];
  private active = 0;
  private limit: number;

  constructor(limit: number) {
    this.limit = limit;
  }

  async acquire(slots = 1): Promise<void> {
    const needed = Math.min(slots, this.limit);
    if (this.active + needed <= this.limit) {
      this.active += needed;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push({ slots: needed, resolve });
    });
  }

  release(slots = 1): void {
    this.active -= Math.min(slots, this.limit);
    this.drain();
  }

  private drain(): void {
    while (this.queue.length > 0) {
      const next = this.queue[0];
      if (this.active + next.slots > this.limit) break;
      this.queue.shift();
      this.active += next.slots;
      next.resolve();
    }
  }
}
