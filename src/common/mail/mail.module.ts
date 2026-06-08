import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MockMailProvider } from './providers/mock-mail.provider';
import { ResendMailProvider } from './providers/resend-mail.provider';

@Module({
  providers: [
    MockMailProvider,
    ResendMailProvider,
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
