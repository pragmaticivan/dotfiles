#!/usr/bin/env bash
set -euo pipefail

export GIT_AUTHOR_NAME="Dana Reyes" GIT_AUTHOR_EMAIL="dana.reyes@example.com"
export GIT_COMMITTER_NAME="Dana Reyes" GIT_COMMITTER_EMAIL="dana.reyes@example.com"
at() { export GIT_AUTHOR_DATE="$1" GIT_COMMITTER_DATE="$1"; }

stash=$(mktemp -d)
mv src/quotes/backoffPolicy.ts src/quotes/retryClient.ts "$stash/"

git init -q -b main
echo setup.sh >> .git/info/exclude
git config user.name "Dana Reyes"
git config user.email "dana.reyes@example.com"

cat > package.json <<'EOF'
{
  "name": "quotes-service",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test 'src/**/*.test.ts'"
  }
}
EOF

cat > src/quotes/retryClient.ts <<'EOF'
export interface QuoteRequest {
  carrierId: string;
  zip: string;
  driverName: string;
  dateOfBirth: string;
  licenseNumber: string;
  vehicleVin: string;
}

export interface QuoteResponse {
  carrierId: string;
  premiumCents: number;
  quoteId: string;
}

export interface TransportResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export type Transport = (url: string, payload: QuoteRequest) => Promise<TransportResult>;

export interface ClientOptions {
  baseUrl: string;
  transport: Transport;
}

export class CarrierQuoteError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "CarrierQuoteError";
    this.status = status;
  }
}

export class QuoteClient {
  private readonly baseUrl: string;
  private readonly transport: Transport;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl;
    this.transport = options.transport;
  }

  async fetchQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const url = `${this.baseUrl}/carriers/${request.carrierId}/quotes`;
    const result = await this.transport(url, request);
    if (result.status < 200 || result.status >= 300) {
      throw new CarrierQuoteError(`carrier ${request.carrierId} quote failed`, result.status);
    }
    const data = result.body as { premium_cents?: number; quote_id?: string };
    if (typeof data.premium_cents !== "number" || typeof data.quote_id !== "string") {
      throw new CarrierQuoteError(`carrier ${request.carrierId} sent a malformed quote`, 200);
    }
    return { carrierId: request.carrierId, premiumCents: data.premium_cents, quoteId: data.quote_id };
  }
}
EOF

git add -A
at "2026-09-14T10:02:00-04:00"
git commit -q -m "feat(quotes): add carrier quote client"

git checkout -q -b feature/quote-retry-backoff
mv "$stash/backoffPolicy.ts" "$stash/retryClient.ts" src/quotes/
rmdir "$stash"
git add -A
at "2026-10-06T16:41:00-04:00"
git commit -q -m "feat(quotes): retry carrier quote calls with exponential backoff"
