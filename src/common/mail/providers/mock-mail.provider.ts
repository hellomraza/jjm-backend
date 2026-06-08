import { Injectable, Logger } from '@nestjs/common';
import { MailProvider, SendMailInput, SendMailResult } from '../mail.types';

@Injectable()
export class MockMailProvider implements MailProvider {
  readonly providerName = 'mock' as const;
  private readonly logger = new Logger(MockMailProvider.name);

  async sendMail(input: SendMailInput): Promise<SendMailResult> {
    const formattedFrom = input.from
      ? `${input.from.name ? `"${input.from.name}" ` : ''}<${input.from.address}>`
      : 'Default Sender';

    this.logger.log('--- Mock Mail Provider Sent Email ---');
    this.logger.log(`From:    ${formattedFrom}`);
    this.logger.log(`To:      ${JSON.stringify(input.to)}`);
    if (input.cc) this.logger.log(`Cc:      ${JSON.stringify(input.cc)}`);
    if (input.bcc) this.logger.log(`Bcc:     ${JSON.stringify(input.bcc)}`);
    this.logger.log(`Subject: ${input.subject}`);
    if (input.text) this.logger.log(`Text:\n${input.text}`);
    if (input.html) this.logger.log(`HTML:\n${input.html}`);
    if (input.attachments?.length) {
      this.logger.log(
        `Attachments: ${input.attachments.map((a) => a.filename).join(', ')}`,
      );
    }
    this.logger.log('-------------------------------------');

    return {
      messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      provider: this.providerName,
    };
  }
}
