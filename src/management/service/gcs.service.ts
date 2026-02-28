import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

interface UploadUrlParams {
  key: string;
  contentType: string;
}

@Injectable()
export class GcsService {
  private readonly logger = new Logger(GcsService.name);
  private readonly storage: Storage;
  private readonly bucket: string;
  private readonly expiresInSeconds: number;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const gcsConfig = this.configService.get('gcs');

    if (!gcsConfig?.bucket) {
      throw new Error('Missing GCS bucket configuration (GCS_BUCKET)');
    }

    this.bucket = gcsConfig.bucket;
    this.expiresInSeconds = gcsConfig.expiresInSeconds || 900;
    this.publicBaseUrl = gcsConfig.publicBaseUrl || `https://storage.googleapis.com/${this.bucket}`;

    const privateKey = this.normalizePrivateKey(gcsConfig.privateKey);

    if (gcsConfig.clientEmail && gcsConfig.privateKey && !privateKey) {
      throw new Error(
        'Invalid GCS_PRIVATE_KEY format. Use service-account private_key (PEM), not private_key_id.',
      );
    }

    const credentials = gcsConfig.clientEmail && privateKey
      ? {
          client_email: gcsConfig.clientEmail,
          private_key: privateKey,
        }
      : undefined;

    this.storage = new Storage({
      projectId: gcsConfig.projectId || undefined,
      keyFilename: gcsConfig.keyFilename || undefined,
      credentials,
    });
  }

  private normalizePrivateKey(rawPrivateKey?: string): string | undefined {
    if (!rawPrivateKey) {
      return undefined;
    }

    const normalized = String(rawPrivateKey).trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');

    if (!normalized.includes('BEGIN PRIVATE KEY') || !normalized.includes('END PRIVATE KEY')) {
      return undefined;
    }

    return normalized;
  }

  async createUploadUrl(params: UploadUrlParams) {
    try {
      const file = this.storage.bucket(this.bucket).file(params.key);
      const [uploadUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + this.expiresInSeconds * 1000,
        contentType: params.contentType,
      });

      return {
        uploadUrl,
        key: params.key,
        fileUrl: this.getPublicUrl(params.key),
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create upload URL for key ${params.key}`, err?.stack);
      if (err?.message?.includes('Could not load the default credentials')) {
        throw new InternalServerErrorException(
          'GCS credentials are missing. Set GCS_KEY_FILE or provide GCS_CLIENT_EMAIL and GCS_PRIVATE_KEY.',
        );
      }
      throw new InternalServerErrorException('Could not generate upload URL');
    }
  }

  async createReadUrl(key: string) {
    try {
      const file = this.storage.bucket(this.bucket).file(key);
      const [readUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + this.expiresInSeconds * 1000,
      });

      return readUrl;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create read URL for key ${key}`, err?.stack);
      if (err?.message?.includes('Could not load the default credentials')) {
        throw new InternalServerErrorException(
          'GCS credentials are missing. Set GCS_KEY_FILE or provide GCS_CLIENT_EMAIL and GCS_PRIVATE_KEY.',
        );
      }
      throw new InternalServerErrorException('Could not generate read URL');
    }
  }

  getPublicUrl(key: string) {
    return `${this.publicBaseUrl}/${key}`;
  }

  async uploadFile(params: { key: string; file: Buffer; contentType: string }): Promise<{ key: string; fileUrl: string }> {
    try {
      const targetFile = this.storage.bucket(this.bucket).file(params.key);
      await targetFile.save(params.file, {
        contentType: params.contentType,
        resumable: false,
      });

      return {
        key: params.key,
        fileUrl: this.getPublicUrl(params.key),
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to upload file for key ${params.key}`, err?.stack);
      if (err?.message?.includes('Could not load the default credentials')) {
        throw new InternalServerErrorException(
          'GCS credentials are missing. Set GCS_KEY_FILE or provide GCS_CLIENT_EMAIL and GCS_PRIVATE_KEY.',
        );
      }
      throw new InternalServerErrorException('Could not upload file to Google Cloud Storage');
    }
  }
}