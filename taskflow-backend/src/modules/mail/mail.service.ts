import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface SendUserCredentialsParams {
  to: string;
  fullName: string;
  loginId: string;
  temporaryPassword: string;
}

interface SendPasswordResetLinkParams {
  to: string;
  fullName: string;
  resetUrl: string;
  expiresAt: Date;
}

interface SendPasswordResetOtpParams {
  to: string;
  fullName: string;
  otp: string;
  expiresAt: Date;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  private readonly transporter: nodemailer.Transporter | null;

  private readonly fromEmail: string;

  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    const smtpHost = this.configService.get<string>('SMTP_HOST');

    const smtpPort = Number(
      this.configService.get<string>('SMTP_PORT') || '587',
    );

    const smtpUser = this.configService.get<string>('SMTP_USER');

    const smtpPassword = this.configService.get<string>('SMTP_PASS');

    this.fromEmail = this.configService.get<string>('MAIL_FROM_EMAIL') || '';

    this.fromName =
      this.configService.get<string>('MAIL_FROM_NAME') || 'TaskFlow';

    if (!smtpHost || !smtpUser || !smtpPassword || !this.fromEmail) {
      this.transporter = null;

      this.logger.warn(
        'SMTP configuration is incomplete. Emails will not be sent.',
      );

      return;
    }

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,

      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });
  }

  async onModuleInit() {
    if (!this.transporter) {
      return;
    }

    try {
      await Promise.race([
        this.transporter.verify(),
        new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error('SMTP verification timed out')),
            5000,
          );
        }),
      ]);

      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown SMTP error';

      this.logger.error(`SMTP connection verification failed: ${message}`);
    }
  }

  async sendUserCredentials({
    to,
    fullName,
    loginId,
    temporaryPassword,
  }: SendUserCredentialsParams) {
    if (!this.transporter) {
      throw new Error('SMTP configuration is incomplete');
    }

    const safeFullName = this.escapeHtml(fullName);
    const safeLoginId = this.escapeHtml(loginId);

    const safePassword = this.escapeHtml(temporaryPassword);

    await this.transporter.sendMail({
      from: {
        name: this.fromName,
        address: this.fromEmail,
      },

      to,

      subject: 'Your TaskFlow account has been created',

      text: [
        `Hello ${fullName},`,
        '',
        'Your TaskFlow account has been created successfully.',
        '',
        `Login ID: ${loginId}`,
        `Temporary Password: ${temporaryPassword}`,
        '',
        'Please log in and change your password.',
        '',
        'Regards,',
        'TaskFlow Team',
      ].join('\n'),

      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />

            <title>TaskFlow Account Credentials</title>
          </head>

          <body
            style="
              margin: 0;
              padding: 24px;
              background-color: #f1f5f9;
              font-family: Arial, sans-serif;
              color: #0f172a;
            "
          >
            <div
              style="
                max-width: 600px;
                margin: 0 auto;
                overflow: hidden;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                background-color: #ffffff;
              "
            >
              <div
                style="
                  padding: 24px;
                  background-color: #059669;
                  color: #ffffff;
                "
              >
                <h1
                  style="
                    margin: 0;
                    font-size: 24px;
                  "
                >
                  Welcome to TaskFlow
                </h1>
              </div>

              <div style="padding: 28px 24px;">
                <p
                  style="
                    margin-top: 0;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Hello <strong>${safeFullName}</strong>,
                </p>

                <p
                  style="
                    font-size: 15px;
                    line-height: 1.6;
                    color: #475569;
                  "
                >
                  Your TaskFlow account has been created
                  successfully. Use the credentials below
                  to log in.
                </p>

                <div
                  style="
                    margin: 24px 0;
                    padding: 20px;
                    border: 1px solid #d1fae5;
                    border-radius: 12px;
                    background-color: #ecfdf5;
                  "
                >
                  <p
                    style="
                      margin: 0 0 12px;
                      font-size: 14px;
                      color: #475569;
                    "
                  >
                    Login ID
                  </p>

                  <p
                    style="
                      margin: 0 0 20px;
                      font-size: 17px;
                      font-weight: 700;
                      color: #065f46;
                      word-break: break-all;
                    "
                  >
                    ${safeLoginId}
                  </p>

                  <p
                    style="
                      margin: 0 0 12px;
                      font-size: 14px;
                      color: #475569;
                    "
                  >
                    Temporary Password
                  </p>

                  <p
                    style="
                      margin: 0;
                      font-size: 17px;
                      font-weight: 700;
                      color: #065f46;
                      word-break: break-all;
                    "
                  >
                    ${safePassword}
                  </p>
                </div>

                <p
                  style="
                    font-size: 14px;
                    line-height: 1.6;
                    color: #64748b;
                  "
                >
                  For security, please change your password
                  after logging in.
                </p>

                <p
                  style="
                    margin-bottom: 0;
                    font-size: 15px;
                    line-height: 1.6;
                  "
                >
                  Regards,<br />
                  <strong>TaskFlow Team</strong>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    this.logger.log('User credentials email sent successfully');
  }

  async sendPasswordResetLink({
    to,
    fullName,
    resetUrl,
    expiresAt,
  }: SendPasswordResetLinkParams) {
    if (!this.transporter) {
      throw new Error('SMTP configuration is incomplete');
    }

    const safeFullName = this.escapeHtml(fullName);
    const safeResetUrl = this.escapeHtml(resetUrl);
    const expiryText = expiresAt.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

    await this.transporter.sendMail({
      from: {
        name: this.fromName,
        address: this.fromEmail,
      },

      to,

      subject: 'Reset your TaskFlow password',

      text: [
        `Hello ${fullName},`,
        '',
        'We received a request to reset your TaskFlow password.',
        `Reset link: ${resetUrl}`,
        `This link expires at ${expiryText}.`,
        '',
        'If you did not request this, you can ignore this email.',
        '',
        'Regards,',
        'TaskFlow Team',
      ].join('\n'),

      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />

            <title>Reset TaskFlow Password</title>
          </head>

          <body
            style="
              margin: 0;
              padding: 24px;
              background-color: #f1f5f9;
              font-family: Arial, sans-serif;
              color: #0f172a;
            "
          >
            <div
              style="
                max-width: 600px;
                margin: 0 auto;
                overflow: hidden;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                background-color: #ffffff;
              "
            >
              <div
                style="
                  padding: 24px;
                  background-color: #059669;
                  color: #ffffff;
                "
              >
                <h1 style="margin: 0; font-size: 24px;">
                  Reset your password
                </h1>
              </div>

              <div style="padding: 28px 24px;">
                <p
                  style="
                    margin-top: 0;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  Hello <strong>${safeFullName}</strong>,
                </p>

                <p
                  style="
                    font-size: 15px;
                    line-height: 1.6;
                    color: #475569;
                  "
                >
                  We received a request to reset your TaskFlow password.
                  Use the button below to create a new password.
                </p>

                <p style="margin: 28px 0;">
                  <a
                    href="${safeResetUrl}"
                    style="
                      display: inline-block;
                      border-radius: 12px;
                      background-color: #059669;
                      padding: 14px 22px;
                      color: #ffffff;
                      font-size: 15px;
                      font-weight: 700;
                      text-decoration: none;
                    "
                  >
                    Reset Password
                  </a>
                </p>

                <p
                  style="
                    font-size: 14px;
                    line-height: 1.6;
                    color: #64748b;
                  "
                >
                  This link expires at ${this.escapeHtml(expiryText)}.
                  If you did not request this, you can ignore this email.
                </p>

                <p
                  style="
                    font-size: 13px;
                    line-height: 1.6;
                    color: #94a3b8;
                    word-break: break-all;
                  "
                >
                  ${safeResetUrl}
                </p>

                <p
                  style="
                    margin-bottom: 0;
                    font-size: 15px;
                    line-height: 1.6;
                  "
                >
                  Regards,<br />
                  <strong>TaskFlow Team</strong>
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    this.logger.log('Password reset email sent successfully');
  }

  async sendPasswordResetOtp({
    to,
    fullName,
    otp,
    expiresAt,
  }: SendPasswordResetOtpParams) {
    if (!this.transporter) {
      throw new Error('SMTP configuration is incomplete');
    }

    const safeFullName = this.escapeHtml(fullName);
    const safeOtp = this.escapeHtml(otp);
    const expiryText = expiresAt.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });

    await this.transporter.sendMail({
      from: {
        name: this.fromName,
        address: this.fromEmail,
      },
      to,
      subject: 'Your TaskFlow password reset OTP',
      text: [
        `Hello ${fullName},`,
        '',
        'Use this OTP to verify your password reset request.',
        `OTP: ${otp}`,
        `This OTP expires at ${expiryText}.`,
        '',
        'If you did not request this, you can ignore this email.',
        '',
        'Regards,',
        'TaskFlow Team',
      ].join('\n'),
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>TaskFlow Reset OTP</title>
          </head>
          <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: Arial, sans-serif; color: #0f172a;">
            <div style="max-width: 600px; margin: 0 auto; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
              <div style="padding: 24px; background-color: #059669; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px;">Password reset OTP</h1>
              </div>
              <div style="padding: 28px 24px;">
                <p style="margin-top: 0; font-size: 16px; line-height: 1.6;">Hello <strong>${safeFullName}</strong>,</p>
                <p style="font-size: 15px; line-height: 1.6; color: #475569;">Use the OTP below to verify your TaskFlow password reset request.</p>
                <div style="margin: 24px 0; padding: 20px; border: 1px solid #d1fae5; border-radius: 12px; background-color: #ecfdf5; text-align: center;">
                  <p style="margin: 0; font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #065f46;">${safeOtp}</p>
                </div>
                <p style="font-size: 14px; line-height: 1.6; color: #64748b;">This OTP expires at ${this.escapeHtml(expiryText)}. If you did not request this, you can ignore this email.</p>
                <p style="margin-bottom: 0; font-size: 15px; line-height: 1.6;">Regards,<br /><strong>TaskFlow Team</strong></p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    this.logger.log('Password reset OTP email sent successfully');
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };

      return entities[character];
    });
  }
}
