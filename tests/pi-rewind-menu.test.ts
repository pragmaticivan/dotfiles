import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  rewindMenuIndexAtRow,
  renderRewindMenu,
  type RewindMenuItem,
} from "../home/dot_pi/agent/extensions/open-tui-opencode/rewind-menu.ts"

const items: readonly RewindMenuItem[] = [
  { value: "all", label: "Revert", description: "undo messages and file changes" },
  { value: "messages", label: "Revert messages", description: "keep file changes" },
  { value: "files", label: "Restore changes", description: "keep messages" },
]

function plain(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "")
}

describe("OpenCode rewind menu", () => {
  it("renders a compact panel with aligned action descriptions", () => {
    const lines = renderRewindMenu(items, 0, 62)
    const text = lines.map(plain)

    assert.equal(lines.length, 7)
    assert.ok(text.every((line) => line.length === 62))
    assert.match(text[1], /Message Actions\s+esc/)
    assert.match(text[3], /Revert\s+undo messages and file changes/)
    assert.match(text[4], /Revert messages\s+keep file changes/)
  })

  it("maps only action rows to menu items", () => {
    assert.equal(rewindMenuIndexAtRow(1, items.length), undefined)
    assert.equal(rewindMenuIndexAtRow(2, items.length), 0)
    assert.equal(rewindMenuIndexAtRow(4, items.length), 2)
    assert.equal(rewindMenuIndexAtRow(5, items.length), undefined)
  })

  it("keeps every row inside a narrow terminal", () => {
    const text = renderRewindMenu(items, 1, 20).map(plain)

    assert.ok(text.every((line) => line.length === 20))
  })
})
