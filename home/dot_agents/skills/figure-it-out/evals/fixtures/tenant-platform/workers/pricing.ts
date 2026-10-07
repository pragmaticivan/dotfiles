import { subscribe, type Job } from "../shared/queue.ts";

export const processed: Job[] = [];

export function start() {
  subscribe("pricing", async (job) => {
    processed.push(job);
  });
}
