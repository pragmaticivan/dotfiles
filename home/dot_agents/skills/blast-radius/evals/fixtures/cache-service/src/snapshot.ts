import { readFileSync, writeFileSync } from 'node:fs';
import { Cache } from './cache.ts';

// Written on shutdown, read back on boot and by scripts/warm.py.
export function saveSnapshot(cache: Cache, path: string): void {
  writeFileSync(path, JSON.stringify(cache.toJSON()));
}

export function loadSnapshot(path: string): Cache {
  return Cache.fromJSON(JSON.parse(readFileSync(path, 'utf8')));
}
