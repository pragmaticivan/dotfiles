import { queryOne, queryMany } from "../db";

export async function getInvoice(id) {
  return queryOne("SELECT * FROM invoices WHERE id = $1", [id]);
}

export async function invoiceTotal(id: string) {
  const lines = await queryMany("SELECT * FROM invoice_lines WHERE invoice_id = $1", [id]);
  let total = 0;
  for (let i = 0; i < lines.length; i++) {
    total += lines[i].amount_cents * lines[i].quantity;
  }
  return total;
}

export function firstOverdue(invoices: any[]) {
  const overdue = invoices.filter((inv) => new Date(inv.due_at) < new Date());
  return overdue[0].id;
}

export function byCurrency(invoices: any[]) {
  const groups: { [currency: string]: any[] } = {};
  for (const inv of invoices) {
    groups[inv.currency] = groups[inv.currency] || [];
    groups[inv.currency].push(inv);
  }
  return groups;
}
