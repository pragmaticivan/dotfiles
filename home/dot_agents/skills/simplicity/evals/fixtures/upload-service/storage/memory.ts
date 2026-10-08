import type { CompletedPart, Kv, ObjectStore } from './clients.ts'

export class MemoryStore implements ObjectStore {
  uploads = new Map<string, { key: string; parts: Map<number, Uint8Array> }>()
  objects = new Map<string, Uint8Array>()
  partCalls = 0
  failOnPart: number | null = null
  private nextId = 1

  async createMultipartUpload(key: string) {
    const id = `mpu-${this.nextId++}`
    this.uploads.set(id, { key, parts: new Map() })
    return id
  }
  async uploadPart(key: string, uploadId: string, partNumber: number, body: Uint8Array) {
    this.partCalls++
    if (this.failOnPart === partNumber) {
      this.failOnPart = null
      throw new Error(`connection reset on part ${partNumber}`)
    }
    this.uploads.get(uploadId)!.parts.set(partNumber, body.slice())
    return `etag-${uploadId}-${partNumber}`
  }
  async completeMultipartUpload(key: string, uploadId: string, parts: CompletedPart[]) {
    const upload = this.uploads.get(uploadId)!
    const chunks = parts.map((p) => upload.parts.get(p.partNumber)!)
    this.objects.set(key, Buffer.concat(chunks))
    this.uploads.delete(uploadId)
  }
  async abortMultipartUpload(key: string, uploadId: string) {
    this.uploads.delete(uploadId)
  }
  async listMultipartUploads() {
    return [...this.uploads].map(([uploadId, u]) => ({ key: u.key, uploadId }))
  }
}

export class MemoryKv implements Kv {
  now = 0
  private data = new Map<string, { value: string | Map<string, string>; expiresAt: number }>()

  private live(key: string) {
    const entry = this.data.get(key)
    if (entry && entry.expiresAt <= this.now) this.data.delete(key)
    return this.data.get(key)
  }
  async get(key: string) {
    const v = this.live(key)?.value
    return typeof v === 'string' ? v : null
  }
  async set(key: string, value: string, opts: { nx?: boolean; pxMs?: number } = {}) {
    if (opts.nx && this.live(key)) return false
    this.data.set(key, { value, expiresAt: opts.pxMs ? this.now + opts.pxMs : Infinity })
    return true
  }
  async del(key: string) {
    this.data.delete(key)
  }
  async hset(key: string, field: string, value: string) {
    const entry = this.live(key) ?? { value: new Map<string, string>(), expiresAt: Infinity }
    ;(entry.value as Map<string, string>).set(field, value)
    this.data.set(key, entry)
  }
  async hgetall(key: string) {
    const v = this.live(key)?.value
    return v instanceof Map ? Object.fromEntries(v) : {}
  }
  async keys(prefix: string) {
    return [...this.data.keys()].filter((k) => k.startsWith(prefix) && this.live(k))
  }
}
