import { createServer } from "node:http";
import { checkout } from "./checkout.ts";

export const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/checkout") {
    res.writeHead(404).end();
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  try {
    const receipt = await checkout(JSON.parse(body).items);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(receipt));
  } catch (err) {
    console.error("checkout failed", err);
    res.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: "internal" }));
  }
});

if (import.meta.main) {
  const port = Number(process.env.PORT ?? 3000);
  server.listen(port, () => console.log(`checkout listening on :${port}`));
}
