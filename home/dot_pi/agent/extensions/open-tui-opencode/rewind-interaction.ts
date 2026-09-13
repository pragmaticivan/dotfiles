export type MessageTarget = {
  readonly id: string
  readonly parentId: string | null
  readonly text: string
  readonly timestamp: number
}

export type RewindAction = "all" | "files" | "messages"

export type RewindPlan =
  | { readonly restoreFiles: true }
  | {
      readonly navigateTo: string
      readonly restoreFiles: boolean
      readonly editorText: string
    }

export class MessageTargetIndex {
  private entries: readonly MessageTarget[] = []
  private assignments = new WeakMap<object, MessageTarget>()
  private claimed = new Set<string>()

  setEntries(entries: readonly MessageTarget[]): void {
    this.entries = entries
    this.assignments = new WeakMap()
    this.claimed = new Set()
  }

  targetFor(component: object, text: string): MessageTarget | undefined {
    const existing = this.assignments.get(component)
    if (existing) return existing

    const target = this.entries.find((entry) => entry.text === text && !this.claimed.has(entry.id))
    if (!target) return undefined
    this.assignments.set(component, target)
    this.claimed.add(target.id)
    return target
  }
}

export function messageTargetLabels(targets: readonly MessageTarget[]): string[] {
  const totals = new Map<string, number>()
  const seen = new Map<string, number>()
  for (const target of targets) totals.set(target.text, (totals.get(target.text) ?? 0) + 1)
  return targets.map((target) => {
    if (totals.get(target.text) === 1) return target.text
    const occurrence = (seen.get(target.text) ?? 0) + 1
    seen.set(target.text, occurrence)
    return `${target.text} · ${occurrence}`
  })
}

export function rewindPlan(
  action: RewindAction,
  target: MessageTarget,
  checkpointAvailable: boolean,
): RewindPlan | undefined {
  if (action === "files") return checkpointAvailable ? { restoreFiles: true } : undefined
  if (!target.parentId) return undefined
  if (action === "all" && !checkpointAvailable) return undefined
  return {
    navigateTo: target.parentId,
    restoreFiles: action === "all",
    editorText: target.text,
  }
}
