import { postToSlack } from './slack.ts'

export interface NotificationChannel {
  send(msg: string): Promise<void>
}

export class SlackChannel implements NotificationChannel {
  async send(msg: string) { await postToSlack(msg) }
}

export class NotificationChannelFactory {
  static create(kind: string): NotificationChannel {
    if (kind === 'slack') return new SlackChannel()
    throw new Error('Invalid input')
  }
}

export class NotificationService {
  constructor(private channel: NotificationChannel) {}
  async notify(msg: string) { await this.channel.send(msg) }
}
