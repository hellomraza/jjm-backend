import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MailProvider, SendMailInput, SendMailResult } from '../mail.types';

@Injectable()
export class ResendMailProvider implements MailProvider {
  readonly providerName = 'resend' as const;
  private readonly logger = new Logger(ResendMailProvider.name);
  private readonly resend: Resend | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey && apiKey !== 're_your_api_key') {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn(
        'RESEND_API_KEY is not configured or is set to placeholder. ResendMailProvider will fail when sending emails.',
      );
    }
  }

  async sendMail(input: SendMailInput): Promise<SendMailResult> {
    if (!this.resend) {
      throw new InternalServerErrorException(
        'Resend provider is not configured. Please check RESEND_API_KEY in your environment variables.',
      );
    }

    const fromAddress = input.from
      ? input.from.name
        ? `${input.from.name} <${input.from.address}>`
        : input.from.address
      : undefined;

    if (!fromAddress) {
      throw new InternalServerErrorException(
        'Sender email address (from) is required.',
      );
    }

    try {
      const payload: any = {
        from: fromAddress,
        to: input.to,
        subject: input.subject,
      };

      if (input.html) {
        payload.html = input.html;
      }
      if (input.text) {
        payload.text = input.text;
      }
      // Resend requires at least html, text, or react
      if (!input.html && !input.text) {
        payload.text = '';
      }

      if (input.cc) {
        payload.cc = input.cc;
      }
      if (input.bcc) {
        payload.bcc = input.bcc;
      }
      if (input.replyTo) {
        payload.replyTo = input.replyTo;
      }
      if (input.attachments?.length) {
        payload.attachments = input.attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
        }));
      }

      const response = await this.resend.emails.send(payload);

      if (response.error) {
        this.logger.error(
          `Failed to send email via Resend: ${response.error.message}`,
          response.error,
        );
        throw new InternalServerErrorException(
          `Resend mail delivery failed: ${response.error.message}`,
        );
      }

      const messageId = response.data?.id || '';

      return {
        messageId,
        provider: this.providerName,
      };
    } catch (error: any) {
      this.logger.error(
        `Error occurred while sending email via Resend: ${error.message}`,
        error.stack,
      );
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Resend mail delivery error: ${error.message}`,
      );
    }
  }
}
