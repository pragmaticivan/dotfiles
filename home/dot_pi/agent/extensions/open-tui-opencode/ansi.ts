function rgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `${value >> 16};${(value >> 8) & 255};${value & 255}`
}

export function foreground(hex: string, text: string): string {
  return `\u001b[38;2;${rgb(hex)}m${text}\u001b[39m`
}

export function background(hex: string, text: string): string {
  const start = `\u001b[48;2;${rgb(hex)}m`
  const content = text.replace(/\u001b\[(?:0|49)m/g, (reset) => `${reset}${start}`)
  return `${start}${content}\u001b[49m`
}

export function bold(text: string): string {
  return `\u001b[1m${text}\u001b[22m`
}
