export interface DailySource {
  id: string;
  lastRunAt: string | null;
}

export interface BackfillRange {
  from: Date;
  to: Date;
}

export function planBackfillRange(from: string, to: string): BackfillRange | null {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
    return null;
  }
  return { from: new Date(start), to: new Date(end) };
}
