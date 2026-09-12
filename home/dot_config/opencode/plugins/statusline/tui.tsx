import { Plugin, usePlugin } from "@opencode-ai/plugin/tui"
import { For, createEffect, createMemo, createResource, createSignal, onCleanup } from "solid-js"
import {
  checkoutLabel,
  contextBar,
  contextPercent,
  contextUsed,
  formatCost,
  formatDuration,
  formatTokens,
  prettyModel,
  relativeCheckoutPath,
  truncate,
  color,
  FALLBACK_CONTEXT_LIMIT,
} from "./format.ts"

type Props = {
  sessionID?: string
  mode: "normal" | "shell"
  showDetails: boolean
}

type Token = { text: string; fg: string; bold?: boolean }
type SidebarRow = { label: string; value: string; fg: string; bold?: boolean }

function StatusLine(props: Props) {
  const ctx = usePlugin()
  const location = ctx.location ?? ctx.data.location.default()
  const [checkout] = createResource(
    () => location,
    async (current) => {
      try {
        const info = await ctx.client.location.get({ location: current })
        return checkoutLabel(info.project.directory, info.project.canonical)
      } catch {
        return current.directory ? checkoutLabel(current.directory, current.directory) : undefined
      }
    },
  )

  const [now, setNow] = createSignal(Date.now())
  const timer = setInterval(() => setNow(Date.now()), 1000)
  onCleanup(() => clearInterval(timer))

  createEffect(() => {
    const id = props.sessionID
    if (id) {
      void ctx.data.session.sync(id)
      void ctx.data.session.message.sync(id)
      void ctx.data.session.permission.sync(id)
    }
    void ctx.data.location.model.sync(location)
    void ctx.data.location.vcs.sync(location)
  })

  const tokens = createMemo<Token[]>(() => {
    void now()
    const out: Token[] = []
    const sep = () => {
      if (out.length) out.push({ text: " │ ", fg: color.overlay })
    }
    const add = (...runs: Token[]) => {
      const visible = runs.filter((run) => run.text.length > 0)
      if (!visible.length) return
      sep()
      out.push(...visible)
    }

    const id = props.sessionID
    const session = id ? ctx.data.session.get(id) : undefined

    const running = id ? ctx.data.session.status(id) === "running" : false
    out.push({ text: running ? "●" : "○", fg: running ? color.green : color.overlay, bold: running })

    const modelRef = session?.model
    const modelInfo = modelRef
      ? (ctx.data.location.model.list(location) ?? []).find(
          (m) => m.providerID === modelRef.providerID && m.id === modelRef.id,
        )
      : undefined

    const label = modelRef ? prettyModel(modelInfo?.name || modelRef.id || "") : ""
    if (label) add({ text: label, fg: color.mauve, bold: true })

    if (session) {
      const messages = ctx.data.session.message.list(session.id) ?? []
      let used = 0
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i]
        if (message.type === "assistant") {
          const fill = contextUsed(message.tokens)
          if (fill > 0) {
            used = fill
            break
          }
        }
      }
      if (used === 0) used = contextUsed(session.tokens)
      const turns = messages.filter((m) => m.type === "user").length
      const cap = modelInfo?.limit?.context ?? FALLBACK_CONTEXT_LIMIT

      if (used > 0) {
        const overLimit = used >= cap && cap > 0
        const pct = contextPercent(used, cap)
        const bar = contextBar(used, cap)
        const runs: Token[] = [
          { text: bar.filled, fg: bar.tone, bold: bar.bold },
          { text: bar.empty, fg: color.overlay },
          overLimit
            ? { text: ` ${formatTokens(cap)}+`, fg: color.red, bold: true }
            : { text: ` ${pct}%`, fg: color.text },
        ]
        if (props.showDetails) runs.push({ text: ` ${formatTokens(used)}`, fg: color.overlay })
        add(...runs)
      }

      const cost = formatCost(session.cost ?? 0)
      if (cost) add({ text: cost, fg: color.yellow })

      if (props.showDetails && turns > 0) add({ text: `${turns}t`, fg: color.overlay })
      const duration = formatDuration(now() - session.time.created)
      if (duration) add({ text: duration, fg: color.overlay })

      if (session.agent) add({ text: `⊕ ${truncate(session.agent, 16)}`, fg: color.teal })
    }

    if (id) {
      const perms = ctx.data.session.permission.list(id)?.length ?? 0
      if (perms > 0) add({ text: `⚠ ${perms} permission${perms > 1 ? "s" : ""}`, fg: color.peach, bold: true })

      const subs = (ctx.data.session.list() ?? []).filter((s) => s.parentID === id).length
      if (subs > 0) add({ text: `⊕ ${subs} sub`, fg: color.teal })
    }

    const checkoutInfo = checkout()
    if (checkoutInfo?.kind === "worktree") {
      add({ text: `wt ${truncate(checkoutInfo.name, 24)}`, fg: color.pink, bold: true })
    } else if (checkoutInfo) {
      add({ text: truncate(checkoutInfo.name, 24), fg: color.lavender })
    }
    const branch = ctx.data.location.vcs.info(location)?.branch?.current
    if (branch && branch !== "HEAD") add({ text: `⎇ ${truncate(branch, 24)}`, fg: color.blue })

    return out
  })

  return (
    <box flexDirection="row">
      <For each={tokens()}>{(t) => <text fg={t.fg} bold={t.bold}>{t.text}</text>}</For>
    </box>
  )
}

