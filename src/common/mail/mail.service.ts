import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockMailProvider } from './providers/mock-mail.provider';
import { ResendMailProvider } from './providers/resend-mail.provider';
import { MailProvider, MailProviderName, SendMailInput, SendMailResult } from './mail.types';

@Injectable()
export class MailService {
  private readonly defaultFromAddress: string;
  private readonly defaultFromName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly mockMailProvider: MockMailProvider,
    private readonly resendMailProvider: ResendMailProvider,
  ) {
    this.defaultFromAddress = this.configService.get<string>(
      'MAIL_FROM_ADDRESS',
      'onboarding@resend.dev',
    );
    this.defaultFromName = this.configService.get<string>(
      'MAIL_FROM_NAME',
      'Jal Jeevan Mission',
    );
  }

  /**
   * Sends an email using the active provider configured in the environment variables.
   */
  async sendMail(input: Omit<SendMailInput, 'from'> & { from?: SendMailInput['from'] }): Promise<SendMailResult> {
    const provider = this.getActiveProvider();

    const mailInput: SendMailInput = {
      ...input,
      from: input.from || {
        address: this.defaultFromAddress,
        name: this.defaultFromName,
      },
    };

    return provider.sendMail(mailInput);
  }

  /**
   * Returns the currently active mail provider based on the MAIL_PROVIDER env variable.
   */
  private getActiveProvider(): MailProvider {
    const providerName = this.configService.get<string>(
      'MAIL_PROVIDER',
      'mock',
    ) as MailProviderName;

    if (providerName === 'mock') {
      return this.mockMailProvider;
    }

    if (providerName === 'resend') {
      return this.resendMailProvider;
    }

    throw new InternalServerErrorException(
      `Unsupported MAIL_PROVIDER value: ${providerName}`,
    );
  }
}
