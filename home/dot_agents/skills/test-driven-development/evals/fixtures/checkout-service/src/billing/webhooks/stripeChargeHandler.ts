import { chargeCustomer, type Charge } from '../payments.ts';

export interface ChargeSucceededEvent {
  id: string;
  type: 'charge.succeeded';
  data: { object: Charge };
  request: { idempotency_key: string };
}

export async function handleChargeSucceeded(event: ChargeSucceededEvent): Promise<{ status: number }> {
  await chargeCustomer(event.data.object);
  return { status: 200 };
}
