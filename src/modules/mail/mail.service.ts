import { Injectable, Logger } from '@nestjs/common';
import { ResendService } from 'nestjs-resend';
import { ConfigService } from '@nestjs/config';
import { viewsEmailTemplate } from './tamplate/tamplate';

@Injectable()
export class MailService {
  private domain: string;
  private readonly logger = new Logger(MailService.name);
  private readonly FROM_EMAIL =
    'School Education <noreply@schoolse4group14.space>';

  constructor(
    private readonly resendService: ResendService,
    private readonly configService: ConfigService,
  ) {
    this.domain = this.configService.get<string>('APP_URL');
  }

  async sendMailTwoFactorToken(email: string, token: string) {
    return this.resendService.send({
      from: 'edu <schoolse4group14.space>',
      to: email,
      subject: '2FA Code',
      html: `<p>Your 2FA code: ${token}</p>`,
    });
  }

  async sendMailPasswordReset(email: string, token: string, date: number) {
    const resetLink = `${this.domain}/auth/new-password?token=${token}`;
    return this.resendService.send({
      from: 'edu <schoolse4group14.space>',
      to: email,
      subject: 'Reset Password',
      html: viewsEmailTemplate({
        url: resetLink,
        titleEmail: 'Reset Password',
      }),
    });
  }

  async sendMailVerification(email: string, token: string, code: string) {
    try {
      const confirmLink = `${this.domain}/auth/confirm-email?token=${token}`;

      const result = await this.resendService.send({
        from: this.FROM_EMAIL,
        to: email,
        subject: 'Welcome to SMS - Verify Your Email',
        html: viewsEmailTemplate({
          url: confirmLink,
          titleEmail: 'Verify Your Email Address',
          code,
        }),
      });

      this.logger.log(`Verification email sent to ${email}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to send verification email to ${email}:`,
        error,
      );
      throw error;
    }
  }
}