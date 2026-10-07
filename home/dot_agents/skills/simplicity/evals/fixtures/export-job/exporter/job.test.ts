import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exportOrders } from './job.ts'

test('writes one csv row per order', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'export-'))
  const src = join(dir, 'orders.json')
  await writeFile(src, JSON.stringify([{ id: 'o1', total: 12.5, placedAt: '2026-10-01' }]))
  const count = await exportOrders(src, join(dir, 'orders.csv'))
  assert.equal(count, 1)
  assert.equal(await readFile(join(dir, 'orders.csv'), 'utf8'), 'id,total,placed_at\no1,12.50,2026-10-01\n')
})

test('rejects when the source file is missing', async () => {
  await assert.rejects(exportOrders('/nonexistent/orders.json', '/tmp/x.csv'), /ENOENT/)
})
