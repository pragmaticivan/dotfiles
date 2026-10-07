import { Router } from "express";
import { getCustomer, parseCustomerPatch, primaryEmail } from "../services/customers";

export const customerRouter = Router();

customerRouter.get("/:id", async (req, res) => {
  const customer = await getCustomer(req.params.id);
  res.json({ ...customer, email: primaryEmail(customer) });
});

customerRouter.patch("/:id", async (req, res) => {
  const patch = parseCustomerPatch(req.body);
  res.json(patch);
});
