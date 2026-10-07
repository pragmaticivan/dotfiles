import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryKv, MemoryStore } from './memory.ts'
import { LeaseHeldError, reconcileOrphans, uploadObject } from './upload.ts'

const body = new TextEncoder().encode('abcdefghij')
const opts = { workerId: 'w1', partSize: 3, leaseTtlMs: 1000 }

test('uploads every part and completes the object', async () => {
  const store = new MemoryStore()
  const kv = new MemoryKv()
  const result = await uploadObject(store, kv, 'a.bin', body, opts)
  assert.deepEqual(result, { uploadId: 'mpu-1', partsUploaded: 4, partsResumed: 0 })
  assert.equal(new TextDecoder().decode(store.objects.get('a.bin')), 'abcdefghij')
  assert.deepEqual(await kv.keys('upload:'), [])
})

test('a retry after a crash resumes from the recorded parts', async () => {
  const store = new MemoryStore()
  const kv = new MemoryKv()
  store.failOnPart = 3
  await assert.rejects(uploadObject(store, kv, 'a.bin', body, opts), /part 3/)
  const result = await uploadObject(store, kv, 'a.bin', body, opts)
  assert.deepEqual(result, { uploadId: 'mpu-1', partsUploaded: 2, partsResumed: 2 })
  assert.equal(store.partCalls, 5)
  assert.equal(new TextDecoder().decode(store.objects.get('a.bin')), 'abcdefghij')
})

test('a second worker cannot upload while the lease is held', async () => {
  const store = new MemoryStore()
  const kv = new MemoryKv()
  store.failOnPart = 2
  await assert.rejects(uploadObject(store, kv, 'a.bin', body, opts))
  await assert.rejects(uploadObject(store, kv, 'a.bin', body, { ...opts, workerId: 'w2' }), LeaseHeldError)
  kv.now += 1001
  const result = await uploadObject(store, kv, 'a.bin', body, { ...opts, workerId: 'w2' })
  assert.deepEqual(result, { uploadId: 'mpu-1', partsUploaded: 3, partsResumed: 1 })
})

test('startup reconcile aborts untracked uploads and keeps tracked ones', async () => {
  const store = new MemoryStore()
  const kv = new MemoryKv()
  const orphan = await store.createMultipartUpload('lost.bin')
  store.failOnPart = 2
  await assert.rejects(uploadObject(store, kv, 'live.bin', body, opts))
  await kv.set('upload:id:gone.bin', 'mpu-99')
  kv.now += 1001
  const result = await reconcileOrphans(store, kv)
  assert.deepEqual(result, { aborted: [orphan], clearedTracking: ['gone.bin'] })
  assert.deepEqual((await store.listMultipartUploads()).map((u) => u.key), ['live.bin'])
})
