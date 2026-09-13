export type SidebarTone =
  | "blue"
  | "green"
  | "lavender"
  | "overlay"
  | "peach"
  | "pink"
  | "red"
  | "teal"
  | "text"
  | "yellow"

export type SidebarRun = {
  readonly text: string
  readonly tone: SidebarTone
  readonly bold?: boolean
}

export type SidebarFile = {
  readonly code: string
  readonly path: string
  readonly added?: number
  readonly removed?: number
  readonly untracked: boolean
}

export type SidebarCheckout = {
  readonly kind: "root" | "worktree"
  readonly name: string
  readonly branch?: string
  readonly base?: string
  readonly path: string
}

export type SidebarSnapshot = {
  readonly model: string
  readonly provider: string
  readonly thinking: string
  readonly turns: number
  readonly streaming: boolean
  readonly lastTool?: string
  readonly context?: { readonly used: number; readonly limit: number }
  readonly mcps?: readonly string[]
  readonly git?: {
    readonly branch?: string
    readonly changedFiles: number
    readonly insertions: number
    readonly deletions: number
    readonly files: readonly SidebarFile[]
  }
  readonly location: string
  readonly checkout?: SidebarCheckout
}

export type SidebarRow = readonly SidebarRun[]

const blank: SidebarRow = []

function row(text: string, tone: SidebarTone = "text", bold = false): SidebarRow {
  return [{ text, tone, ...(bold ? { bold: true } : {}) }]
}

function heading(text: string): SidebarRow {
  return row(text, "text", true)
}

function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0"
  if (value < 1_000) return String(Math.round(value))
  if (value < 1_000_000) return `${(value / 1_000).toFixed(1)}k`
  return `${(value / 1_000_000).toFixed(1)}M`
}

function truncate(value: string, width: number): string {
  if (value.length <= width) return value
  if (width <= 1) return "…"
  return `${value.slice(0, width - 1)}…`
}

function fileRow(file: SidebarFile, width: number): SidebarRow {
  const tone = file.untracked ? "green" : file.code.includes("D") ? "red" : "yellow"
  const suffix = file.untracked
    ? ` new`
    : (file.added ?? 0) > 0 || (file.removed ?? 0) > 0
      ? ` +${file.added ?? 0} -${file.removed ?? 0}`
      : ""
  const pathWidth = Math.max(1, width - 3 - suffix.length)
  const runs: SidebarRun[] = [
    { text: `${file.code.padEnd(2)} `, tone },
    { text: truncate(file.path, pathWidth), tone: "text" },
  ]
  if (file.untracked) {
    runs.push({ text: " new", tone: "green" })
  } else if ((file.added ?? 0) > 0 || (file.removed ?? 0) > 0) {
    runs.push({ text: ` +${file.added ?? 0}`, tone: "green" })
    runs.push({ text: ` -${file.removed ?? 0}`, tone: "red" })
  }
  return runs
}

function checkoutRows(checkout: SidebarCheckout | undefined): SidebarRow[] {
  if (!checkout) return []
  const valueTone = checkout.kind === "worktree" ? "pink" : "lavender"
  const rows: SidebarRow[] = [
    row("CHECKOUT", "overlay", true),
    [
      { text: `${checkout.kind === "worktree" ? "worktree" : "checkout"}`.padEnd(9), tone: "overlay" },
      { text: checkout.name, tone: valueTone, ...(checkout.kind === "worktree" ? { bold: true } : {}) },
    ],
  ]
  if (checkout.branch) {
    rows.push([{ text: "branch".padEnd(9), tone: "overlay" }, { text: checkout.branch, tone: "blue" }])
  }
  if (checkout.base && checkout.base !== checkout.branch) {
    rows.push([{ text: "base".padEnd(9), tone: "overlay" }, { text: checkout.base, tone: "teal" }])
  }
  rows.push([{ text: "path".padEnd(9), tone: "overlay" }, { text: checkout.path, tone: "overlay" }])
  return rows
}

export function buildSidebarRows(snapshot: SidebarSnapshot, height: number, width = 36): SidebarRow[] {
  if (height <= 0) return []

  const top: SidebarRow[] = [
    blank,
    heading("Model"),
    row(`${snapshot.model} • ${snapshot.thinking}`),
    row(snapshot.provider, "overlay"),
    row(`turns ${snapshot.turns}${snapshot.streaming ? " • streaming" : ""}`, "overlay"),
  ]
  if (snapshot.lastTool) top.push(row(`last tool ${snapshot.lastTool}`, "overlay"))

  if (snapshot.context) {
    const { used, limit } = snapshot.context
    const percent = limit > 0 ? Math.min(100, Math.floor((used / limit) * 100)) : 0
    top.push(blank, heading("Context"), row(`${percent}% • ${formatTokens(used)} of ${formatTokens(limit)}`))
  }

  if (snapshot.mcps) {
    top.push(blank, [
      { text: "▼ ", tone: "overlay" },
      { text: "MCP", tone: "text", bold: true },
    ])
    if (snapshot.mcps.length === 0) top.push(row("No connected servers", "overlay"))
    for (const name of snapshot.mcps) {
      const nameWidth = Math.max(1, width - 11)
      top.push([
        { text: "• ", tone: "green" },
        { text: truncate(name, nameWidth).padEnd(nameWidth), tone: "text" },
        { text: "Connected", tone: "overlay" },
      ])
    }
  }

  if (snapshot.git) {
    const git = snapshot.git
    top.push(blank, heading("Git"))
    if (git.branch) top.push(row(git.branch, "pink"))
    top.push([
      { text: `${git.changedFiles} files`, tone: "text" },
      { text: `  +${git.insertions}`, tone: "green" },
      { text: ` -${git.deletions}`, tone: "red" },
    ])
    top.push(...git.files.map((file) => fileRow(file, width)))
  }

  top.push(blank, heading("Location"), row(snapshot.location, "overlay"))

  const bottom = checkoutRows(snapshot.checkout)
  if (bottom.length === 0) return top.slice(0, height)
  if (height <= bottom.length + 1) return bottom.slice(0, height)

  const topLimit = Math.max(0, height - bottom.length - 2)
  const visibleTop = top.slice(0, topLimit)
  const spacer = Array.from({ length: height - visibleTop.length - bottom.length - 1 }, () => blank)
  return [...visibleTop, ...spacer, ...bottom, blank]
}
