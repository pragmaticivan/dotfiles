export interface BackoffOptions {
  baseDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
  jitter: boolean;
}

export const DEFAULT_BACKOFF: BackoffOptions = {
  baseDelayMs: 200,
  maxDelayMs: 5_000,
  maxAttempts: 4,
  jitter: true,
};

export function computeDelay(
  attempt: number,
  opts: BackoffOptions,
  random: () => number = Math.random,
): number {
  const exponential = opts.baseDelayMs * 2 ** attempt;
  const capped = Math.min(exponential, opts.maxDelayMs);
  if (!opts.jitter) {
    return capped;
  }
  return capped + random() * capped;
}

export function isRetryableStatus(status: number): boolean {
  if (status === 0) {
    return true;
  }
  return status >= 400;
}

export function parseRetryAfter(header: string | null, now: number = Date.now()): number | null {
  if (header === null || header.trim() === "") {
    return null;
  }
  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return seconds * 1000;
  }
  const date = Date.parse(header);
  if (Number.isNaN(date)) {
    return null;
  }
  return Math.max(0, date - now);
}

export function nextDelay(
  attempt: number,
  retryAfterHeader: string | null,
  opts: BackoffOptions,
  random: () => number = Math.random,
): number {
  const fromHeader = parseRetryAfter(retryAfterHeader);
  if (fromHeader !== null) {
    return fromHeader;
  }
  return computeDelay(attempt, opts, random);
}

export function mergeBackoff(overrides: Partial<BackoffOptions> | undefined): BackoffOptions {
  return { ...DEFAULT_BACKOFF, ...overrides };
}
