export const color = {
  mauve: "#c6a0f6",
  blue: "#8aadf4",
  lavender: "#b7bdf8",
  teal: "#8bd5ca",
  green: "#a6da95",
  yellow: "#eed49f",
  peach: "#f5a97f",
  red: "#ed8796",
  pink: "#f5bde6",
  text: "#cad3f5",
  overlay: "#6e738d",
  panel: "#1e2030",
  element: "#181926",
} satisfies Readonly<Record<string, string>>

export type StatusToken = {
  readonly text: string
  readonly fg: string
  readonly bold?: boolean
}

export type CheckoutLabel =
  | { readonly kind: "root"; readonly name: string }
  | { readonly kind: "worktree"; readonly name: string }

export type StatusSnapshot = {
  readonly running: boolean
  readonly model: string
  readonly context?: { readonly used: number; readonly limit: number }
  readonly cost: number
  readonly turns: number
  readonly elapsedMs: number
  readonly agent?: string
  readonly permissions: number
  readonly subagents: number
  readonly checkout?: CheckoutLabel
  readonly branch?: string
  readonly showDetails: boolean
}

function normalizedPath(path: string): string {
  return path.replace(/\/+$/, "") || "/"
}

function basename(path: string): string {
  return normalizedPath(path).split("/").filter(Boolean).at(-1) ?? "/"
}

export function checkoutLabel(projectDirectory: string, canonicalDirectory: string): CheckoutLabel {
  const project = normalizedPath(projectDirectory)
  const canonical = normalizedPath(canonicalDirectory)
  return { kind: project === canonical ? "root" : "worktree", name: basename(project) }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  if (max <= 1) return "…"
  return `${value.slice(0, max - 1)}…`
}

function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0"
  if (value < 1_000) return String(Math.round(value))
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)}k`
  return `${(value / 1_000_000).toFixed(1)}M`
}

function formatCost(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0.001) return ""
  return usd < 0.01 ? `$${usd.toFixed(3)}` : `$${usd.toFixed(2)}`
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 5_000) return ""
  const seconds = Math.floor(ms / 1_000)
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m`
  return `${Math.floor(seconds / 3_600)}h${String(Math.floor((seconds % 3_600) / 60)).padStart(2, "0")}m`
}

function prettyModel(raw: string): string {
  const id = raw.toLowerCase()
  const family = /opus/.test(id) ? "Opus" : /sonnet/.test(id) ? "Sonnet" : /haiku/.test(id) ? "Haiku" : ""
  if (!family) return raw

  let version = ""
  if (/4[-_.]5/.test(id)) version = " 4.5"
  else if (/3[-_.]5/.test(id)) version = " 3.5"
  else if (/(?:^|[^0-9])4(?:[^0-9]|$)/.test(id)) version = " 4"
  else if (/(?:^|[^0-9])3(?:[^0-9]|$)/.test(id)) version = " 3"
  return version ? family + version : raw
}

export type ContextBar = {
  readonly filled: string
  readonly empty: string
  readonly tone: string
  readonly bold: boolean
}

const partial = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"]

function contextTone(percent: number): string {
  if (percent >= 90) return color.red
  if (percent >= 75) return color.peach
  if (percent >= 50) return color.yellow
  return color.green
}

export function contextBar(used: number, limit: number, width = 8): ContextBar {
  const cap = limit > 0 ? limit : 200_000
  const percent = clamp(Math.floor((used / cap) * 100), 0, 100)
  if (used >= cap || percent >= 95) {
    return { filled: "█".repeat(width), empty: "", tone: color.red, bold: true }
  }

  const eighths = clamp(Math.round((percent * width * 8) / 100), 0, width * 8)
  const full = Math.floor(eighths / 8)
  const fraction = eighths % 8
  const filledCount = fraction > 0 ? full + 1 : full
  return {
    filled: "█".repeat(full) + (partial[fraction] ?? ""),
    empty: "░".repeat(Math.max(0, width - filledCount)),
    tone: contextTone(percent),
    bold: percent >= 75,
  }
}

function contextPercent(used: number, limit: number): number {
  return clamp(Math.floor((used / (limit > 0 ? limit : 200_000)) * 100), 0, 100)
}

export function buildStatusTokens(snapshot: StatusSnapshot): StatusToken[] {
  const out: StatusToken[] = [{
    text: snapshot.running ? "●" : "○",
    fg: snapshot.running ? color.green : color.overlay,
    bold: snapshot.running,
  }]
  const add = (...tokens: readonly StatusToken[]) => {
    const visible = tokens.filter((token) => token.text.length > 0)
    if (visible.length > 0) out.push({ text: " │ ", fg: color.overlay }, ...visible)
  }

  const model = prettyModel(snapshot.model)
  if (model) add({ text: model, fg: color.mauve, bold: true })
  if (snapshot.context && snapshot.context.used > 0) {
    const { used, limit } = snapshot.context
    const bar = contextBar(used, limit)
    const contextTokens: StatusToken[] = [
      { text: bar.filled, fg: bar.tone, bold: bar.bold },
      { text: bar.empty, fg: color.overlay },
      used >= limit && limit > 0
        ? { text: ` ${formatTokens(limit)}+`, fg: color.red, bold: true }
        : { text: ` ${contextPercent(used, limit)}%`, fg: color.text },
    ]
    if (snapshot.showDetails) contextTokens.push({ text: ` ${formatTokens(used)}`, fg: color.overlay })
    add(...contextTokens)
  }

  add({ text: formatCost(snapshot.cost), fg: color.yellow })
  if (snapshot.showDetails && snapshot.turns > 0) add({ text: `${snapshot.turns}t`, fg: color.overlay })
  add({ text: formatDuration(snapshot.elapsedMs), fg: color.overlay })
  if (snapshot.agent) add({ text: `⊕ ${truncate(snapshot.agent, 16)}`, fg: color.teal })
  if (snapshot.permissions > 0) {
    add({
      text: `⚠ ${snapshot.permissions} permission${snapshot.permissions > 1 ? "s" : ""}`,
      fg: color.peach,
      bold: true,
    })
  }
  if (snapshot.subagents > 0) add({ text: `⊕ ${snapshot.subagents} sub`, fg: color.teal })
  if (snapshot.checkout?.kind === "worktree") {
    add({ text: `wt ${truncate(snapshot.checkout.name, 24)}`, fg: color.pink, bold: true })
  } else if (snapshot.checkout) {
    add({ text: truncate(snapshot.checkout.name, 24), fg: color.lavender })
  }
  if (snapshot.branch && snapshot.branch !== "HEAD") {
    add({ text: `⎇ ${truncate(snapshot.branch, 24)}`, fg: color.blue })
  }
  return out
}
