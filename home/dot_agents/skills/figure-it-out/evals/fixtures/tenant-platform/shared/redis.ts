import { connect, type Socket } from "node:net";

export type Redis = {
  command(...args: (string | number)[]): Promise<string | number | null>;
  close(): void;
};

function encode(args: (string | number)[]): string {
  return `*${args.length}\r\n` + args.map((a) => `$${Buffer.byteLength(String(a))}\r\n${a}\r\n`).join("");
}

function parse(reply: string): string | number | null {
  const body = reply.slice(1, reply.indexOf("\r\n"));
  switch (reply[0]) {
    case "+": return body;
    case ":": return Number(body);
    case "$": return body === "-1" ? null : reply.split("\r\n")[1];
    case "-": throw new Error(`redis: ${body}`);
    default: throw new Error(`redis: unexpected reply ${JSON.stringify(reply)}`);
  }
}

export function createRedis(url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379"): Promise<Redis> {
  const { hostname, port } = new URL(url);
  return new Promise((resolve, reject) => {
    const socket: Socket = connect({ host: hostname, port: Number(port || 6379) });
    socket.once("error", reject);
    socket.once("connect", () => {
      let chain = Promise.resolve<unknown>(null);
      resolve({
        command(...args) {
          const next = chain.then(() => new Promise<string | number | null>((ok, fail) => {
            socket.once("data", (buf) => { try { ok(parse(buf.toString())); } catch (e) { fail(e); } });
            socket.write(encode(args));
          }));
          chain = next.catch(() => null);
          return next;
        },
        close: () => socket.end(),
      });
    });
  });
}
