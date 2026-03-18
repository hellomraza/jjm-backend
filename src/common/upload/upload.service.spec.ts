import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsS3UploadProvider } from './providers/aws-s3-upload.provider';
import { CloudflareR2UploadProvider } from './providers/cloudflare-r2-upload.provider';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  const awsUploadObjectMock = jest.fn();
  const cloudflareUploadObjectMock = jest.fn();

  const awsProvider = {
    providerName: 'aws-s3',
    uploadObject: awsUploadObjectMock,
  } as unknown as AwsS3UploadProvider;

  const cloudflareProvider = {
    providerName: 'cloudflare-r2',
    uploadObject: cloudflareUploadObjectMock,
  } as unknown as CloudflareR2UploadProvider;

  const buildService = (storageProvider: string) => {
    const configService = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'STORAGE_PROVIDER') {
          return storageProvider;
        }
        return fallback;
      }),
    } as unknown as ConfigService;

    return new UploadService(configService, awsProvider, cloudflareProvider);
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses aws provider when STORAGE_PROVIDER is aws-s3', async () => {
    const service = buildService('aws-s3');
    awsUploadObjectMock.mockResolvedValue({
      objectKey: 'k',
      url: 'https://aws/k',
      provider: 'aws-s3',
    });

    const result = await service.uploadObject({
      objectKey: 'k',
      body: Buffer.from('x'),
      contentType: 'image/jpeg',
    });

    expect(awsUploadObjectMock).toHaveBeenCalled();
    expect(cloudflareUploadObjectMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('aws-s3');
  });

  it('uses cloudflare provider when STORAGE_PROVIDER is cloudflare-r2', async () => {
    const service = buildService('cloudflare-r2');
    cloudflareUploadObjectMock.mockResolvedValue({
      objectKey: 'k',
      url: 'https://r2/k',
      provider: 'cloudflare-r2',
    });

    const result = await service.uploadObject({
      objectKey: 'k',
      body: Buffer.from('x'),
      contentType: 'image/jpeg',
    });

    expect(cloudflareUploadObjectMock).toHaveBeenCalled();
    expect(awsUploadObjectMock).not.toHaveBeenCalled();
    expect(result.provider).toBe('cloudflare-r2');
  });

  it('throws for unsupported provider value', async () => {
    const service = buildService('unknown-provider');

    await expect(
      service.uploadObject({
        objectKey: 'k',
        body: Buffer.from('x'),
      }),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
