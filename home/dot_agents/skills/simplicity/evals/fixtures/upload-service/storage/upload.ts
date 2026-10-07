import type { CompletedPart, Kv, ObjectStore } from './clients.ts'

export const DEFAULT_PART_SIZE = 5 * 1024 * 1024
export const DEFAULT_LEASE_TTL_MS = 30_000

export class LeaseHeldError extends Error {
  key: string
  holder: string | null
  constructor(key: string, holder: string | null) {
    super(`upload of ${key} is held by ${holder ?? 'nobody'}`)
    this.key = key
    this.holder = holder
  }
}

export type UploadOptions = {
  workerId: string
  partSize?: number
  leaseTtlMs?: number
  log?: (msg: string) => void
}

export type UploadResult = {
  uploadId: string
  partsUploaded: number
  partsResumed: number
}

export async function uploadObject(
  store: ObjectStore,
  kv: Kv,
  key: string,
  body: Uint8Array,
  opts: UploadOptions,
): Promise<UploadResult> {
  if (!key) throw new Error('key is required')
  if (!opts.workerId) throw new Error('workerId is required')
  const partSize = opts.partSize ?? DEFAULT_PART_SIZE
  const ttl = opts.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS
  const log = opts.log ?? (() => {})

  const leaseKey = 'upload:lease:' + key
  const acquired = await kv.set(leaseKey, opts.workerId, { nx: true, pxMs: ttl })
  if (!acquired) {
    const holder = await kv.get(leaseKey)
    if (holder !== opts.workerId) {
      log(`lease for ${key} held by ${holder}, giving up`)
      throw new LeaseHeldError(key, holder)
    }
    log(`re-entering lease for ${key}`)
  }

  let uploadId = await kv.get('upload:id:' + key)
  let resuming = true
  if (!uploadId) {
    uploadId = await store.createMultipartUpload(key)
    await kv.set('upload:id:' + key, uploadId)
    resuming = false
    log(`started multipart upload ${uploadId} for ${key}`)
  } else {
    log(`resuming multipart upload ${uploadId} for ${key}`)
  }

  let done: Record<string, string> = {}
  if (resuming) {
    done = await kv.hgetall('upload:parts:' + key)
  }

  const totalParts = Math.max(1, Math.ceil(body.length / partSize))
  const parts: CompletedPart[] = []
  let partsUploaded = 0
  let partsResumed = 0

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const existing = done[String(partNumber)]
    if (existing) {
      parts.push({ partNumber, etag: existing })
      partsResumed++
      continue
    }

    const holder = await kv.get(leaseKey)
    if (holder !== opts.workerId) {
      log(`lost lease for ${key} before part ${partNumber}`)
      throw new LeaseHeldError(key, holder)
    }

    const start = (partNumber - 1) * partSize
    const chunk = body.subarray(start, start + partSize)
    const etag = await store.uploadPart(key, uploadId, partNumber, chunk)
    await kv.hset('upload:parts:' + key, String(partNumber), etag)
    parts.push({ partNumber, etag })
    partsUploaded++

    await kv.set(leaseKey, opts.workerId, { pxMs: ttl })
  }

  const holderBeforeComplete = await kv.get(leaseKey)
  if (holderBeforeComplete !== opts.workerId) {
    log(`lost lease for ${key} before complete`)
    throw new LeaseHeldError(key, holderBeforeComplete)
  }

  parts.sort((a, b) => a.partNumber - b.partNumber)
  await store.completeMultipartUpload(key, uploadId, parts)
  log(`completed ${key}: ${partsUploaded} uploaded, ${partsResumed} resumed`)

  await kv.del('upload:parts:' + key)
  await kv.del('upload:id:' + key)
  const holderAfter = await kv.get(leaseKey)
  if (holderAfter === opts.workerId) {
    await kv.del(leaseKey)
  }

  return { uploadId, partsUploaded, partsResumed }
}

export type ReconcileResult = {
  aborted: string[]
  clearedTracking: string[]
}

export async function reconcileOrphans(
  store: ObjectStore,
  kv: Kv,
  log: (msg: string) => void = () => {},
): Promise<ReconcileResult> {
  const aborted: string[] = []
  const clearedTracking: string[] = []
  const inProgress = await store.listMultipartUploads()
  const liveIds = new Set<string>()

  for (const upload of inProgress) {
    const tracked = await kv.get('upload:id:' + upload.key)
    if (tracked === upload.uploadId) {
      liveIds.add(upload.uploadId)
      continue
    }
    const holder = await kv.get('upload:lease:' + upload.key)
    if (holder) {
      log(`skipping ${upload.key}: lease held by ${holder}`)
      liveIds.add(upload.uploadId)
      continue
    }
    await store.abortMultipartUpload(upload.key, upload.uploadId)
    aborted.push(upload.uploadId)
    log(`aborted orphaned upload ${upload.uploadId} for ${upload.key}`)
  }

  for (const idKey of await kv.keys('upload:id:')) {
    const key = idKey.slice('upload:id:'.length)
    const uploadId = await kv.get(idKey)
    if (uploadId && liveIds.has(uploadId)) continue
    const holder = await kv.get('upload:lease:' + key)
    if (holder) continue
    await kv.del('upload:parts:' + key)
    await kv.del('upload:id:' + key)
    clearedTracking.push(key)
    log(`cleared stale tracking for ${key}`)
  }

  return { aborted, clearedTracking }
}

export async function startUploader(
  store: ObjectStore,
  kv: Kv,
  log: (msg: string) => void = console.log,
): Promise<void> {
  const result = await reconcileOrphans(store, kv, log)
  log(`startup reconcile: aborted ${result.aborted.length}, cleared ${result.clearedTracking.length}`)
}
