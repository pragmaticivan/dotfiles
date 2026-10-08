export type Message<T> = { id: string; body: T; attempts: number; availableAt: number };

export class MemoryQueue<T> {
  private messages: Message<T>[] = [];
  readonly dead: Message<T>[] = [];

  push(id: string, body: T, delayMs = 0, attempts = 0): void {
    this.messages.push({ id, body, attempts, availableAt: Date.now() + delayMs });
  }

  pop(): Message<T> | undefined {
    const now = Date.now();
    const i = this.messages.findIndex((m) => m.availableAt <= now);
    return i === -1 ? undefined : this.messages.splice(i, 1)[0];
  }

  deadLetter(message: Message<T>): void {
    this.dead.push(message);
  }

  get size(): number {
    return this.messages.length;
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
