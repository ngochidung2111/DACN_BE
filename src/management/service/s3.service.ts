import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface UploadUrlParams {
  key: string;
  contentType: string;
}

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly expiresInSeconds: number;
  private readonly publicBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const s3Config = this.configService.get('s3');

    if (!s3Config?.bucket) {
      throw new Error('Missing S3 bucket configuration (S3_BUCKET)');
    }

    this.bucket = s3Config.bucket;
    this.expiresInSeconds = s3Config.expiresInSeconds || 900;
    this.publicBaseUrl =
      s3Config.publicBaseUrl || `https://${this.bucket}.s3.${s3Config.region}.amazonaws.com`;

    this.client = new S3Client({
      region: s3Config.region,
      credentials:
        s3Config.accessKeyId && s3Config.secretAccessKey
          ? {
              accessKeyId: s3Config.accessKeyId,
              secretAccessKey: s3Config.secretAccessKey,
            }
          : undefined,
    });
  }

  async createUploadUrl(params: UploadUrlParams) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      ContentType: params.contentType,
    });

    try {
      const uploadUrl = await getSignedUrl(this.client, command, {
        expiresIn: this.expiresInSeconds,
      });

      return {
        uploadUrl,
        key: params.key,
        fileUrl: this.getPublicUrl(params.key),
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create upload URL for key ${params.key}`, err?.stack);
      throw new InternalServerErrorException('Could not generate upload URL');
    }
  }

  async createReadUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      return await getSignedUrl(this.client, command, {
        expiresIn: this.expiresInSeconds,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create read URL for key ${key}`, err?.stack);
      throw new InternalServerErrorException('Could not generate read URL');
    }
  }

  getPublicUrl(key: string) {
    return `${this.publicBaseUrl}/${key}`;
  }

  async uploadFile(params: {
    key: string;
    file: Buffer;
    contentType: string;
  }): Promise<{ key: string; fileUrl: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: params.key,
      Body: params.file,
      ContentType: params.contentType,
    });

    try {
      await this.client.send(command);
      
      return {
        key: params.key,
        fileUrl: this.getPublicUrl(params.key),
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to upload file for key ${params.key}`, err?.stack);
      throw new InternalServerErrorException('Could not upload file to S3');
    }
  }
}
