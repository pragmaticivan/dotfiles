const terminalSequence = /\u001b(?:\[[0-?]*[ -/]*[@-~]|\][^\u0007]*(?:\u0007|\u001b\\))/g

function isBorder(line: string): boolean {
  const text = line.replace(terminalSequence, "")
  return /^[─━]*(?:[↑↓]\s+\d+\s+more)?[─━]*$/.test(text)
}

export type EditorBody = {
  readonly panel: readonly string[]
  readonly autocomplete: readonly string[]
}

export function editorBodyLines(baseLines: readonly string[], metadata: string): EditorBody {
  const bottom = baseLines.findIndex((line, index) => index > 0 && isBorder(line))
  const boundary = bottom === -1 ? baseLines.length : bottom
  const content = baseLines.slice(1, boundary)
  return {
    panel: ["", "", ...content, "", metadata],
    autocomplete: bottom === -1 ? [] : baseLines.slice(bottom + 1),
  }
}
