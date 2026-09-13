import { dirname, relative, resolve } from "node:path"
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent"
import type { Component, OverlayHandle, TUI } from "@earendil-works/pi-tui"
import { stripTerminalSequences, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui"
import { MCP_STATUS_EVENT } from "../../npm/node_modules/pi-mcp-adapter/types.ts"
import { background, bold, foreground } from "./ansi.ts"
import { color } from "./format.ts"
import { connectedMcpNames } from "./mcp-status.ts"
import {
  buildSidebarRows,
  type SidebarCheckout,
  type SidebarFile,
  type SidebarRow,
  type SidebarSnapshot,
  type SidebarTone,
} from "./sidebar-layout.ts"

const sidebarWidth = 40
const sidebarGap = 2
const horizontalPadding = 2

type GitSnapshot = NonNullable<SidebarSnapshot["git"]>

type SidebarData = {
  git?: GitSnapshot
  checkout?: SidebarCheckout
  lastTool?: string
  mcps?: readonly string[]
}

function safeText(value: string): string {
  return stripTerminalSequences(value).replace(/[\u0000-\u001f\u007f]/g, " ").trim()
}

function fill(text: string, width: number): string {
  const content = truncateToWidth(text, Math.max(0, width), "…")
  return `${content}${" ".repeat(Math.max(0, width - visibleWidth(content)))}`
}

function paint(tone: SidebarTone, text: string, strong = false): string {
  const colored = foreground(color[tone], text)
  return strong ? bold(colored) : colored
}

function renderRow(row: SidebarRow, width: number): string {
  const panelWidth = Math.max(1, width - sidebarGap)
  const innerWidth = Math.max(1, panelWidth - horizontalPadding * 2)
  const content = row.map((run) => paint(run.tone, run.text, run.bold)).join("")
  const panel = `${" ".repeat(horizontalPadding)}${fill(content, innerWidth)}${" ".repeat(horizontalPadding)}`
  return `${" ".repeat(sidebarGap)}${background(color.panel, panel)}`
}

function parseShortstat(output: string): Pick<GitSnapshot, "changedFiles" | "insertions" | "deletions"> {
  const changedFiles = Number.parseInt(output.match(/(\d+) files? changed/)?.[1] ?? "0", 10)
  const insertions = Number.parseInt(output.match(/(\d+) insertions?\(\+\)/)?.[1] ?? "0", 10)
  const deletions = Number.parseInt(output.match(/(\d+) deletions?\(-\)/)?.[1] ?? "0", 10)
  return { changedFiles, insertions, deletions }
}

function parseNumstat(output: string): Map<string, { readonly added: number; readonly removed: number }> {
  const changes = new Map<string, { readonly added: number; readonly removed: number }>()
  for (const line of output.split("\n")) {
    const [added, removed, path] = line.split("\t")
    if (!path) continue
    changes.set(path, {
      added: added === "-" ? 0 : Number.parseInt(added ?? "0", 10),
      removed: removed === "-" ? 0 : Number.parseInt(removed ?? "0", 10),
    })
  }
  return changes
}

function parseFiles(status: string, numstat: string): SidebarFile[] {
  const changes = parseNumstat(numstat)
  return status.split("\n").filter(Boolean).map((line) => {
    const code = line.slice(0, 2).trim() || "M"
    const path = safeText(line.slice(3))
    const delta = changes.get(path)
    return {
      code,
      path,
      untracked: code.includes("?"),
      ...(delta ? delta : {}),
    }
  })
}

async function refreshData(pi: ExtensionAPI, cwd: string): Promise<SidebarData> {
  const [root, common, branch, base, stat, status, numstat] = await Promise.all([
    pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd }),
    pi.exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd }),
    pi.exec("git", ["branch", "--show-current"], { cwd }),
    pi.exec("git", ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"], { cwd }),
    pi.exec("git", ["diff", "--shortstat", "HEAD", "--"], { cwd }),
    pi.exec("git", ["status", "--porcelain=v1"], { cwd }),
    pi.exec("git", ["diff", "--numstat", "HEAD", "--"], { cwd }),
  ])

  if (root.code !== 0) return {}
  const project = safeText(root.stdout)
  const canonical = common.code === 0 ? dirname(resolve(cwd, safeText(common.stdout))) : project
  const currentBranch = safeText(branch.stdout) || undefined
  const defaultBranch = safeText(base.stdout).replace(/^origin\//, "") || undefined
  const relativePath = project === canonical ? "." : relative(canonical, project) || "."
  const checkout: SidebarCheckout = {
    kind: project === canonical ? "root" : "worktree",
    name: project.split("/").filter(Boolean).at(-1) ?? "/",
    path: relativePath,
    ...(currentBranch ? { branch: currentBranch } : {}),
    ...(defaultBranch ? { base: defaultBranch } : {}),
  }
  const stats = parseShortstat(stat.stdout)
  return {
    checkout,
    git: {
      ...stats,
      ...(currentBranch ? { branch: currentBranch } : {}),
      files: parseFiles(status.stdout, numstat.stdout),
    },
  }
}

function turnCount(ctx: ExtensionContext): number {
  return ctx.sessionManager.getBranch()
    .filter((entry) => entry.type === "message" && entry.message.role === "user").length
}

