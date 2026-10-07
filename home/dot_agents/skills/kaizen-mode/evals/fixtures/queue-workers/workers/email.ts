import { sleep, type MemoryQueue } from './queue.ts';

export type EmailJob = { to: string; template: string };

export async function consumeEmail(
  queue: MemoryQueue<EmailJob>,
  send: (job: EmailJob) => Promise<void>,
): Promise<void> {
  const msg = queue.pop();
  if (!msg) return;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await send(msg.body);
      return;
    } catch (err) {
      console.warn(`email ${msg.id} attempt ${attempt} failed`, err);
      await sleep(1000);
    }
  }
  queue.deadLetter(msg);
}
