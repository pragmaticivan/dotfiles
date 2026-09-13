import { dirname, resolve } from "node:path"
import type { ExtensionAPI, ExtensionContext, SessionEntry } from "@earendil-works/pi-coding-agent"
import { stripTerminalSequences, truncateToWidth } from "@earendil-works/pi-tui"
import { installTranscriptStyle, supportedPiVersion, supportsTranscriptStyle } from "./compatibility.ts"
import { installEditor } from "./editor.ts"
import { buildStatusTokens, checkoutLabel, type CheckoutLabel, type StatusToken } from "./format.ts"
import { installRewind } from "./rewind.ts"
import { installSidebar } from "./sidebar.ts"

const guardrailsOpened = "guardrails:prompt:opened"
const guardrailsClosed = "guardrails:prompt:closed"
const subagentEvents = ["subagents:created", "subagents:started", "subagents:completed", "subagents:failed"]

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function nestedId(value: unknown, key?: string): string | undefined {
  if (!record(value)) return undefined
  const container = key ? value[key] : value
  if (!record(container)) return undefined
  const id = container.id
  return typeof id === "string" && id.length > 0 ? id : undefined
}

function safeText(value: string): string {
  return stripTerminalSequences(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim()
}

function usageCost(entry: SessionEntry): number {
  if (entry.type === "message") {
    if (entry.message.role !== "assistant" && entry.message.role !== "toolResult") return 0
    return entry.message.usage?.cost.total ?? 0
  }
  if (entry.type === "compaction" || entry.type === "branch_summary") return entry.usage?.cost.total ?? 0
  return 0
}

function sessionCost(entries: readonly SessionEntry[]): number {
  return entries.reduce((total, entry) => {
    const cost = usageCost(entry)
    return Number.isFinite(cost) && cost > 0 ? total + cost : total
  }, 0)
}

function turnCount(entries: readonly SessionEntry[]): number {
  return entries.filter((entry) => entry.type === "message" && entry.message.role === "user").length
}

function sessionAgent(ctx: ExtensionContext): string | undefined {
  if (!ctx.sessionManager.getHeader()?.parentSession) return undefined
  const name = ctx.sessionManager.getSessionName()
  return name ? safeText(name) : undefined
}

function hexSequence(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `\x1b[38;2;${value >> 16};${(value >> 8) & 255};${value & 255}m`
}

function paint(token: StatusToken): string {
  return `${token.bold ? "\x1b[1m" : ""}${hexSequence(token.fg)}${token.text}\x1b[0m`
}

async function detectCheckout(pi: ExtensionAPI, cwd: string): Promise<CheckoutLabel> {
  const rootResult = await pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd })
  const project = rootResult.code === 0 ? safeText(rootResult.stdout) : cwd
  const commonResult = await pi.exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd })
  const canonical = commonResult.code === 0
    ? dirname(resolve(cwd, safeText(commonResult.stdout)))
    : project
  return checkoutLabel(project, canonical)
}

export default function openTuiOpencode(pi: ExtensionAPI): void {
  const rewind = installRewind(pi)
  const cleanupTranscriptStyle = installTranscriptStyle(rewind)
  installSidebar(pi)
  const permissionIds = new Set<string>()
  const subagentIds = new Set<string>()
  const stopEventListeners: Array<() => void> = []
  let checkout: CheckoutLabel | undefined
  let requestRender: (() => void) | undefined
  let cleanupEditor: (() => void) | undefined
  let interval: ReturnType<typeof setInterval> | undefined
  let generation = 0

  const refresh = () => requestRender?.()

  stopEventListeners.push(pi.events.on(guardrailsOpened, (payload) => {
    const id = nestedId(payload, "prompt")
    if (!id) return
    permissionIds.add(id)
    refresh()
  }))
  stopEventListeners.push(pi.events.on(guardrailsClosed, (payload) => {
    const id = nestedId(payload, "prompt")
    if (!id) return
    permissionIds.delete(id)
    refresh()
  }))
  for (const event of subagentEvents) {
    stopEventListeners.push(pi.events.on(event, (payload) => {
      const id = nestedId(payload)
      if (!id) return
      subagentIds.add(id)
      refresh()
    }))
  }

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return

    if (!supportsTranscriptStyle()) {
      ctx.ui.notify(`OpenCode transcript styling needs Pi ${supportedPiVersion}`, "warning")
    }

    const activeGeneration = ++generation
    const timestamp = ctx.sessionManager.getHeader()?.timestamp
    const createdAt = timestamp ? Date.parse(timestamp) || Date.now() : Date.now()
    cleanupEditor = installEditor(pi, ctx)
    ctx.ui.setHeader(undefined)
    ctx.ui.setFooter((tui, _theme, footerData) => {
      requestRender = () => tui.requestRender()
      const stopBranchListener = footerData.onBranchChange(refresh)

      return {
        dispose() {
          stopBranchListener()
          requestRender = undefined
        },
        invalidate() {},
        render(width: number): string[] {
          const context = ctx.getContextUsage()
          const contextSnapshot = !context || context.tokens === null
            ? undefined
            : { used: context.tokens, limit: context.contextWindow }
          const branchValue = footerData.getGitBranch()
          const branch = branchValue && branchValue !== "detached" ? safeText(branchValue) : undefined
          const agent = sessionAgent(ctx)
          const tokens = buildStatusTokens({
            running: !ctx.isIdle(),
            model: safeText(ctx.model?.name || ctx.model?.id || ""),
            cost: sessionCost(ctx.sessionManager.getEntries()),
            turns: turnCount(ctx.sessionManager.getBranch()),
            elapsedMs: Date.now() - createdAt,
            permissions: permissionIds.size,
            subagents: subagentIds.size,
            showDetails: ctx.ui.getToolsExpanded(),
            ...(contextSnapshot ? { context: contextSnapshot } : {}),
            ...(agent ? { agent } : {}),
            ...(checkout ? { checkout } : {}),
            ...(branch ? { branch } : {}),
          })
          return [truncateToWidth(tokens.map(paint).join(""), Math.max(0, width), "")]
        },
      }
    })

    interval = setInterval(refresh, 1_000)
    void detectCheckout(pi, ctx.cwd).then((value) => {
      if (activeGeneration !== generation) return
      checkout = value
      refresh()
    })
  })

  pi.on("agent_start", refresh)
  pi.on("agent_settled", refresh)
  pi.on("turn_start", refresh)
  pi.on("turn_end", refresh)
  pi.on("message_end", refresh)

  pi.on("session_shutdown", () => {
    generation += 1
    if (interval) clearInterval(interval)
    interval = undefined
    cleanupEditor?.()
    cleanupEditor = undefined
    cleanupTranscriptStyle?.()
    requestRender = undefined
    for (const stop of stopEventListeners) stop()
  })
}
