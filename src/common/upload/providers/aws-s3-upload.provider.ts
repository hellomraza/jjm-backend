import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadObjectInput,
  UploadObjectResult,
  UploadProvider,
} from '../upload.types';

@Injectable()
export class AwsS3UploadProvider implements UploadProvider {
  readonly providerName = 'aws-s3' as const;

  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.get<string>('AWS_REGION', 'ap-south-1');
    this.bucketName = this.configService.get<string>('AWS_S3_BUCKET', '');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get<string>(
          'AWS_SECRET_ACCESS_KEY',
          '',
        ),
      },
    });
  }

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    if (!this.bucketName) {
      throw new InternalServerErrorException('AWS_S3_BUCKET is not configured');
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: input.objectKey,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return {
      objectKey: input.objectKey,
      url: `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${input.objectKey}`,
      provider: this.providerName,
    };
  }
}
