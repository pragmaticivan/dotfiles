import { server } from "./gateway/server.ts";
import * as ingest from "./workers/ingest.ts";
import * as pricing from "./workers/pricing.ts";
import * as notify from "./workers/notify.ts";

for (const worker of [ingest, pricing, notify]) worker.start();
const port = Number(process.env.PORT ?? 8080);
server.listen(port, () => console.log(`gateway listening on :${port}`));
