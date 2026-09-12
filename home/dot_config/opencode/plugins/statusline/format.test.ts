import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { checkoutLabel, relativeCheckoutPath } from "./format.ts"

describe("checkoutLabel", () => {
  it("labels the canonical checkout as the project root", () => {
    assert.deepEqual(checkoutLabel("/code/project", "/code/project"), {
      kind: "root",
      name: "project",
    })
  })

  it("labels another project checkout as a worktree", () => {
    assert.deepEqual(checkoutLabel("/code/worktrees/feature-a", "/code/project"), {
      kind: "worktree",
      name: "feature-a",
    })
  })

  it("ignores trailing path separators", () => {
    assert.deepEqual(checkoutLabel("/code/project/", "/code/project"), {
      kind: "root",
      name: "project",
    })
  })
})

describe("relativeCheckoutPath", () => {
  it("shows the project root as a dot", () => {
    assert.equal(relativeCheckoutPath("/code/project", "/code/project"), ".")
  })

  it("shows a nested worktree relative to the project root", () => {
    assert.equal(
      relativeCheckoutPath("/code/project/.worktrees/feature-a", "/code/project"),
      ".worktrees/feature-a",
    )
  })

  it("keeps an external worktree path absolute", () => {
    assert.equal(relativeCheckoutPath("/tmp/feature-a", "/code/project"), "/tmp/feature-a")
  })
})
