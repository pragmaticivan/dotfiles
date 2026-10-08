import { SessionStore } from "./src/cache/sessionStore.ts";

const store = new SessionStore();
const ids = Array.from({ length: 20_000 }, (_, i) => `s${i}`);
for (const id of ids) store.set(id, `cart-${id}`, null);

const samples = [];
for (let i = 0; i < 100_000; i++) {
  const id = ids[i % ids.length];
  const start = process.hrtime.bigint();
  store.get(id);
  store.set(id, `cart-${id}`, null);
  samples.push(Number(process.hrtime.bigint() - start) / 1e6);
}
samples.sort((a, b) => a - b);
const p99 = samples[Math.floor(samples.length * 0.99)];
console.log(JSON.stringify({ store: "in-process-lru", p99_ms: Number(p99.toFixed(4)) }));

if (!process.env.REDIS_URL) console.log("REDIS_URL not set, skipping redis");
