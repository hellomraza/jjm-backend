export type MailProviderName = 'resend' | 'mock';

export interface SendMailInput {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: {
    address: string;
    name?: string;
  };
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendMailResult {
  messageId: string;
  provider: MailProviderName;
}

export interface MailProvider {
  readonly providerName: MailProviderName;
  sendMail(input: SendMailInput): Promise<SendMailResult>;
}
