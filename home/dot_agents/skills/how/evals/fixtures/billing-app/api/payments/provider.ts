export type Charge = { id: string; status: "processing" };

export type PaymentProvider = {
  createCharge(input: { amountCents: number; paymentMethodId: string; idempotencyKey: string }): Promise<Charge>;
};

export function payco(apiKey: string): PaymentProvider {
  return {
    async createCharge({ amountCents, paymentMethodId, idempotencyKey }) {
      const res = await fetch("https://api.payco.example/v1/charges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Idempotency-Key": idempotencyKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: amountCents, currency: "usd", payment_method: paymentMethodId }),
      });
      if (!res.ok) throw new Error(`payco createCharge failed: ${res.status}`);
      return (await res.json()) as Charge;
    },
  };
}
