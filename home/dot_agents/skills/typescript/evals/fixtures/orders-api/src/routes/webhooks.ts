import { Router } from "express";
import { markOrderShipped } from "../orders.ts";

interface ShippoEvent {
  event: string;
  data: { metadata: string; tracking_number: string };
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: { metadata: { orderId: string }; amount_received: number } };
}

export const webhookRouter = Router();

webhookRouter.post("/webhooks/shippo", async (req, res) => {
  const event = req.body as ShippoEvent;
  if (event.event !== "track_updated") {
    res.sendStatus(204);
    return;
  }
  await markOrderShipped(event.data.metadata, event.data.tracking_number);
  res.sendStatus(200);
});
