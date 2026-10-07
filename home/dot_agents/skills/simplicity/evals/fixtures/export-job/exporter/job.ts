import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

type Order = { id: string; total: number; placedAt: string }

export async function exportOrders(src: string, dest: string): Promise<number> {
  const orders: Order[] = JSON.parse(await readFile(src, 'utf8'))
  const lines = ['id,total,placed_at', ...orders.map((o) => `${o.id},${o.total.toFixed(2)},${o.placedAt}`)]
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, lines.join('\n') + '\n')
  return orders.length
}

async function main() {
  const [src = 'data/orders.json', dest = 'out/orders.csv'] = process.argv.slice(2)
  const count = await exportOrders(src, dest)
  console.log(`exported ${count} orders to ${dest}`)
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
