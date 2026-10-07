import type { MemoryQueue } from './queue.ts';

export type WebhookJob = { url: string; payload: unknown };

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`webhook returned ${status}`);
    this.status = status;
  }
}

export async function consumeWebhook(
  queue: MemoryQueue<WebhookJob>,
  deliver: (job: WebhookJob) => Promise<void>,
): Promise<void> {
  const msg = queue.pop();
  if (!msg) return;
  try {
    await deliver(msg.body);
  } catch (err) {
    if (err instanceof HttpError && err.status >= 400 && err.status < 500) {
      queue.deadLetter(msg);
      return;
    }
    const attempts = msg.attempts + 1;
    if (attempts >= 8) {
      queue.deadLetter(msg);
      return;
    }
    const base = Math.min(60_000, 1000 * 2 ** attempts);
    queue.push(msg.id, msg.body, Math.random() * base, attempts);
  }
}
