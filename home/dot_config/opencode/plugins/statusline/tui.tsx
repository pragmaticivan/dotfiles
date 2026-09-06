import { Plugin, usePlugin } from "@opencode-ai/plugin/tui"
import { For, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import {
  contextBar,
  contextPercent,
  contextUsed,
  formatCost,
  formatDuration,
  formatTokens,
  prettyModel,
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

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean)
  return parts[parts.length - 1] ?? ""
}

function StatusLine(props: Props) {
  const ctx = usePlugin()
  const location = ctx.location ?? ctx.data.location.default()

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

    if (location?.directory) add({ text: truncate(basename(location.directory), 24), fg: color.lavender })
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

export default Plugin.define({
  id: "statusline",
  setup(ctx) {
    return ctx.ui.slot({
      replace: "prompt.footer",
      render: (input) => (
        <StatusLine sessionID={input.sessionID} mode={input.mode} showDetails={input.showDetails} />
      ),
    })
  },
})
