export type Req = { method: string; path: string; headers: Record<string, string>; body: string };
export type Res = { status: number; json: unknown };
export type Handler = (req: Req) => Res;
export type Middleware = (req: Req, next: Handler) => Res;
