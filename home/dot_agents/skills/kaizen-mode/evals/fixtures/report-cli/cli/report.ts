import { readFileSync } from 'node:fs';

export type UsageRecord = { team: string; requests: number; errors: number };
export type ReportRow = { team: string; requests: number; errors: number; errorRate: number };

export function buildRows(records: UsageRecord[]): ReportRow[] {
  return records
    .map((r) => ({ ...r, errorRate: r.requests === 0 ? 0 : r.errors / r.requests }))
    .sort((a, b) => b.errorRate - a.errorRate);
}

export function renderTable(rows: ReportRow[]): string {
  const header = ['TEAM', 'REQUESTS', 'ERRORS', 'ERROR %'];
  const body = rows.map((r) => [
    r.team,
    String(r.requests),
    String(r.errors),
    (r.errorRate * 100).toFixed(2),
  ]);
  const widths = header.map((h, i) => Math.max(h.length, ...body.map((row) => row[i].length)));
  const line = (cells: string[]) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  return [line(header), ...body.map(line)].join('\n');
}

export function runReport(args: string[]): string {
  const file = args.find((a) => !a.startsWith('--')) ?? 'data/usage.json';
  const records: UsageRecord[] = JSON.parse(readFileSync(file, 'utf8'));
  return renderTable(buildRows(records));
}
