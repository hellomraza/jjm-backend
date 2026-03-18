import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadObjectInput,
  UploadObjectResult,
  UploadProvider,
} from '../upload.types';

@Injectable()
export class CloudflareR2UploadProvider implements UploadProvider {
  readonly providerName = 'cloudflare-r2' as const;

  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.get<string>(
      'CLOUDFLARE_R2_BUCKET',
      '',
    );
    this.endpoint = this.configService.get<string>(
      'CLOUDFLARE_R2_ENDPOINT',
      '',
    );
    this.publicBaseUrl = this.configService.get<string>(
      'CLOUDFLARE_R2_PUBLIC_BASE_URL',
      '',
    );

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.endpoint || undefined,
      credentials: {
        accessKeyId: this.configService.get<string>(
          'CLOUDFLARE_R2_ACCESS_KEY_ID',
          '',
        ),
        secretAccessKey: this.configService.get<string>(
          'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    if (!this.bucketName) {
      throw new InternalServerErrorException(
        'CLOUDFLARE_R2_BUCKET is not configured',
      );
    }

    if (!this.endpoint) {
      throw new InternalServerErrorException(
        'CLOUDFLARE_R2_ENDPOINT is not configured',
      );
    }

    if (!this.publicBaseUrl) {
      throw new InternalServerErrorException(
        'CLOUDFLARE_R2_PUBLIC_BASE_URL is not configured',
      );
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    const normalizedBaseUrl = this.publicBaseUrl.replace(/\/+$/, '');

    return {
      objectKey: input.objectKey,
      url: `${normalizedBaseUrl}/${input.objectKey}`,
      provider: this.providerName,
    };
  }
}
