export interface AuditEntry {
  actor: string;
  action: string;
  at: Date;
}

export async function writeAuditEntry(entry: AuditEntry): Promise<void> {
  const res = await fetch(process.env.AUDIT_URL ?? 'http://localhost:4100/audit', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(entry),
  });
  if (!res.ok) {
    throw new Error(`audit write failed with ${res.status}`);
  }
}

export function recordLogin(actor: string): void {
  writeAuditEntry({ actor, action: 'login', at: new Date() });
}
