# Test levels

Use the lowest level that can observe the defect. A rounding bug in a pure function needs a unit test. A bug in a SQL query needs a real database. A broken login redirect needs a browser.

| Level | Runs | Owns | Speed |
| --- | --- | --- | --- |
| Unit | One process, no I/O | Pure logic, transforms, state machines, validation | Milliseconds |
| Integration | Real database, real HTTP server on localhost, fake third parties | Queries, transactions, handlers, serialization, auth middleware, wiring | Seconds |
| Contract | Consumer schema against provider output | The shape at a boundary that another team or service owns | Seconds |
| End-to-end | Real browser against the running app | A few critical user journeys | Minutes |

Most tests are unit tests because most logic is pure. Do not push a case down to a unit test when the defect lives in the integration. A unit test with a mocked repository cannot catch a wrong `WHERE` clause.

## Integration tests

Run the real code from the HTTP edge to the real database. Fake only what you do not own.

```typescript
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app';
import { createTestDb, type TestDb } from '../support/db';

let db: TestDb;
let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  db = await createTestDb();
  app = await buildApp({ databaseUrl: db.url });
});
afterAll(async () => {
  await app.close();
  await db.drop();
});
beforeEach(() => db.truncate());

describe('POST /orders', () => {
  it('stores the order and returns it with its total', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/orders',
      payload: { items: [{ sku: 'A1', qty: 2, unitPrice: 1250 }] },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id: expect.any(String), total: 2500 });
    expect(await db.query('select total from orders')).toEqual([{ total: 2500 }]);
  });

  it('rejects an order with no items and stores nothing', async () => {
    const res = await app.inject({ method: 'POST', url: '/orders', payload: { items: [] } });

    expect(res.statusCode).toBe(422);
    expect(await db.query('select id from orders')).toEqual([]);
  });
});
```

- **Database.** Use the same engine as production, from Testcontainers or a local compose service. Give each worker its own database or schema, and reset state per test with a truncate or a rolled-back transaction. SQLite in place of Postgres tests a different database.
- **HTTP server.** Use the framework's in-process injector (`app.inject` in Fastify, `supertest` for Express) or listen on port `0`. Do not hard-code ports.
- **Outbound HTTP.** Intercept with MSW and fail on any request that no handler matches. A silent pass-through hits the real service.

```typescript
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const server = setupServer(
  http.post('https://api.stripe.com/v1/refunds', () => HttpResponse.json({ id: 're_1', status: 'succeeded' })),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Override a handler inside one test to reach a failure path: `server.use(http.post(url, () => new HttpResponse(null, { status: 502 })))`. Then assert the state after the failure, not only the error.

- **Side effects.** Assert on the observable result: the row, the queued message, the payload that the fake received. A call count alone accepts a wrong payload.

## Contract tests

When a service you do not control produces data that you consume, parse a recorded or live sample with the same schema that production code uses. The test fails when the shape drifts, before production does.

```typescript
import { OrderEvent } from '../../src/events/schema';
import sample from './samples/order-created.json';

it('parses the order.created event the provider publishes', () => {
  expect(OrderEvent.safeParse(sample).success).toBe(true);
});
```

Pair it with one rejected sample, so that a schema that accepts everything fails the suite.

## End-to-end tests

Keep end-to-end tests to the journeys whose failure stops the business: sign-up, login, checkout, the core create-and-view flow. Cover branches and validation at lower levels.

```typescript
import { expect, test } from '@playwright/test';

test('a signed-in user buys the item in the cart', async ({ page, request }) => {
  const user = await request.post('/test-api/users', { data: { cart: ['A1'] } }).then((r) => r.json());
  await page.context().addCookies([user.sessionCookie]);

  await page.goto('/cart');
  await page.getByRole('button', { name: 'Check out' }).click();
  await page.getByLabel('Card number').fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Pay' }).click();

  await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();
  await expect(page.getByText(/Order #\d+/)).toBeVisible();
});
```

- **Seed through the API, act through the UI.** Create users and data with a request or a test endpoint. Drive only the journey under test through the page.
- **Each test owns its data.** Make unique users and records per test, so that tests run in parallel and in any order.
- **Locate by role, label, and text.** These match what the user sees. Use a `data-testid` only when no accessible name exists.
- **Wait with web-first assertions.** `await expect(locator).toBeVisible()` retries. `page.waitForTimeout` is a sleep and a future flake.
- **Reuse login.** Sign in once in a setup project and load `storageState`, unless login is the journey under test.
- **Keep failures debuggable.** Set `trace: 'on-first-retry'` and keep the retry count low. A test that passes only on retry is a flaky test. Fix it.

To reproduce a browser bug, drive the page with Playwright MCP when it is connected, then commit the same steps as a spec. The committed spec, not the session, keeps the bug fixed.

## Flaky tests

| Cause | Fix |
| --- | --- |
| Sleep or timing | Wait for the condition. Use fake timers for time-based logic. |
| Shared data between tests | Unique data per test. Reset per test. |
| Order dependence | Run in random order (`sequence.shuffle`) to find it. |
| Real clock, timezone, or locale | Inject the clock. Pin `TZ` and locale in the test config. |
| Real network | MSW with `onUnhandledRequest: 'error'`. |
| Unawaited promise | Await every async call. Turn on `@typescript-eslint/no-floating-promises`. |

Do not quarantine a flaky test without a ticket and an owner. A skipped test detects nothing.
