import { toISO } from 'datekit';
import { dueDate } from './dueDate.ts';

const orders = [
  { id: 'A-1001', placed: new Date(Date.UTC(2026, 9, 5, 15, 30, 0, 250)), terms: 30 },
  { id: 'A-1002', placed: new Date(Date.UTC(2026, 9, 6, 9, 0, 0, 0)), terms: 14 },
];

for (const o of orders) {
  console.log(JSON.stringify({ id: o.id, placed_at: toISO(o.placed), due_at: toISO(dueDate(o.placed, o.terms)) }));
}
