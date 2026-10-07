import { Router } from "express";
import { getInvoice, invoiceTotal } from "../services/invoices";

export const invoiceRouter = Router();

invoiceRouter.get("/:id", async (req, res) => {
  const invoice = await getInvoice(req.params.id);
  const total = await invoiceTotal(req.params.id);
  res.json({ ...invoice, total });
});

invoiceRouter.post("/:id/void", async (req: any, res: any) => {
  const reason = req.body.reason as string;
  const invoice = await getInvoice(req.params.id);
  res.json({ ...invoice, voided: true, reason });
});
