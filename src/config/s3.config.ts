import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  region: process.env.S3_REGION || 'ap-southeast-1',
  bucket: process.env.S3_BUCKET || '',
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  expiresInSeconds: parseInt(process.env.S3_PRESIGN_EXPIRES || '900', 10),
  publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
}));
