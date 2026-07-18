import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'

@Injectable()
export class PasswordResetMailerService {
  private readonly logger = new Logger(PasswordResetMailerService.name)

  async sendPasswordReset(input: { email: string; name: string; resetUrl: string }) {
    const apiKey = process.env.BREVO_API_KEY
    const sendUrl = process.env.BREVO_SEND_URL ?? 'https://api.brevo.com/v3/smtp/email'
    const senderEmail = process.env.DEFAULT_SENDER_EMAIL
    const senderName = process.env.DEFAULT_SENDER_NAME ?? 'PIKORUA'

    if (!apiKey || !senderEmail) {
      this.logger.error('Password reset requested, but Brevo is not fully configured')
      throw new ServiceUnavailableException('Email service is not configured')
    }

    const safeName = this.escapeHtml(input.name || 'there')
    const safeUrl = this.escapeHtml(input.resetUrl)

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: input.email, ...(input.name ? { name: input.name } : {}) }],
        subject: 'Reset your Pikorua CRM password',
        tags: ['password-reset'],
        htmlContent: `
        <div style="background:#fef9f2;padding:32px;font-family:Arial,sans-serif;color:#431407">
          <div style="max-width:560px;margin:auto;background:#fff;border:1px solid #ded9d3;border-radius:16px;padding:32px">
            <p style="font-size:12px;letter-spacing:.18em;color:#c2410c;font-weight:700">PIKORUA REALTY CRM</p>
            <h1 style="font-size:24px;margin:20px 0 12px">Reset your password</h1>
            <p>Hello ${safeName},</p>
            <p>We received a request to reset your CRM password. This secure link expires in 30 minutes and works only once.</p>
            <p style="margin:28px 0"><a href="${safeUrl}" style="background:#c2410c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:700">Choose a new password</a></p>
            <p style="font-size:13px;color:#9a3412">If you did not request this, ignore this email. Your password will remain unchanged.</p>
          </div>
        </div>`,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const details = (await response.text()).slice(0, 500)
      this.logger.error(`Brevo rejected password reset email (${response.status}): ${details}`)
      throw new ServiceUnavailableException('Email service is temporarily unavailable')
    }
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    })[character]!)
  }
}
