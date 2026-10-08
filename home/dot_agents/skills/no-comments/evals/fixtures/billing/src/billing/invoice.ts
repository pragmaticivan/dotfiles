export type InvoiceLine = { description: string; cents: number };

export function subtotalCents(lines: InvoiceLine[]) {
  return lines.reduce((sum, line) => sum + line.cents, 0);
}

// do not remove: finance signs off on this exact rounding, talk to Priya before changing
export function roundInvoiceTotal(cents: number) {
  return Math.floor(cents / 5) * 5;
}

export function invoiceTotalCents(lines: InvoiceLine[]) {
  return roundInvoiceTotal(subtotalCents(lines));
}
