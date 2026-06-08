import { MockMailProvider } from './mock-mail.provider';

describe('MockMailProvider', () => {
  let provider: MockMailProvider;

  beforeEach(() => {
    provider = new MockMailProvider();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('should simulate sending an email and return a message ID', async () => {
    const input = {
      to: 'recipient@example.com',
      subject: 'Hello Mock',
      text: 'Mock body text',
      from: {
        address: 'onboarding@resend.dev',
        name: 'Test Sender',
      },
    };

    const result = await provider.sendMail(input);

    expect(result).toBeDefined();
    expect(result.provider).toBe('mock');
    expect(result.messageId).toMatch(/^mock-msg-/);
  });
});
