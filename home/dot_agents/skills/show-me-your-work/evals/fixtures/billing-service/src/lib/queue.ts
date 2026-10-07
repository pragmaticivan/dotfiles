export type Payload = Record<string, unknown>;

const sent: Array<{ topic: string; payload: Payload }> = [];

/** @deprecated Use EventBus.emit from ./eventBus.ts. */
export const queue = {
  publish(topic: string, payload: Payload): void {
    sent.push({ topic, payload });
  },
  sent,
};
