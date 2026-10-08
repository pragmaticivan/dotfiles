export type CompletedPart = { partNumber: number; etag: string }

export interface ObjectStore {
  createMultipartUpload(key: string): Promise<string>
  uploadPart(key: string, uploadId: string, partNumber: number, body: Uint8Array): Promise<string>
  completeMultipartUpload(key: string, uploadId: string, parts: CompletedPart[]): Promise<void>
  abortMultipartUpload(key: string, uploadId: string): Promise<void>
  listMultipartUploads(): Promise<{ key: string; uploadId: string }[]>
}

export interface Kv {
  get(key: string): Promise<string | null>
  set(key: string, value: string, opts?: { nx?: boolean; pxMs?: number }): Promise<boolean>
  del(key: string): Promise<void>
  hset(key: string, field: string, value: string): Promise<void>
  hgetall(key: string): Promise<Record<string, string>>
  keys(prefix: string): Promise<string[]>
}
