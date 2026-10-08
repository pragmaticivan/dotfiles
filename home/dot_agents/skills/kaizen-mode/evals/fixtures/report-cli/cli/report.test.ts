import test from 'node:test';
import assert from 'node:assert';
import { buildRows, renderTable } from './report.ts';

test('sorts by error rate, highest first', () => {
  const rows = buildRows([
    { team: 'a', requests: 100, errors: 1 },
    { team: 'b', requests: 100, errors: 5 },
  ]);
  assert.deepStrictEqual(rows.map((r) => r.team), ['b', 'a']);
});

test('renders an aligned table', () => {
  const out = renderTable(buildRows([{ team: 'search', requests: 2000, errors: 3 }]));
  assert.strictEqual(out, 'TEAM    REQUESTS  ERRORS  ERROR %\nsearch  2000      3       0.15');
});
