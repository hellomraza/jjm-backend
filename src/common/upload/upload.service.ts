import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AwsS3UploadProvider } from './providers/aws-s3-upload.provider';
import { CloudflareR2UploadProvider } from './providers/cloudflare-r2-upload.provider';
import { MockUploadProvider } from './providers/mock-upload.provider';
import {
  UploadObjectInput,
  UploadObjectResult,
  UploadProvider,
} from './upload.types';

@Injectable()
export class UploadService {
  constructor(
    private readonly configService: ConfigService,
    private readonly awsS3UploadProvider: AwsS3UploadProvider,
    private readonly cloudflareR2UploadProvider: CloudflareR2UploadProvider,
    private readonly mockUploadProvider: MockUploadProvider,
  ) {}

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    const provider = this.getActiveProvider();
    return provider.uploadObject(input);
  }

  private getActiveProvider(): UploadProvider {
    const providerName = this.configService.get<string>(
      'STORAGE_PROVIDER',
      'aws-s3',
    );

    if (providerName === 'aws-s3') {
      return this.awsS3UploadProvider;
    }

    if (providerName === 'cloudflare-r2') {
      return this.cloudflareR2UploadProvider;
    }

    if (providerName === 'mock') {
      return this.mockUploadProvider;
    }

    throw new InternalServerErrorException(
      `Unsupported STORAGE_PROVIDER value: ${providerName}`,
    );
  }
}