function snapshot(ctx: ExtensionContext, pi: ExtensionAPI, data: SidebarData): SidebarSnapshot {
  const usage = ctx.getContextUsage()
  const context = usage?.tokens === null || usage === undefined
    ? undefined
    : { used: usage.tokens, limit: usage.contextWindow }
  return {
    model: safeText(ctx.model?.id || ctx.model?.name || "no model"),
    provider: safeText(ctx.model?.provider || ""),
    thinking: pi.getThinkingLevel(),
    turns: turnCount(ctx),
    streaming: !ctx.isIdle(),
    location: safeText(ctx.cwd),
    ...(data.lastTool ? { lastTool: data.lastTool } : {}),
    ...(data.mcps ? { mcps: data.mcps } : {}),
    ...(context ? { context } : {}),
    ...(data.git ? { git: data.git } : {}),
    ...(data.checkout ? { checkout: data.checkout } : {}),
  }
}

class OpenCodeSidebar implements Component {
  constructor(
    private readonly tui: TUI,
    private readonly getSnapshot: () => SidebarSnapshot | undefined,
  ) {}

  invalidate(): void {}

  render(width: number): string[] {
    const current = this.getSnapshot()
    if (!current) return []
    const innerWidth = Math.max(1, width - sidebarGap - horizontalPadding * 2)
    return buildSidebarRows(current, this.tui.terminal.rows, innerWidth)
      .map((row) => renderRow(row, width))
  }
}

export function installSidebar(pi: ExtensionAPI): void {
  let ctx: ExtensionContext | undefined
  let tui: TUI | undefined
  let component: OpenCodeSidebar | undefined
  let overlay: OverlayHandle | undefined
  let data: SidebarData = {}
  let view: SidebarSnapshot | undefined
  let visible = true
  let refreshing = false

  const requestRender = () => {
    component?.invalidate()
    tui?.requestRender()
  }

  const refresh = async () => {
    if (!ctx || refreshing) return
    const cwd = ctx.cwd
    refreshing = true
    const lastTool = data.lastTool
    const mcps = data.mcps
    try {
      data = {
        ...await refreshData(pi, cwd),
        ...(lastTool ? { lastTool } : {}),
        ...(mcps ? { mcps } : {}),
      }
    } finally {
      refreshing = false
      if (view) {
        view = {
          ...view,
          ...(data.git ? { git: data.git } : {}),
          ...(data.checkout ? { checkout: data.checkout } : {}),
        }
      }
      requestRender()
    }
  }

  const updateView = (current: ExtensionContext) => {
    ctx = current
    view = snapshot(current, pi, data)
    requestRender()
  }

  const setVisible = (next: boolean) => {
    visible = next
    overlay?.setHidden(!visible)
    requestRender()
  }

  const start = (current: ExtensionContext) => {
    updateView(current)
    if (!current.hasUI || component) return
    void refresh()
    void current.ui.custom<void>((currentTui, _theme, _keybindings, done) => {
      tui = currentTui
      component = new OpenCodeSidebar(currentTui, () => view)
      return {
        dispose() {
          component = undefined
          tui = undefined
          done()
        },
        render: (width: number) => component?.render(width) ?? [],
        invalidate: () => component?.invalidate(),
      }
    }, {
      overlay: true,
      overlayOptions: {
        anchor: "top-right",
        width: sidebarWidth + sidebarGap,
        maxHeight: "100%",
        margin: { top: 0, right: 0, bottom: 0 },
        nonCapturing: true,
        visible: (terminalWidth: number) => terminalWidth >= 121,
      },
      onHandle(handle) {
        overlay = handle
        handle.unfocus()
        handle.setHidden(!visible)
      },
    })
  }

  pi.on("session_start", (_event, current) => start(current))
  pi.on("session_shutdown", () => {
    overlay?.hide()
    overlay = undefined
    ctx = undefined
    view = undefined
  })
  pi.on("turn_start", (_event, current) => {
    updateView(current)
  })
  pi.on("turn_end", (_event, current) => {
    updateView(current)
    void refresh()
  })
  pi.on("tool_execution_start", (event: { toolName: string }, current) => {
    data = { ...data, lastTool: safeText(event.toolName) }
    updateView(current)
  })
  pi.on("model_select", (_event, current) => {
    updateView(current)
  })
  pi.events.on(MCP_STATUS_EVENT, (status) => {
    data = { ...data, mcps: connectedMcpNames(status) }
    if (view) view = { ...view, mcps: data.mcps ?? [] }
    requestRender()
  })

  pi.registerCommand("sidebar", {
    description: "Show or hide the OpenCode sidebar",
    handler: async (args, current) => {
      start(current)
      const action = args.trim().toLowerCase()
      if (action === "on") setVisible(true)
      else if (action === "off") setVisible(false)
      else if (action === "refresh") await refresh()
      else if (action === "" || action === "toggle") setVisible(!visible)
      else current.ui.notify(`Unknown sidebar option: ${action}`, "warning")
    },
  })
  pi.registerShortcut("ctrl+shift+s", {
    description: "Show or hide the OpenCode sidebar",
    handler: async (current) => {
      start(current)
      setVisible(!visible)
    },
  })
}
