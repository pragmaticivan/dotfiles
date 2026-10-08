export interface Charge {
  id: string;
  customer: string;
  amount: number;
}

export const ledger: Charge[] = [];

export async function chargeCustomer(charge: Charge): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  ledger.push(charge);
}

export function resetLedger(): void {
  ledger.length = 0;
}
