import { Module } from '@nestjs/common';
import { AwsS3UploadProvider } from './providers/aws-s3-upload.provider';
import { CloudflareR2UploadProvider } from './providers/cloudflare-r2-upload.provider';
import { UploadService } from './upload.service';

@Module({
  providers: [AwsS3UploadProvider, CloudflareR2UploadProvider, UploadService],
  exports: [UploadService],
})
export class UploadModule {}
