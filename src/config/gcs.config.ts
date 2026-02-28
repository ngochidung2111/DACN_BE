import { registerAs } from '@nestjs/config';

export default registerAs('gcs', () => ({
  projectId: process.env.GCS_PROJECT_ID?.trim() || '',
  bucket: process.env.GCS_BUCKET?.trim() || '',
  keyFilename: process.env.GCS_KEY_FILE?.trim(),
  clientEmail: process.env.GCS_CLIENT_EMAIL?.trim(),
  privateKey: process.env.GCS_PRIVATE_KEY,
  expiresInSeconds: parseInt(process.env.GCS_PRESIGN_EXPIRES || '900', 10),
  publicBaseUrl: process.env.GCS_PUBLIC_BASE_URL?.trim(),
}));