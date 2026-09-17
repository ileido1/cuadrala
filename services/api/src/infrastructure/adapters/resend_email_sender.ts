import { ENV_CONST } from '../../config/env.js';
import type { EmailSender } from '../../domain/ports/email_sender.js';

export class ResendEmailSender implements EmailSender {
  async sendSV(_input: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    if (!ENV_CONST.RESEND_API_KEY || !ENV_CONST.EMAIL_FROM) return;
    const RESPONSE = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ENV_CONST.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: ENV_CONST.EMAIL_FROM,
        to: [_input.to],
        subject: _input.subject,
        text: _input.text,
        html: _input.html,
      }),
    });
    if (!RESPONSE.ok) throw new Error(`Resend email failed with status ${RESPONSE.status}`);
  }
}
