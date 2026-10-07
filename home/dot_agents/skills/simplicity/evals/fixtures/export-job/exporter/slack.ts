export async function postToSlack(text: string): Promise<void> {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) {
    console.error(`[slack] SLACK_WEBHOOK_URL not set, message: ${text}`)
    return
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ channel: '#data-ops', text }),
  })
  if (!res.ok) throw new Error(`slack webhook returned ${res.status}`)
}
