# billing-service

Billing events for invoices, payments, subscriptions, customers, credits, usage, and the ledger.

`queue.publish()` in `src/lib/queue.ts` is deprecated. New code uses `EventBus.emit()` from `src/lib/eventBus.ts`.

Type check: `node --check` does not read TypeScript, so run a handler file directly:

    node src/handlers/invoices.ts
