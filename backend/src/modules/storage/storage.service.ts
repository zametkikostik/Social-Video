import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl?: string;
  private readonly isR2: boolean;

  constructor(private config: ConfigService) {
    const r2AccountId = this.config.get<string>('R2_ACCOUNT_ID');
    const r2AccessKey = this.config.get<string>('R2_ACCESS_KEY_ID');
    const r2Secret = this.config.get<string>('R2_SECRET_ACCESS_KEY');

    this.isR2 = !!(r2AccountId && r2AccessKey && r2Secret);

    if (this.isR2) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2Secret,
        },
      });
      this.bucket = this.config.get<string>('R2_BUCKET_NAME') || 'social-video';
      this.publicUrl = this.config.get<string>('R2_PUBLIC_URL');
      this.logger.log('Using Cloudflare R2 storage');
    } else {
      this.client = new S3Client({
        region: this.config.get('S3_REGION') || 'us-east-1',
        endpoint: this.config.get('S3_ENDPOINT') || 'http://localhost:9000',
        forcePathStyle: true,
        credentials: {
          accessKeyId: this.config.get('S3_ACCESS_KEY') || 'minioadmin',
          secretAccessKey: this.config.get('S3_SECRET_KEY') || 'minioadmin',
        },
      });
      this.bucket = this.config.get('S3_BUCKET') || 'social-video';
      this.logger.log('Using local MinIO storage');
    }
  }

  async getUploadUrl(
    filename: string,
    contentType: string,
    folder = 'originals',
  ): Promise<{ uploadUrl: string; key: string }> {
    const ext = filename.split('.').pop() || 'mp4';
    const key = `${folder}/${randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: 3600,
    });

    return { uploadUrl, key };
  }

  async getPlaybackUrl(key: string, expiresIn = 3600 * 24): Promise<string> {
    if (this.publicUrl) {
      return `${this.publicUrl.replace(/\/$/, '')}/${key}`;
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  getBucket(): string {
    return this.bucket;
  }

  isUsingR2(): boolean {
    return this.isR2;
  }
}
