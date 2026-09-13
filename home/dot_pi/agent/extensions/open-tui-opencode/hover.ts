function rgb(hex: string): string {
  const value = Number.parseInt(hex.slice(1), 16)
  return `${value >> 16};${(value >> 8) & 255};${value & 255}`
}

export function replaceBackgroundColor(line: string, from: string, to: string): string {
  return line.replaceAll(`\u001b[48;2;${rgb(from)}m`, `\u001b[48;2;${rgb(to)}m`)
}
