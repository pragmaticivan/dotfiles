const osc133Prefix = /^(?:\u001b\]133;[ABC]\u0007)+/

function insertAfterPromptMarker(line: string, prefix: string): string {
  const marker = line.match(osc133Prefix)?.[0] ?? ""
  return `${marker}${prefix}${line.slice(marker.length)}`
}

export function styleUserMessageLines(
  lines: readonly string[],
  rail: string,
  inset: string,
): string[] {
  return lines.map((line) => insertAfterPromptMarker(line, `${rail}${inset}`))
}

export function indentTranscriptLines(lines: readonly string[], indent: string): string[] {
  return lines.map((line) => insertAfterPromptMarker(line, indent))
}
