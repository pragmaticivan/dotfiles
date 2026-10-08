#!/usr/bin/env node
// Drive a running Chrome over the DevTools protocol when the chrome-devtools MCP is absent.
// Usage: CDP_PORT=9222 node cdp.mjs <url> [step ...]
// A step is `click:<css selector>` (a real mouse click) or a JavaScript expression to read page state.
// Prints console messages, exceptions, network responses, and step results as JSON lines.
import { setTimeout as sleep } from 'node:timers/promises';

const [url, ...steps] = process.argv.slice(2);
if (!url) {
  console.error('usage: node cdp.mjs <url> [click:<selector> | <js expression>] ...');
  process.exit(2);
}
const port = process.env.CDP_PORT ?? 9222;

const page = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

let nextId = 0;
const pending = new Map();
const listeners = new Map();
const out = (record) => console.log(JSON.stringify(record));
ws.addEventListener('message', ({ data }) => {
  const msg = JSON.parse(data);
  if (msg.id !== undefined) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else {
    listeners.get(msg.method)?.(msg.params);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  pending.set(++nextId, { resolve, reject });
  ws.send(JSON.stringify({ id: nextId, method, params }));
});

const requests = new Map();
listeners.set('Runtime.consoleAPICalled', (p) => out({ console: p.type, text: p.args.map((a) => a.value ?? a.description).join(' ') }));
listeners.set('Runtime.exceptionThrown', (p) => out({ exception: p.exceptionDetails.exception?.description ?? p.exceptionDetails.text }));
listeners.set('Log.entryAdded', (p) => out({ log: p.entry.level, text: p.entry.text, url: p.entry.url }));
listeners.set('Network.requestWillBeSent', (p) => requests.set(p.requestId, p.request));
listeners.set('Network.responseReceived', (p) => {
  const req = requests.get(p.requestId);
  out({ network: req?.method, url: p.response.url, status: p.response.status, body: req?.postData });
});

await Promise.all(['Runtime.enable', 'Log.enable', 'Network.enable', 'Page.enable'].map((m) => send(m)));
const loaded = new Promise((resolve) => listeners.set('Page.loadEventFired', resolve));
await send('Page.navigate', { url });
await loaded;
await sleep(500);

const evaluate = async (expression) => {
  const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
};

for (const step of steps) {
  try {
    if (step.startsWith('click:')) {
      const selector = step.slice(6);
      const box = await evaluate(`(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r && { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
      if (!box) throw new Error(`no element matches ${selector}`);
      for (const type of ['mousePressed', 'mouseReleased']) {
        await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
      }
      out({ step, result: 'clicked' });
    } else {
      out({ step, result: await evaluate(step) });
    }
  } catch (error) {
    out({ step, error: error.message });
  }
  await sleep(500);
}

ws.close();
await fetch(`http://127.0.0.1:${port}/json/close/${page.id}`);
