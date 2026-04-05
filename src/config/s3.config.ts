import { registerAs } from '@nestjs/config';

const parseBool = (value?: string) => {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
};

export default registerAs('s3', () => ({
  region: process.env.S3_REGION?.trim() || '',
  bucket: process.env.S3_BUCKET?.trim() || '',
  accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim(),
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim(),
  sessionToken: process.env.S3_SESSION_TOKEN?.trim(),
  endpoint: process.env.S3_ENDPOINT?.trim(),
  forcePathStyle: parseBool(process.env.S3_FORCE_PATH_STYLE),
  expiresInSeconds: parseInt(process.env.S3_PRESIGN_EXPIRES || '900', 10),
  publicBaseUrl: process.env.S3_PUBLIC_BASE_URL?.trim(),
}));