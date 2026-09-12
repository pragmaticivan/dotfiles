import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  createArguments,
  isSafeToRemove,
  parseList,
  parseSwitch,
  removeArguments,
} from "./worktree.ts"

describe("Worktrunk worktree adapter", () => {
  it("maps Worktrunk inventory to OpenCode entries", () => {
    const output = JSON.stringify({
      schema: 2,
      items: [
        { worktree: { path: "/repo", main: true } },
        { worktree: { path: "/repo/.worktrees/feature-a", main: false } },
        { branch: "without-worktree" },
      ],
    })

    assert.deepEqual(parseList(output), [
      { directory: "/repo", type: "root" },
      { directory: "/repo/.worktrees/feature-a", type: "worktree" },
    ])
  })

  it("reads the path returned by Worktrunk switch", () => {
    assert.equal(
      parseSwitch('{"action":"created","branch":"feature-a","path":"/repo/.worktrees/feature-a"}'),
      "/repo/.worktrees/feature-a",
    )
  })

  it("creates a branch through Worktrunk with hooks enabled", () => {
    assert.deepEqual(createArguments({
      sourceDirectory: "/repo",
      suggestedDirectory: "/opencode/worktrees/feature-a",
      branch: "origin/main",
    }), [
      "-C", "/repo", "--config-set", 'worktree-path="/opencode/worktrees/feature-a"',
      "switch", "--create", "feature-a", "--base", "origin/main",
      "--format=json", "--no-cd",
    ])
  })

  it("starts from the active checkout when OpenCode does not supply a ref", () => {
    assert.deepEqual(createArguments({
      sourceDirectory: "/repo/.worktrees/current",
      suggestedDirectory: "/opencode/worktrees/feature-b",
    }), [
      "-C", "/repo/.worktrees/current", "--config-set", 'worktree-path="/opencode/worktrees/feature-b"',
      "switch", "--create", "feature-b", "--base", "@", "--format=json", "--no-cd",
    ])
  })

  it("removes a worktree through Worktrunk without deleting unmerged work", () => {
    assert.deepEqual(removeArguments({ directory: "/repo/.worktrees/feature-a", force: false }), [
      "-C", "/repo/.worktrees/feature-a", "remove", "/repo/.worktrees/feature-a",
      "--foreground", "--reap", "--format=json",
    ])
  })

  it("passes only worktree force when OpenCode confirms data loss", () => {
    assert.deepEqual(removeArguments({ directory: "/repo/.worktrees/feature-a", force: true }), [
      "-C", "/repo/.worktrees/feature-a", "remove", "/repo/.worktrees/feature-a",
      "--foreground", "--reap", "--format=json", "--force",
    ])
  })

  it("allows automatic removal only for clean integrated worktrees", () => {
    const output = JSON.stringify({
      schema: 2,
      items: [{
        worktree: {
          path: "/repo/.worktrees/feature-a",
          main: false,
          changes: {
            staged: false,
            modified: false,
            untracked: false,
            renamed: false,
            deleted: false,
            conflicted: false,
          },
        },
        display: { state: "integrated" },
      }],
    })

    assert.equal(isSafeToRemove(output, "/repo/.worktrees/feature-a"), true)
  })

  it("keeps worktrees with changes or unmerged commits", () => {
    const dirty = JSON.stringify({
      schema: 2,
      items: [{
        worktree: {
          path: "/repo/.worktrees/feature-a",
          main: false,
          changes: { modified: true },
        },
        display: { state: "same_commit" },
      }],
    })
    const ahead = JSON.stringify({
      schema: 2,
      items: [{
        worktree: {
          path: "/repo/.worktrees/feature-a",
          main: false,
          changes: {},
        },
        display: { state: "ahead" },
      }],
    })

    assert.equal(isSafeToRemove(dirty, "/repo/.worktrees/feature-a"), false)
    assert.equal(isSafeToRemove(ahead, "/repo/.worktrees/feature-a"), false)
  })
})
