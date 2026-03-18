import { Injectable } from '@nestjs/common';
import {
  UploadObjectInput,
  UploadObjectResult,
  UploadProvider,
} from '../upload.types';

@Injectable()
export class MockUploadProvider implements UploadProvider {
  readonly providerName = 'mock' as const;

  private readonly candidateImageUrls = [
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80',
  ];

  async uploadObject(input: UploadObjectInput): Promise<UploadObjectResult> {
    const randomIndex = Math.floor(
      Math.random() * this.candidateImageUrls.length,
    );

    return {
      objectKey: input.objectKey,
      url: this.candidateImageUrls[randomIndex],
      provider: this.providerName,
    };
  }
}
