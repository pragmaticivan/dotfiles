import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildStatusTokens,
  checkoutLabel,
  contextBar,
} from "../home/dot_pi/agent/extensions/open-tui-opencode/format.ts"
import {
  indentTranscriptLines,
  styleUserMessageLines,
} from "../home/dot_pi/agent/extensions/open-tui-opencode/messages.ts"
import { editorBodyLines } from "../home/dot_pi/agent/extensions/open-tui-opencode/editor-frame.ts"
import { background } from "../home/dot_pi/agent/extensions/open-tui-opencode/ansi.ts"
import { replaceBackgroundColor } from "../home/dot_pi/agent/extensions/open-tui-opencode/hover.ts"
import {
  buildSidebarRows,
  type SidebarSnapshot,
} from "../home/dot_pi/agent/extensions/open-tui-opencode/sidebar-layout.ts"
import { connectedMcpNames } from "../home/dot_pi/agent/extensions/open-tui-opencode/mcp-status.ts"

describe("Open TUI OpenCode status line", () => {
  it("renders one compact row in OpenCode order", () => {
    const tokens = buildStatusTokens({
      running: false,
      model: "GPT-5.6 Sol",
      context: { used: 20_000, limit: 272_000 },
      cost: 0.102,
      turns: 1,
      elapsedMs: 63_000,
      permissions: 0,
      subagents: 0,
      checkout: { kind: "root", name: "chezmoi" },
      branch: "feat/opencode-work",
      showDetails: false,
    })

    assert.equal(
      tokens.map((token) => token.text).join(""),
      "○ │ GPT-5.6 Sol │ ▌░░░░░░░ 7% │ $0.10 │ 1m │ chezmoi │ ⎇ feat/opencode-work",
    )
  })

  it("adds detailed context and turns only in details mode", () => {
    const tokens = buildStatusTokens({
      running: true,
      model: "claude-sonnet-4-5",
      context: { used: 100_000, limit: 200_000 },
      cost: 1.25,
      turns: 4,
      elapsedMs: 125_000,
      permissions: 2,
      subagents: 3,
      checkout: { kind: "worktree", name: "feature-a" },
      branch: "feature/status",
      showDetails: true,
    })

    assert.equal(
      tokens.map((token) => token.text).join(""),
      "● │ Sonnet 4.5 │ ████░░░░ 50% 100.0k │ $1.25 │ 4t │ 2m │ ⚠ 2 permissions │ ⊕ 3 sub │ wt feature-a │ ⎇ feature/status",
    )
  })

  it("uses fractional context cells and detects worktrees", () => {
    assert.deepEqual(contextBar(20_000, 272_000), {
      filled: "▌",
      empty: "░░░░░░░",
      tone: "#a6da95",
      bold: false,
    })
    assert.deepEqual(checkoutLabel("/code/worktrees/feature-a", "/code/project"), {
      kind: "worktree",
      name: "feature-a",
    })
  })
})

describe("Open TUI OpenCode transcript", () => {
  it("adds the OpenCode rail and panel inset to user messages", () => {
    assert.deepEqual(
      styleUserMessageLines(["one", "two"], "<rail>", "<inset>"),
      ["<rail><inset>one", "<rail><inset>two"],
    )
  })

  it("keeps terminal prompt markers before the user-message rail", () => {
    const marker = "\u001b]133;A\u0007"
    assert.deepEqual(
      styleUserMessageLines([`${marker}one`], "<rail>", "<inset>"),
      [`${marker}<rail><inset>one`],
    )
  })

  it("indents assistant and tool lines without moving terminal markers", () => {
    const marker = "\u001b]133;A\u0007"
    assert.deepEqual(indentTranscriptLines([`${marker}one`, "two"], "   "), [
      `${marker}   one`,
      "   two",
    ])
  })

  it("replaces the user-message panel color during hover", () => {
    assert.equal(
      replaceBackgroundColor("\u001b[48;2;30;32;48mmessage", "#1e2030", "#181926"),
      "\u001b[48;2;24;25;38mmessage",
    )
  })
})

describe("Open TUI OpenCode editor", () => {
  it("restores the input background after the software cursor reset", () => {
    const rendered = background("#181926", "\u001b[7m \u001b[0mrest")
    assert.match(rendered, /\u001b\[0m\u001b\[48;2;24;25;38mrest/)
  })

  it("replaces Pi borders with OpenCode prompt spacing", () => {
    assert.deepEqual(editorBodyLines(["────", "hello", "────"], "Build · GPT-5.6 Sol · medium"), {
      panel: ["", "", "hello", "", "Build · GPT-5.6 Sol · medium"],
      autocomplete: [],
    })
  })

  it("keeps autocomplete rows outside the prompt panel", () => {
    assert.deepEqual(editorBodyLines(["────", "hello", "────", "one", "two"], "Build"), {
      panel: ["", "", "hello", "", "Build"],
      autocomplete: ["one", "two"],
    })
  })
})

describe("Open TUI OpenCode sidebar", () => {
  const snapshot: SidebarSnapshot = {
    model: "gpt-5.6-sol",
    provider: "openai-codex",
    thinking: "medium",
    turns: 3,
    streaming: false,
    lastTool: "read",
    context: { used: 22_900, limit: 272_000 },
    mcps: ["context7", "grafana", "playwright", "posthog"],
    git: {
      branch: "feat/opencode-worktrunk",
      changedFiles: 1,
      insertions: 2,
      deletions: 0,
      files: [{ code: "??", path: "home/dot_pi/", untracked: true }],
    },
    location: "/code/chezmoi",
    checkout: {
      kind: "root",
      name: "chezmoi",
      branch: "feat/opencode-worktrunk",
      base: "main",
      path: ".",
    },
  }

  it("uses OpenCode section spacing and content order", () => {
    const text = buildSidebarRows(snapshot, 30).map((row) => row.map((run) => run.text).join(""))
    assert.deepEqual(text.slice(0, 16), [
      "",
      "Model",
      "gpt-5.6-sol • medium",
      "openai-codex",
      "turns 3",
      "last tool read",
      "",
      "Context",
      "8% • 22.9k of 272.0k",
      "",
      "▼ MCP",
      "• context7                 Connected",
      "• grafana                  Connected",
      "• playwright               Connected",
      "• posthog                  Connected",
      "",
    ])
  })

  it("anchors checkout details above the bottom padding", () => {
    const text = buildSidebarRows(snapshot, 30).map((row) => row.map((run) => run.text).join(""))
    assert.deepEqual(text.slice(-6), [
      "CHECKOUT",
      "checkout chezmoi",
      "branch   feat/opencode-worktrunk",
      "base     main",
      "path     .",
      "",
    ])
  })

  it("keeps git state visible when a file path is long", () => {
    const text = buildSidebarRows(snapshot, 30, 16).map((row) => row.map((run) => run.text).join(""))
    assert.ok(text.includes("?? home/dot… new"))
  })

  it("shows an empty MCP state after Pi reports no connections", () => {
    const text = buildSidebarRows({ ...snapshot, mcps: [] }, 30)
      .map((row) => row.map((run) => run.text).join(""))
    assert.ok(text.includes("No connected servers"))
  })

  it("lists only MCP servers that Pi reports as connected", () => {
    assert.deepEqual(connectedMcpNames({
      version: 1,
      servers: [
        { name: "context7", status: "connected" },
        { name: "playwright", status: "cached" },
        { name: "posthog", status: "needs-auth" },
      ],
    }), ["context7"])
  })
})
