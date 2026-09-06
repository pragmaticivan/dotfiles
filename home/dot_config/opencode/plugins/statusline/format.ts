// Pure formatting for the status line. No host imports so it runs in tests.
// Colors are Catppuccin Macchiato, matched to the Claude status line.

export const color = {
  mauve: "#c6a0f6",
  blue: "#8aadf4",
  lavender: "#b7c0f7",
  teal: "#8bd5ca",
  green: "#a6da95",
  yellow: "#eed49f",
  peach: "#f5a97f",
  red: "#ed8796",
  pink: "#f58cae",
  text: "#cad3f5",
  overlay: "#6e738d",
} as const

export const FALLBACK_CONTEXT_LIMIT = 200_000

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  if (max <= 1) return "…"
  return `${value.slice(0, max - 1)}…`
}

export type TokenUsage = {
  input: number
  cache?: { read: number; write: number }
}

// Current context fill. Prefer the last assistant turn. Fall back to session totals.
export function contextUsed(tokens?: TokenUsage): number {
  if (!tokens) return 0
  return tokens.input + (tokens.cache?.read ?? 0) + (tokens.cache?.write ?? 0)
}

export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0"
  if (n < 1000) return String(Math.round(n))
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

export function formatCost(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0.001) return ""
  // Keep cents for normal costs; show an extra digit for tiny costs so they
  // do not round to a misleading $0.00.
  if (usd < 0.01) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 5000) return ""
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  return `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m`
}

// Shorten a provider model name. Anthropic ids place the version before the
// family (claude-3-5-sonnet) or after it (claude-sonnet-4-5), so detect each
// part on its own.
export function prettyModel(raw: string): string {
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
  filled: string
  empty: string
  tone: string
  bold: boolean
}

const PARTIAL = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"]

function toneFor(pct: number): string {
  if (pct >= 90) return color.red
  if (pct >= 75) return color.peach
  if (pct >= 50) return color.yellow
  return color.green
}

// Smooth 8-cell bar with eighth-block partials, about 1.5% resolution.
export function contextBar(used: number, limit: number, width = 8): ContextBar {
  const cap = limit > 0 ? limit : FALLBACK_CONTEXT_LIMIT
  const pct = clamp(Math.floor((used / cap) * 100), 0, 100)

  if (used >= cap || pct >= 95) {
    return { filled: "█".repeat(width), empty: "", tone: color.red, bold: true }
  }

  const eighths = clamp(Math.round((pct * width * 8) / 100), 0, width * 8)
  const full = Math.floor(eighths / 8)
  const partial = eighths % 8
  const filledCount = partial > 0 ? full + 1 : full
  const filled = "█".repeat(full) + PARTIAL[partial]
  const empty = "░".repeat(Math.max(0, width - filledCount))

  return { filled, empty, tone: toneFor(pct), bold: pct >= 75 }
}

export function contextPercent(used: number, limit: number): number {
  const cap = limit > 0 ? limit : FALLBACK_CONTEXT_LIMIT
  return clamp(Math.floor((used / cap) * 100), 0, 100)
}
