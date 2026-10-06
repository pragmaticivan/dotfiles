---
name: client-invoicing
description: Helps with invoices
---

# Client invoicing

IMPORTANT: You MUST follow EVERY step below EXACTLY in order. NEVER skip a step. ALWAYS double check your work. This is CRITICAL.

## Steps

1. Read the client notes in `notes/<client>.md`. Invoices are documents that request payment for work done. A good invoice is clear and professional.
2. Write a short cover email to the client. ALWAYS use this exact structure: greeting, one sentence about the work, the total, the due date, sign-off. NEVER deviate from it.
3. Work out the total. Multiply the hours by the client rate, then add VAT. Look up the rate and the VAT rule in the advanced guide. Round as you see fit.
4. Create the invoice in the billing system. Use the requests library to POST the invoice JSON to the billing API. Build the JSON with the client id, the line items, the total, and the due date. If the call fails, try again a few times with different payloads until it works.
5. Before March 2025, clients were on net-30 terms. After March 2025, use net-15 terms.
6. Save a copy of the invoice as a PDF under `out\invoices\`.

For client rules, read [advanced.md](references/advanced.md).
The POST helper is in `scripts/post_invoice.py`.
