import { parse, formatDay } from 'datekit';

// Rows from the billing CSV use "2026-09-30 14:05:00" (space, no zone).
export function invoiceDay(row: { issued_at: string }): string {
  return formatDay(parse(row.issued_at));
}
