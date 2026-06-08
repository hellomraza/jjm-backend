import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { MockMailProvider } from './providers/mock-mail.provider';
import { ResendMailProvider } from './providers/resend-mail.provider';

describe('MailService', () => {
  const mockSendMailMock = jest.fn();
  const resendSendMailMock = jest.fn();

  const mockProvider = {
    providerName: 'mock',
    sendMail: mockSendMailMock,
  } as unknown as MockMailProvider;

  const resendProvider = {
    providerName: 'resend',
    sendMail: resendSendMailMock,
  } as unknown as ResendMailProvider;

  const buildService = (
    mailProvider: string,
    fromAddress = 'onboarding@resend.dev',
    fromName = 'Jal Jeevan Mission',
  ) => {
    const configService = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'MAIL_PROVIDER') {
          return mailProvider;
        }
        if (key === 'MAIL_FROM_ADDRESS') {
          return fromAddress;
        }
        if (key === 'MAIL_FROM_NAME') {
          return fromName;
        }
        return fallback;
      }),
    } as unknown as ConfigService;

    return new MailService(configService, mockProvider, resendProvider);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses mock provider when MAIL_PROVIDER is mock', async () => {
    const service = buildService('mock');
    mockSendMailMock.mockResolvedValue({
      messageId: 'mock-1',
      provider: 'mock',
    });

    const result = await service.sendMail({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test Body',
    });

    expect(mockSendMailMock).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test Body',
      from: {
        address: 'onboarding@resend.dev',
        name: 'Jal Jeevan Mission',
      },
    });
    expect(resendSendMailMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('mock');
  });

  it('uses resend provider when MAIL_PROVIDER is resend', async () => {
    const service = buildService('resend');
    resendSendMailMock.mockResolvedValue({
      messageId: 'resend-1',
      provider: 'resend',
    });

    const result = await service.sendMail({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test Body',
      from: {
        address: 'custom@example.com',
        name: 'Custom Sender',
      },
    });

    expect(resendSendMailMock).toHaveBeenCalledWith({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test Body',
      from: {
        address: 'custom@example.com',
        name: 'Custom Sender',
      },
    });
    expect(mockSendMailMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('resend');
  });

  it('throws for unsupported provider value', async () => {
    const service = buildService('unknown-provider');

    await expect(
      service.sendMail({
        to: 'test@example.com',
        subject: 'Test Subject',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
