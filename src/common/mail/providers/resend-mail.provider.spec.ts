import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { ResendMailProvider } from './resend-mail.provider';

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => {
      return {
        emails: {
          send: jest.fn(),
        },
      };
    }),
  };
});

describe('ResendMailProvider', () => {
  let mockResendInstance: any;

  const buildProvider = (apiKey: string | undefined) => {
    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'RESEND_API_KEY') {
          return apiKey;
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    const provider = new ResendMailProvider(configService);
    // Grab the mocked instance of Resend instantiated inside the constructor
    mockResendInstance = (provider as any).resend;
    return provider;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws InternalServerErrorException if Resend is not configured', async () => {
    const provider = buildProvider(undefined);

    await expect(
      provider.sendMail({
        to: 'to@example.com',
        subject: 'Test',
        text: 'Hello',
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });

  it('sends email successfully when api key is provided', async () => {
    const provider = buildProvider('re_123456789');
    
    mockResendInstance.emails.send.mockResolvedValue({
      data: { id: 'resend-msg-id-123' },
      error: null,
    });

    const result = await provider.sendMail({
      to: 'to@example.com',
      subject: 'Test Subject',
      text: 'Hello World',
      from: {
        address: 'onboarding@resend.dev',
        name: 'JJM Team',
      },
    });

    expect(mockResendInstance.emails.send).toHaveBeenCalledWith({
      from: 'JJM Team <onboarding@resend.dev>',
      to: 'to@example.com',
      subject: 'Test Subject',
      text: 'Hello World',
      html: undefined,
      cc: undefined,
      bcc: undefined,
      replyTo: undefined,
      attachments: undefined,
    });

    expect(result).toEqual({
      messageId: 'resend-msg-id-123',
      provider: 'resend',
    });
  });

  it('throws InternalServerErrorException when Resend SDK returns an error', async () => {
    const provider = buildProvider('re_123456789');

    mockResendInstance.emails.send.mockResolvedValue({
      data: null,
      error: { message: 'Invalid API Key', name: 'validation_error' },
    });

    await expect(
      provider.sendMail({
        to: 'to@example.com',
        subject: 'Test Subject',
        text: 'Hello World',
        from: {
          address: 'onboarding@resend.dev',
        },
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
