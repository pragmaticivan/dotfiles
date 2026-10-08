import express from "express";
import { webhookRouter } from "./routes/webhooks.ts";

const app = express();
app.use(express.json());
app.use(webhookRouter);

app.listen(Number(process.env.PORT ?? 3000));
