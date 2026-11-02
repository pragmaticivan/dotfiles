# Test organization

Follow the layout that the repository already uses. When there is none, use this one.

```
src/
  pricing/
    discounts.ts
    discounts.test.ts        unit tests, next to the code
test/
  integration/
    orders.int.test.ts       real database and HTTP server
  contract/
    order-event.contract.test.ts
  support/
    builders.ts              test data builders
    fakes.ts                 in-memory fakes of ports
    db.ts                    test database lifecycle
e2e/
  checkout.spec.ts           Playwright
  auth.setup.ts
vitest.config.ts
playwright.config.ts
```

- **Unit tests sit next to the code.** A reader who opens `discounts.ts` sees `discounts.test.ts`. A move or rename carries both.
- **Slower levels get their own directory and suffix.** A glob then selects each level, and CI can run them as separate steps.
- **Support code builds data. Tests assert.** Builders, fakes, and lifecycle helpers live in `test/support/`. Keep assertions in the test body, so that each test shows what it checks.
- **Adversarial cases live with the behavior they attack.** Put the boundary and failure cases in the same `describe` as the happy path. A separate `edge-cases.test.ts` hides the contract.

## Split levels with Vitest projects

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    sequence: { shuffle: true },
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['test/integration/**/*.int.test.ts'],
          setupFiles: ['test/support/msw.ts'],
          testTimeout: 30_000,
        },
      },
    ],
  },
});
```

```json
{
  "scripts": {
    "test": "vitest run --project unit",
    "test:int": "vitest run --project integration",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test"
  }
}
```

Run in CI in order of cost: type check, lint, unit, integration, end-to-end. A fast failure stops the slow steps.

## Name tests as behavior

```typescript
describe('applyLoyaltyDiscount', () => {
  it('gives gold users 15% off an order over $200', () => {});
  it('gives no discount to a gold user at exactly $200', () => {});
  it('gives no discount to a user with no tier', () => {});
});
```

The `describe` names the unit or the endpoint. Each `it` states the observable result and the condition. A failing test name then reads as a bug report. Group by behavior, not by private method.

## Keep tests independent

- Each test creates the data it needs. Do not depend on another test's output or on file order.
- Reset shared state in `beforeEach`, not in `afterEach`. A crashed test then cannot leak into the next.
- Do not share mutable module-level objects between tests. Build a fresh object per test.
- Parallel workers must not share a database, port, or temp directory. Derive each from the worker id (`process.env.VITEST_POOL_ID`, `testInfo.workerIndex`).
