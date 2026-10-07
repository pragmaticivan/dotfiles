import type { MemoryQueue } from './queue.ts';

export type ChargeJob = { customerId: string; cents: number };

export class CardDeclined extends Error {}

export async function consumeBilling(
  queue: MemoryQueue<ChargeJob>,
  charge: (job: ChargeJob) => Promise<void>,
): Promise<void> {
  const msg = queue.pop();
  if (!msg) return;
  try {
    await charge(msg.body);
  } catch (err) {
    const attempts = msg.attempts + 1;
    const delayMs = 500 * 2 ** attempts;
    queue.push(msg.id, msg.body, delayMs, attempts);
  }
}
