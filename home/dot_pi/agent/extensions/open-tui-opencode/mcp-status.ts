function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function connectedMcpNames(value: unknown): string[] {
  if (!record(value) || value.version !== 1 || !Array.isArray(value.servers)) return []
  const names: string[] = []
  for (const server of value.servers) {
    if (!record(server) || server.status !== "connected" || typeof server.name !== "string") continue
    const name = server.name.replace(/[\u0000-\u001f\u007f]/g, " ").trim()
    if (name) names.push(name)
  }
  return names
}
