import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  MessageTargetIndex,
  messageTargetLabels,
  rewindPlan,
  type MessageTarget,
} from "../home/dot_pi/agent/extensions/open-tui-opencode/rewind-interaction.ts"

const targets: readonly MessageTarget[] = [
  { id: "first", parentId: "root", text: "repeat", timestamp: 100 },
  { id: "second", parentId: "first-answer", text: "repeat", timestamp: 200 },
]

describe("OpenCode message rewind interaction", () => {
  it("maps duplicate prompts to session entries in transcript order", () => {
    const index = new MessageTargetIndex()
    const firstComponent = {}
    const secondComponent = {}
    index.setEntries(targets)

    assert.equal(index.targetFor(firstComponent, "repeat")?.id, "first")
    assert.equal(index.targetFor(secondComponent, "repeat")?.id, "second")
    assert.equal(index.targetFor(firstComponent, "repeat")?.id, "first")
  })

  it("rebuilds component assignments when the session branch changes", () => {
    const index = new MessageTargetIndex()
    index.setEntries(targets)
    assert.equal(index.targetFor({}, "repeat")?.id, "first")

    index.setEntries([targets[1]])
    assert.equal(index.targetFor({}, "repeat")?.id, "second")
  })

  it("gives duplicate prompts distinct picker labels", () => {
    const labels = messageTargetLabels(targets)

    assert.equal(new Set(labels).size, 2)
    assert.match(labels[0], /repeat/)
    assert.match(labels[1], /repeat/)
  })

  it("rewinds messages to the parent and returns the prompt to the editor", () => {
    assert.deepEqual(rewindPlan("messages", targets[1], true), {
      navigateTo: "first-answer",
      restoreFiles: false,
      editorText: "repeat",
    })
  })

  it("restores files without changing the conversation", () => {
    assert.deepEqual(rewindPlan("files", targets[1], true), {
      restoreFiles: true,
    })
  })

  it("does not offer a file restore without a checkpoint", () => {
    assert.equal(rewindPlan("all", targets[1], false), undefined)
  })
})
