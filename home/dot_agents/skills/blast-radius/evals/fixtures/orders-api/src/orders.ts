export type Order = { id: string; total_cents: number; status: 'open' | 'shipped' };

export const orders: Order[] = [
  { id: 'A-1001', total_cents: 4599, status: 'open' },
  { id: 'A-1002', total_cents: 1250, status: 'shipped' },
];
