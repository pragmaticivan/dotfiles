import path from "node:path"

export type WorktreeEntry = {
  readonly directory: string
  readonly type: "root" | "worktree"
}

type CreateInput = {
  readonly sourceDirectory: string
  readonly suggestedDirectory: string
  readonly branch?: string
}

type RemoveInput = {
  readonly directory: string
  readonly force: boolean
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJson(output: string): unknown {
  return JSON.parse(output)
}

export function parseList(output: string): WorktreeEntry[] {
  const envelope = parseJson(output)
  if (!record(envelope) || envelope.schema !== 2 || !Array.isArray(envelope.items)) {
    throw new Error("Worktrunk returned an unsupported worktree list")
  }

  const entries: WorktreeEntry[] = []
  for (const item of envelope.items) {
    if (!record(item) || !record(item.worktree)) continue
    const worktree = item.worktree
    if (typeof worktree.path !== "string" || typeof worktree.main !== "boolean") {
      throw new Error("Worktrunk returned an invalid worktree entry")
    }
    entries.push({
      directory: worktree.path,
      type: worktree.main ? "root" : "worktree",
    })
  }
  return entries
}

export function parseSwitch(output: string): string {
  const result = parseJson(output)
  if (!record(result) || typeof result.path !== "string" || !result.path) {
    throw new Error("Worktrunk did not return a worktree path")
  }
  return result.path
}

export function createArguments(input: CreateInput): string[] {
  const name = path.basename(path.normalize(input.suggestedDirectory))
  if (!name || name === "." || name === path.parse(input.suggestedDirectory).root) {
    throw new Error("OpenCode did not supply a worktree name")
  }

  const args = [
    "-C",
    input.sourceDirectory,
    "--config-set",
    `worktree-path=${JSON.stringify(input.suggestedDirectory)}`,
    "switch",
    "--create",
    name,
  ]
  args.push("--base", input.branch ?? "@")
  args.push("--format=json", "--no-cd")
  return args
}

export function isSafeToRemove(output: string, directory: string): boolean {
  const envelope = parseJson(output)
  if (!record(envelope) || envelope.schema !== 2 || !Array.isArray(envelope.items)) return false

  const target = path.normalize(directory)
  for (const item of envelope.items) {
    if (!record(item) || !record(item.worktree)) continue
    const worktree = item.worktree
    if (typeof worktree.path !== "string" || path.normalize(worktree.path) !== target) continue
    if (!record(worktree.changes) || !record(item.display)) return false
    const changes = worktree.changes
    const dirty = ["staged", "modified", "untracked", "renamed", "deleted", "conflicted"]
      .some((key) => changes[key] === true)
    return !dirty && (item.display.state === "empty" || item.display.state === "integrated")
  }
  return false
}

export function removeArguments(input: RemoveInput): string[] {
  const args = [
    "-C",
    input.directory,
    "remove",
    input.directory,
    "--foreground",
    "--reap",
    "--format=json",
  ]
  if (input.force) args.push("--force")
  return args
}
