export type StorageProviderName = 'aws-s3' | 'cloudflare-r2' | 'mock';

export type UploadObjectInput = {
  objectKey: string;
  body: Buffer;
  contentType?: string;
};

export type UploadObjectResult = {
  objectKey: string;
  url: string;
  provider: StorageProviderName;
};

export interface UploadProvider {
  readonly providerName: StorageProviderName;
  uploadObject(input: UploadObjectInput): Promise<UploadObjectResult>;
}
