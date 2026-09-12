import path from "node:path"

type WorktreeDirectory = {
  readonly directory: string
  readonly strategy?: string
}

export function findNamedWorktree(
  inventory: readonly WorktreeDirectory[],
  name: string,
): string | undefined {
  return inventory.find((item) =>
    item.strategy === "worktrunk" && path.basename(path.normalize(item.directory)) === name
  )?.directory
}
