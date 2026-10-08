export type Job = { tenantId: string; kind: string; payload: unknown };
type Handler = (job: Job) => Promise<void>;

const handlers = new Map<string, Handler>();

export function subscribe(kind: string, handler: Handler) {
  handlers.set(kind, handler);
}

export async function publish(job: Job): Promise<boolean> {
  const handler = handlers.get(job.kind);
  if (!handler) return false;
  await handler(job);
  return true;
}
