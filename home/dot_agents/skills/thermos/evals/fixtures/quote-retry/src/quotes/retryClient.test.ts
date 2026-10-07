import { test } from "node:test";
import assert from "node:assert/strict";
import { QuoteClient, type QuoteRequest } from "./retryClient.ts";

const request: QuoteRequest = {
  carrierId: "acme",
  zip: "02110",
  driverName: "Pat Lee",
  dateOfBirth: "1990-04-02",
  licenseNumber: "S12345678",
  vehicleVin: "1HGCM82633A004352",
};

test("returns the carrier quote on a 200", async () => {
  const client = new QuoteClient({
    baseUrl: "https://carriers.internal",
    transport: async () => ({ status: 200, headers: {}, body: { premium_cents: 81234, quote_id: "q-1" } }),
  });
  assert.deepEqual(await client.fetchQuote(request), {
    carrierId: "acme",
    premiumCents: 81234,
    quoteId: "q-1",
  });
});