function CheckoutSidebar(props: { sessionID: string }) {
  const ctx = usePlugin()
  const location = createMemo(() =>
    ctx.data.session.get(props.sessionID)?.location ?? ctx.location ?? ctx.data.location.default()
  )
  const [checkout] = createResource(
    location,
    async (current) => {
      try {
        const info = await ctx.client.location.get({ location: current })
        return {
          label: checkoutLabel(info.project.directory, info.project.canonical),
          path: relativeCheckoutPath(info.project.directory, info.project.canonical),
        }
      } catch {
        return {
          label: checkoutLabel(current.directory, current.directory),
          path: ".",
        }
      }
    },
  )

  createEffect(() => {
    void ctx.data.session.sync(props.sessionID)
    void ctx.data.location.vcs.sync(location())
  })

  const rows = createMemo<SidebarRow[]>(() => {
    const info = checkout()
    if (!info) return []

    const worktree = info.label.kind === "worktree"
    const rows: SidebarRow[] = [{
      label: worktree ? "worktree" : "checkout",
      value: info.label.name,
      fg: worktree ? color.pink : color.lavender,
      bold: worktree,
    }]
    const branch = ctx.data.location.vcs.info(location())?.branch
    if (branch?.current && branch.current !== "HEAD") {
      rows.push({ label: "branch", value: branch.current, fg: color.blue })
    }
    if (branch?.default && branch.default !== branch.current) {
      rows.push({ label: "base", value: branch.default, fg: color.teal })
    }
    rows.push({ label: "path", value: info.path, fg: color.overlay })
    return rows
  })

  return (
    <box flexDirection="column" paddingTop={1}>
      <text fg={color.overlay} bold>CHECKOUT</text>
      <For each={rows()}>{(row) => (
        <box flexDirection="row">
          <text fg={color.overlay}>{row.label.padEnd(9)}</text>
          <text fg={row.fg} bold={row.bold}>{truncate(row.value, 28)}</text>
        </box>
      )}</For>
    </box>
  )
}

export default Plugin.define({
  id: "statusline",
  setup(ctx) {
    const stopStatusLine = ctx.ui.slot({
      replace: "prompt.footer",
      render: (input) => (
        <StatusLine sessionID={input.sessionID} mode={input.mode} showDetails={input.showDetails} />
      ),
    })
    const stopSidebar = ctx.ui.slot({
      before: "sidebar.footer",
      render: (input) => <CheckoutSidebar sessionID={input.sessionID} />,
    })
    return () => {
      stopSidebar()
      stopStatusLine()
    }
  },
})
