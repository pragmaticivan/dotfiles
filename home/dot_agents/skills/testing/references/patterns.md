# Test patterns

TypeScript with Vitest. The same shapes work in Jest and `node:test`.

## Structure

Arrange, act, assert, separated by blank lines. One behavior per test. Several assertions are fine when they describe that one behavior.

```typescript
it('marks the task done and stamps completedAt', () => {
  const clock = fixedClock('2026-03-01T10:00:00Z');
  const task = makeTask({ status: 'open' });

  const done = completeTask(task, clock);

  expect(done).toMatchObject({ status: 'done', completedAt: new Date('2026-03-01T10:00:00Z') });
});
```

## Assertions

Assert the exact value that the contract gives. A weak assertion accepts many wrong answers.

| Weak | Strong |
| --- | --- |
| `expect(total).toBeDefined()` | `expect(total).toBe(2500)` |
| `expect(list.length).toBeGreaterThan(0)` | `expect(list.map((t) => t.id)).toEqual(['t2', 't1'])` |
| `expect(fn).toThrow()` | `expect(fn).toThrow(QuotaExceededError)` |
| `expect(send).toHaveBeenCalled()` | `expect(send).toHaveBeenCalledWith({ to: 'a@x.io', template: 'receipt' })` |

- Use `toEqual` on the whole result when every field is in the contract. Use `toMatchObject` when only some fields are.
- Await every async assertion: `await expect(save(order)).rejects.toThrow(ConflictError)`. A missing `await` passes always.
- Do not compute the expected value with the code under test or a copy of its algorithm. Write the literal answer.
- Use snapshots only for small, stable output that a reviewer reads in the diff. A large snapshot gets updated without review.

## Table-driven boundaries

Use `it.each` when cases differ only in data. Put both sides of each threshold in the table.

```typescript
it.each([
  { tier: 'gold', subtotal: 200.01, discount: 30 },
  { tier: 'gold', subtotal: 200, discount: 0 },
  { tier: 'silver', subtotal: 100.01, discount: 5 },
  { tier: 'silver', subtotal: 100, discount: 0 },
  { tier: 'none', subtotal: 10_000, discount: 0 },
] as const)('$tier at $subtotal gets $discount off', ({ tier, subtotal, discount }) => {
  expect(applyLoyaltyDiscount(makeUser({ tier }), makeOrder({ subtotal }))).toBeCloseTo(discount, 2);
});
```

## Test data

Use builders with defaults and overrides. Each test then states only the fields that matter to it.

```typescript
export function makeOrder(overrides: Partial<Order> = {}): Order {
  return { id: `o_${crypto.randomUUID()}`, subtotal: 50, currency: 'USD', ...overrides };
}
```

Prefer a little repetition over shared setup that a reader must trace. A test that reads top to bottom is a specification. A `beforeEach` that builds five objects for ten tests hides which field each test depends on.

## Test doubles

Use the most real option that stays fast and deterministic.

1. **Real implementation.** Pure code, value objects, your own modules.
2. **Fake.** A working in-memory version of a port: a repository, a queue, a clock.
3. **Stub.** Returns fixed data for a call whose input does not matter.
4. **Mock.** Records calls. Use it only for an effect at a boundary you do not own, and assert the payload.

```typescript
export interface TaskRepo {
  get(id: string): Promise<Task | undefined>;
  save(task: Task): Promise<void>;
}

export class InMemoryTaskRepo implements TaskRepo {
  private readonly tasks = new Map<string, Task>();
  async get(id: string) { return this.tasks.get(id); }
  async save(task: Task) { this.tasks.set(task.id, structuredClone(task)); }
}
```

A fake implements the same interface as production, so the type checker keeps it honest. Assert the state in the fake after the call, not the calls on it.

Do not mock your own modules with `vi.mock('./pricing')`. Such a test checks the wiring that you wrote in the mock. Mock at the process edge: network (MSW), clock, randomness, and the file system when a temp directory will not do.

## Time and randomness

Pass a clock and an id source into the code. When the code reads globals, use fake timers.

```typescript
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-01T10:00:00Z'));
});
afterEach(() => vi.useRealTimers());

it('expires the session after 30 minutes', () => {
  const session = startSession();

  vi.advanceTimersByTime(30 * 60_000);

  expect(session.isExpired()).toBe(true);
});
```

Test the moment just before the deadline as well. A test at the deadline alone accepts an off-by-one.

## Concurrency without sleeps

Control the order of events with a deferred promise. A `setTimeout` race passes on a fast machine and fails in CI.

```typescript
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

it('charges once when the same webhook arrives twice before the first finishes', async () => {
  const gate = deferred<void>();
  const payments = new FakePayments({ beforeCharge: () => gate.promise });
  const handler = makeChargeHandler({ payments, processed: new InMemoryKeyStore() });

  const first = handler(event({ idempotencyKey: 'k1' }));
  const second = handler(event({ idempotencyKey: 'k1' }));
  gate.resolve();
  await Promise.all([first, second]);

  expect(payments.charges).toHaveLength(1);
});
```

## Properties

For a wide input domain, add a property test with `fast-check` when the repository has it. Keep the known-answer examples. A property such as "idempotent" also holds for a function that returns a constant.

```typescript
import fc from 'fast-check';

it('normalizes an email so that a second pass changes nothing', () => {
  fc.assert(fc.property(fc.emailAddress(), (email) => {
    expect(normalizeEmail(normalizeEmail(email))).toBe(normalizeEmail(email));
  }));
});

it('lowercases the domain and keeps the local part', () => {
  expect(normalizeEmail('Ana.B@Example.COM')).toBe('Ana.B@example.com');
});
```

## Components

Render the component, act as the user, and assert what the user sees. Use Testing Library with `userEvent`, and query by role and label.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('shows an error and does not submit when the title is empty', async () => {
  const onSubmit = vi.fn();
  render(<TaskForm onSubmit={onSubmit} />);

  await userEvent.click(screen.getByRole('button', { name: 'Create' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
  expect(onSubmit).not.toHaveBeenCalled();
});
```

Do not assert on component state, hook internals, or class names. Those change in a refactor that the user cannot see.

## Types

Check a public type contract in a `*.test-d.ts` file with `expectTypeOf`. Use it for a generic or an overload whose inference is part of the API.

```typescript
expectTypeOf(parseOrder).returns.toEqualTypeOf<Result<Order, ParseError>>();
```

## Anti-patterns

| Pattern | Why it fails | Do instead |
| --- | --- | --- |
| Assert on the mock you configured | Checks the test, not the code | Assert the output or the state in a fake |
| Expected value from the code under test | Passes when both are wrong | Literal known answer |
| Restate a constant (`expect(MAX).toBe(8)`) | Fails on a correct change, detects nothing | Test the behavior that reads the constant |
| Test a private function | Breaks on refactor | Test through the public entry point |
| Sleep to wait | Slow and flaky | Fake timers, deferred promises, web-first assertions |
| `test.skip` with no owner | Dead code that looks like coverage | Fix or delete |
| One test per method, every branch | Mirrors the code, misses the contract | One test per behavior and risk |
