export interface EmailSender {
  sendSV(_input: { to: string; subject: string; text: string; html?: string }): Promise<void>;
}
