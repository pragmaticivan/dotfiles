import type { Payload } from "./queue.ts";

type Listener = (payload: Payload) => void;

const listeners = new Map<string, Listener[]>();

export const EventBus = {
  on(event: string, listener: Listener): void {
    listeners.set(event, [...(listeners.get(event) ?? []), listener]);
  },
  emit(event: string, payload: Payload): void {
    for (const listener of listeners.get(event) ?? []) listener(payload);
  },
};
