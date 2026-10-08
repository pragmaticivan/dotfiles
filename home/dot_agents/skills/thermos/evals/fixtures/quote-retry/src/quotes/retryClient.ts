import { mergeBackoff, nextDelay, isRetryableStatus, type BackoffOptions } from "./backoffPolicy.ts";

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

export interface Logger {
  warn(message: string): void;
  error(message: string): void;
}

export interface ClientOptions {
  baseUrl: string;
  transport: Transport;
  logger?: Logger;
  backoff?: Partial<BackoffOptions>;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export class CarrierQuoteError extends Error {
  readonly status: number;
  readonly attempts: number;

  constructor(message: string, status: number, attempts: number) {
    super(message);
    this.name = "CarrierQuoteError";
    this.status = status;
    this.attempts = attempts;
  }
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class QuoteClient {
  private readonly baseUrl: string;
  private readonly transport: Transport;
  private readonly logger: Logger;
  private readonly backoff: BackoffOptions;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly random: () => number;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl;
    this.transport = options.transport;
    this.logger = options.logger ?? console;
    this.backoff = mergeBackoff(options.backoff);
    this.sleep = options.sleep ?? defaultSleep;
    this.random = options.random ?? Math.random;
  }

  async fetchQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const url = `${this.baseUrl}/carriers/${request.carrierId}/quotes`;
    let lastStatus = 0;

    for (let attempt = 0; attempt <= this.backoff.maxAttempts; attempt++) {
      let result: TransportResult;
      try {
        result = await this.transport(url, request);
      } catch (err) {
        lastStatus = 0;
        this.logger.warn(`quote transport error on attempt ${attempt + 1}: ${String(err)}`);
        await this.sleep(nextDelay(attempt, null, this.backoff, this.random));
        continue;
      }

      if (result.status >= 200 && result.status < 300) {
        return toQuoteResponse(request.carrierId, result.body);
      }

      lastStatus = result.status;
      if (!isRetryableStatus(result.status)) {
        break;
      }

      this.logger.warn(
        `carrier ${request.carrierId} returned ${result.status}, retrying request ${JSON.stringify(request)}`,
      );
      const retryAfter = result.headers["retry-after"] ?? null;
      await this.sleep(nextDelay(attempt, retryAfter, this.backoff, this.random));
    }

    this.logger.error(`carrier ${request.carrierId} quote failed with status ${lastStatus}`);
    throw new CarrierQuoteError(
      `carrier ${request.carrierId} quote failed`,
      lastStatus,
      this.backoff.maxAttempts,
    );
  }
}

function toQuoteResponse(carrierId: string, body: unknown): QuoteResponse {
  const data = body as { premium_cents?: number; quote_id?: string };
  if (typeof data.premium_cents !== "number" || typeof data.quote_id !== "string") {
    throw new CarrierQuoteError(`carrier ${carrierId} sent a malformed quote`, 200, 1);
  }
  return { carrierId, premiumCents: data.premium_cents, quoteId: data.quote_id };
}
