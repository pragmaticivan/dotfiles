import express from "express";
import { invoiceRouter } from "./routes/invoices";
import { customerRouter } from "./routes/customers";

const app = express();
app.use(express.json());
app.use("/invoices", invoiceRouter);
app.use("/customers", customerRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  res.status(500).json({ error: err.message });
});

app.listen(process.env.PORT || 3000);
