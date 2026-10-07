import { createServer } from "node:http";
import { publish } from "../shared/queue.ts";

export const server = createServer(async (req, res) => {
  const match = req.method === "POST" && req.url?.match(/^\/v1\/jobs\/(\w+)$/);
  const tenantId = req.headers["x-tenant-id"];
  if (!match) return void res.writeHead(404).end();
  if (typeof tenantId !== "string") return void res.writeHead(400).end("missing x-tenant-id");
  let body = "";
  for await (const chunk of req) body += chunk;
  const accepted = await publish({ tenantId, kind: match[1], payload: body ? JSON.parse(body) : null });
  res.writeHead(accepted ? 202 : 404).end();
});
