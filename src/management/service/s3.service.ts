import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ForbiddenException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface UploadUrlParams {
  key: string;
  contentType: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly expiresInSeconds: number;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const s3Config = this.configService.get('s3');

    if (!s3Config?.bucket) {
      throw new Error('Missing S3 bucket configuration (S3_BUCKET)');
    }

    if (!s3Config?.region) {
      throw new Error('Missing S3 region configuration (S3_REGION)');
    }

    this.bucket = s3Config.bucket;
    this.expiresInSeconds = s3Config.expiresInSeconds || 900;
    this.publicBaseUrl =
      s3Config.publicBaseUrl || `https://${this.bucket}.s3.${s3Config.region}.amazonaws.com`;

    this.s3Client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint || undefined,
      forcePathStyle: s3Config.forcePathStyle || false,
      credentials:
        s3Config.accessKeyId && s3Config.secretAccessKey
          ? {
              accessKeyId: s3Config.accessKeyId,
              secretAccessKey: s3Config.secretAccessKey,
              sessionToken: s3Config.sessionToken || undefined,
            }
          : undefined,
    });
  }

  async createUploadUrl(params: UploadUrlParams) {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        ContentType: params.contentType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: this.expiresInSeconds,
      });

      return {
        uploadUrl,
        key: params.key,
        fileUrl: this.getPublicUrl(params.key),
      };
    } catch (error) {
      const err = error as Error & { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
      this.logger.error(`Failed to create upload URL for key ${params.key}`, err?.stack);

      if (this.isAccessDeniedError(err)) {
        throw new ForbiddenException(
          'S3 access denied: ensure the IAM user or role has s3:PutObject permission on this bucket',
        );
      }

      throw new InternalServerErrorException('Could not generate upload URL');
    }
  }

  async createReadUrl(key: string) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: this.expiresInSeconds,
      });
    } catch (error) {
      const err = error as Error & { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
      this.logger.error(`Failed to create read URL for key ${key}`, err?.stack);

      if (this.isAccessDeniedError(err)) {
        throw new ForbiddenException(
          'S3 access denied: ensure the IAM user or role has s3:GetObject permission on this bucket',
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
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: params.key,
        Body: params.file,
        ContentType: params.contentType,
      });

      await this.s3Client.send(command);

      return {
        key: params.key,
        fileUrl: this.getPublicUrl(params.key),
      };
    } catch (error) {
      const err = error as Error & { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } };
      this.logger.error(`Failed to upload file for key ${params.key}`, err?.stack);

      if (this.isAccessDeniedError(err)) {
        throw new ForbiddenException(
          'S3 access denied: ensure the IAM user or role has s3:PutObject permission on this bucket',
        );
      }

      throw new InternalServerErrorException('Could not upload file to AWS S3');
    }
  }

  private isAccessDeniedError(
    error: Error & { name?: string; Code?: string; code?: string; $metadata?: { httpStatusCode?: number } },
  ) {
    const message = `${error?.name ?? ''} ${error?.Code ?? ''} ${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();

    return (
      error?.$metadata?.httpStatusCode === 403 ||
      message.includes('accessdenied') ||
      message.includes('access denied')
    );
  }
}